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
      {
        name: 'get_nutrient_issues',
        description: 'Get nutrient-related issues including pH and EC problems. Use this when asked about pH levels, EC readings, or nutrient imbalances.',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['open', 'resolved', 'monitoring'] },
            limit: { type: 'number' }
          }
        },
      },
      {
        name: 'get_water_issues',
        description: 'Get water quality issues. Use this when asked about water quality, water problems, or reservoir issues.',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['open', 'resolved', 'monitoring'] },
            limit: { type: 'number' }
          }
        },
      },
      {
        name: 'get_plant_batches',
        description: 'Get planting records and plant batches. Use this for questions about what\'s planted, planting dates, or crop varieties.',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['seeding', 'germinating', 'growing', 'ready_harvest', 'harvested'] },
            limit: { type: 'number' }
          }
        },
      },
      {
        name: 'get_spray_logs',
        description: 'Get core spray application logs. Use this for questions about sprays applied or spray schedules. CORE spray only, NOT IPM module.',
        inputSchema: {
          type: 'object',
          properties: {
            sprayType: { type: 'string', enum: ['pesticide', 'fungicide', 'nutrient', 'other'] },
            limit: { type: 'number' }
          }
        },
      },
      {
        name: 'get_seed_inventory',
        description: 'Get seed inventory and stock levels. Use this for questions about available seeds, seed quantities, low stock alerts, or seed varieties.',
        inputSchema: {
          type: 'object',
          properties: {
            lowStock: { type: 'boolean' },
            cropId: { type: 'string' }
          }
        },
      },
      {
        name: 'get_seeding_plans',
        description: 'Get seeding schedule and plans. Use this for questions about upcoming seeding activities, what to seed next, or seeding dates.',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            limit: { type: 'number' }
          }
        },
      },
      {
        name: 'get_spacing_plans',
        description: 'Get spacing schedule and plans. Use this for questions about spacing activities, moving plants between trays, or spacing dates.',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            limit: { type: 'number' }
          }
        },
      },
    ],
  };
});

// Handle tool calls
mcpServer.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

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
    case 'get_nutrient_issues': {
      const status = (args as any)?.status;
      const limit = (args as any)?.limit || 50;

      let query = supabaseAdmin
        .from('nutrient_issues')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'get_water_issues': {
      const status = (args as any)?.status;
      const limit = (args as any)?.limit || 50;

      let query = supabaseAdmin
        .from('water_issues')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'get_plant_batches': {
      const status = (args as any)?.status;
      const limit = (args as any)?.limit || 50;

      let query = supabaseAdmin
        .from('plant_batches')
        .select('*, crops(*)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'get_spray_logs': {
      const sprayType = (args as any)?.sprayType;
      const limit = (args as any)?.limit || 50;

      let query = supabaseAdmin
        .from('spray_logs')
        .select('*')
        .order('application_date', { ascending: false })
        .limit(limit);

      if (sprayType) {
        query = query.eq('spray_type', sprayType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'get_seed_inventory': {
      const lowStock = (args as any)?.lowStock;
      const cropId = (args as any)?.cropId;

      let query = supabaseAdmin
        .from('seeds')
        .select('*, crops(*), vendors(*)')
        .order('crops(name)', { ascending: true });

      if (cropId) {
        query = query.eq('crop_id', cropId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter for low stock if requested
      let filteredData = data;
      if (lowStock && data) {
        filteredData = data.filter((seed: any) => seed.current_quantity < 100);
      }

      return { content: [{ type: 'text', text: JSON.stringify(filteredData, null, 2) }] };
    }
    case 'get_seeding_plans': {
      const startDate = (args as any)?.startDate;
      const endDate = (args as any)?.endDate;
      const limit = (args as any)?.limit || 50;

      let query = supabaseAdmin
        .from('seeding_plans')
        .select('*, crops(*), plant_batches(*)')
        .order('seeding_date', { ascending: true })
        .limit(limit);

      if (startDate) {
        query = query.gte('seeding_date', startDate);
      }

      if (endDate) {
        query = query.lte('seeding_date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'get_spacing_plans': {
      const startDate = (args as any)?.startDate;
      const endDate = (args as any)?.endDate;
      const limit = (args as any)?.limit || 50;

      let query = supabaseAdmin
        .from('spacing_plans')
        .select('*, plant_batches(*, crops(*))')
        .order('spacing_date', { ascending: true })
        .limit(limit);

      if (startDate) {
        query = query.gte('spacing_date', startDate);
      }

      if (endDate) {
        query = query.lte('spacing_date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
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
        case 'get_nutrient_issues': {
          const status = params?.status;
          const limit = params?.limit || 50;

          let query = supabaseAdmin
            .from('nutrient_issues')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

          if (farmId) query = query.eq('farm_id', farmId);
          if (status) query = query.eq('status', status);

          const { data, error } = await query;
          if (error) throw error;
          return JSON.stringify(data, null, 2);
        }
        case 'get_water_issues': {
          const status = params?.status;
          const limit = params?.limit || 50;

          let query = supabaseAdmin
            .from('water_issues')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

          if (farmId) query = query.eq('farm_id', farmId);
          if (status) query = query.eq('status', status);

          const { data, error } = await query;
          if (error) throw error;
          return JSON.stringify(data, null, 2);
        }
        case 'get_plant_batches': {
          const status = params?.status;
          const limit = params?.limit || 50;

          let query = supabaseAdmin
            .from('plant_batches')
            .select('*, crops(*)')
            .order('created_at', { ascending: false })
            .limit(limit);

          if (farmId) query = query.eq('farm_id', farmId);
          if (status) query = query.eq('status', status);

          const { data, error } = await query;
          if (error) throw error;
          return JSON.stringify(data, null, 2);
        }
        case 'get_spray_logs': {
          const sprayType = params?.sprayType;
          const limit = params?.limit || 50;

          let query = supabaseAdmin
            .from('spray_logs')
            .select('*')
            .order('application_date', { ascending: false })
            .limit(limit);

          if (farmId) query = query.eq('farm_id', farmId);
          if (sprayType) query = query.eq('spray_type', sprayType);

          const { data, error } = await query;
          if (error) throw error;
          return JSON.stringify(data, null, 2);
        }
        case 'get_seed_inventory': {
          const lowStock = params?.lowStock;
          const cropId = params?.cropId;

          let query = supabaseAdmin
            .from('seeds')
            .select('*, crops(*), vendors(*)')
            .order('crops(name)', { ascending: true });

          if (farmId) query = query.eq('farm_id', farmId);
          if (cropId) query = query.eq('crop_id', cropId);

          const { data, error } = await query;
          if (error) throw error;

          // Filter for low stock if requested
          let filteredData = data;
          if (lowStock && data) {
            filteredData = data.filter((seed: any) => seed.current_quantity < 100);
          }

          return JSON.stringify(filteredData, null, 2);
        }
        case 'get_seeding_plans': {
          const startDate = params?.startDate;
          const endDate = params?.endDate;
          const limit = params?.limit || 50;

          let query = supabaseAdmin
            .from('seeding_plans')
            .select('*, crops(*), plant_batches(*)')
            .order('seeding_date', { ascending: true })
            .limit(limit);

          if (farmId) query = query.eq('farm_id', farmId);
          if (startDate) query = query.gte('seeding_date', startDate);
          if (endDate) query = query.lte('seeding_date', endDate);

          const { data, error } = await query;
          if (error) throw error;
          return JSON.stringify(data, null, 2);
        }
        case 'get_spacing_plans': {
          const startDate = params?.startDate;
          const endDate = params?.endDate;
          const limit = params?.limit || 50;

          let query = supabaseAdmin
            .from('spacing_plans')
            .select('*, plant_batches(*, crops(*))')
            .order('spacing_date', { ascending: true })
            .limit(limit);

          if (farmId) query = query.eq('farm_id', farmId);
          if (startDate) query = query.gte('spacing_date', startDate);
          if (endDate) query = query.lte('spacing_date', endDate);

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