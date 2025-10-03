#!/usr/bin/env node
import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SimpleSage } from './services/simpleSage.js';

// --------------------
// Supabase Setup
// --------------------
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

// --------------------
// Authentication Middleware
// --------------------
async function authenticateUser(token: string) {
  // Check if token is the service key (for n8n and other services)
  if (token === supabaseServiceKey) {
    return {
      email: 'n8n-service',
      farmId: 'system',
      role: 'service',
    };
  }

  // Otherwise, verify it as a user JWT token
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    throw new Error('Invalid authentication token');
  }

  return {
    email: data.user.email,
    userId: data.user.id,
    role: 'user',
  };
}

// Middleware to extract and validate Bearer token
async function authMiddleware(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const user = await authenticateUser(token);
    (req as any).user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
    return;
  }
}

// --------------------
// Express Setup
// --------------------
const app = express();
app.use(cors());
app.use(express.json());

// --------------------
// MCP Server + Tools
// --------------------
const mcpServer = new Server(
  { name: 'sage-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Store active SSE transports by session ID so POST handlers can route messages
const sseTransports: Record<string, SSEServerTransport> = {};

// List available tools
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_towers',
        description: 'Get tower information',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_seed_inventory',
        description: 'Get seed inventory',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_farm_stats',
        description: 'Get quick statistics about the farm',
        inputSchema: { type: 'object', properties: {} },
      },
    ],
  };
});

// Handle tool calls
mcpServer.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name } = req.params;

  switch (name) {
    case 'get_towers': {
      const { data, error } = await supabaseAdmin.from('towers').select('*');
      if (error) throw error;
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'get_seed_inventory': {
      const { data, error } = await supabaseAdmin.from('seeds').select('*');
      if (error) throw error;
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'get_farm_stats': {
      const { count: towerCount } = await supabaseAdmin
        .from('towers')
        .select('*', { count: 'exact', head: true });
      const { count: seedCount } = await supabaseAdmin
        .from('seeds')
        .select('*', { count: 'exact', head: true });
      return {
        content: [
          {
            type: 'text',
            text: `Farm Stats:\n- Towers: ${towerCount}\n- Seeds: ${seedCount}`,
          },
        ],
      };
    }
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
  }
});

// --------------------
// MCP SSE Transport
// --------------------
app.get('/mcp', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const transport = new SSEServerTransport('/mcp/messages', res);
    const sessionId = transport.sessionId;
    sseTransports[sessionId] = transport;

    transport.onclose = () => {
      delete sseTransports[sessionId];
    };

    await mcpServer.connect(transport);
  } catch (error) {
    console.error('Error establishing MCP SSE connection:', error);
    if (!res.headersSent) {
      res.status(500).send('Failed to establish MCP SSE connection');
    }
  }
});

app.post('/mcp/messages', authMiddleware, async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string | undefined;
  if (!sessionId) {
    res.status(400).json({ error: 'Missing sessionId' });
    return;
  }

  const transport = sseTransports[sessionId];
  if (!transport) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error(`Error handling MCP message for session ${sessionId}:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to handle MCP message' });
    }
  }
});

// --------------------
// REST Endpoint: /api/sage/chat (Direct MCP Processing)
// --------------------
const sage = new SimpleSage();

app.post('/api/sage/chat', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { message, farmId, sessionId, farmName = 'your farm' } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Helper function to call MCP tools with farmId filtering
    const getMCPData = async (toolName: string, params?: any) => {
      switch (toolName) {
        case 'get_farm_stats': {
          let towerQuery = supabaseAdmin.from('towers').select('*', { count: 'exact', head: true });
          let seedQuery = supabaseAdmin.from('seed_inventory').select('*', { count: 'exact', head: true });

          if (farmId) {
            towerQuery = towerQuery.eq('farm_id', farmId);
            seedQuery = seedQuery.eq('farm_id', farmId);
          }

          const { count: towerCount } = await towerQuery;
          const { count: seedCount } = await seedQuery;
          return `Farm Stats:\n- Towers: ${towerCount || 0}\n- Seeds: ${seedCount || 0}`;
        }
        case 'get_towers': {
          let query = supabaseAdmin.from('towers').select('*');
          if (farmId) query = query.eq('farm_id', farmId);

          const { data, error } = await query;
          if (error) throw error;
          return JSON.stringify(data, null, 2);
        }
        case 'get_seed_inventory': {
          let query = supabaseAdmin.from('seed_inventory').select('*');
          if (farmId) query = query.eq('farm_id', farmId);

          const { data, error } = await query;
          if (error) throw error;
          return JSON.stringify(data, null, 2);
        }
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    };

    // Process message through SimpleSage
    const response = await sage.processMessage(
      message,
      { farmName },
      getMCPData
    );

    res.json({
      response,
      sessionId: sessionId || 'default',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error processing chat:', err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Start Server
// --------------------
const PORT = Number.parseInt(process.env.PORT ?? '', 10) || 3010;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`? Sage REST endpoint available at http://localhost:${PORT}/api/sage/chat`);
  console.log(`? MCP SSE transport available at http://localhost:${PORT}/mcp (POST to /mcp/messages)`);
});