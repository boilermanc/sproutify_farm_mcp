#!/usr/bin/env node
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { SimpleSage } from './services/simpleSage.js';
// --------------------
// Supabase Setup
// --------------------
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
// --------------------
// Authentication Middleware
// --------------------
async function authenticateUser(token) {
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
async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
    }
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    try {
        const user = await authenticateUser(token);
        req.user = user;
        next();
    }
    catch (error) {
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
const mcpServer = new Server({ name: 'sage-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });
// Store active SSE transports by session ID so POST handlers can route messages
const sseTransports = {};
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
                name: 'get_nutrient_readings',
                description: 'Get nutrient readings including pH and EC measurements. Use this when asked about pH levels, EC readings, or current nutrient status.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        tower_id: { type: 'string' },
                        limit: { type: 'number' }
                    }
                },
            },
            {
                name: 'get_water_tests',
                description: 'Get water test results and history. Use this when asked about water tests, water quality testing, or lab results.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        limit: { type: 'number' }
                    }
                },
            },
            {
                name: 'get_water_labs',
                description: 'Get available water testing laboratories. Use this when asked about water labs or where to test water.',
                inputSchema: {
                    type: 'object',
                    properties: {}
                },
            },
            {
                name: 'get_plant_batches',
                description: 'Get current plant batches and seeded items. **Use this tool for questions like**: "What\'s seeded?", "What have we planted?", "What\'s currently growing?", "Show me plant batches", "What crops are in production?". Returns all active batches with crop details.',
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
                name: 'get_crops',
                description: 'Get list of crops grown on the farm. Use this for questions like "What crops do we grow?", "Show me our crops", or "What varieties do we have?".',
                inputSchema: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', enum: ['active', 'inactive'] }
                    }
                },
            },
            {
                name: 'get_vendors',
                description: 'Get vendors and suppliers. Use this for questions like "What vendors do we use?", "Show suppliers", or "Who do we buy from?".',
                inputSchema: {
                    type: 'object',
                    properties: {
                        type: { type: 'string', enum: ['seed', 'chemical', 'equipment', 'other'] },
                        status: { type: 'string', enum: ['active', 'inactive'] }
                    }
                },
            },
            {
                name: 'get_towers',
                description: 'Get tower information and status. Use this for questions like "Show me all towers", "Which towers are empty?", "What\'s in tower 5?".',
                inputSchema: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', enum: ['active', 'inactive', 'maintenance'] },
                        tower_number: { type: 'number' }
                    }
                },
            },
            {
                name: 'get_tasks',
                description: 'Get farm tasks and to-dos. Use this for questions like "What tasks do we have?", "Show open tasks", or "What needs to be done?".',
                inputSchema: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
                        limit: { type: 'number' }
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
            if (error)
                throw error;
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'get_seed_inventory': {
            const { data, error } = await supabaseAdmin.from('seeds').select('*');
            if (error)
                throw error;
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
        case 'get_nutrient_readings': {
            const tower_id = args?.tower_id;
            const limit = args?.limit || 50;
            let query = supabaseAdmin
                .from('nutrient_readings')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (tower_id) {
                query = query.eq('tower_id', tower_id);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'get_water_tests': {
            const limit = args?.limit || 50;
            let query = supabaseAdmin
                .from('water_tests')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            const { data, error } = await query;
            if (error)
                throw error;
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'get_water_labs': {
            const { data, error } = await supabaseAdmin
                .from('water_labs')
                .select('*')
                .eq('is_active', true);
            if (error)
                throw error;
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'get_plant_batches': {
            const status = args?.status;
            const limit = args?.limit || 50;
            let query = supabaseAdmin
                .from('plant_batches')
                .select('*, seeds(*, crops(*))')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (status) {
                query = query.eq('status', status);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'get_spray_logs': {
            const sprayType = args?.sprayType;
            const limit = args?.limit || 50;
            let query = supabaseAdmin
                .from('core_spray_applications')
                .select('*')
                .order('application_date', { ascending: false })
                .limit(limit);
            if (sprayType) {
                query = query.eq('spray_type', sprayType);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'get_crops': {
            const status = args?.status;
            let query = supabaseAdmin
                .from('crops')
                .select('*')
                .order('crop_name', { ascending: true });
            if (status) {
                query = query.eq('status', status);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'get_vendors': {
            const type = args?.type;
            const status = args?.status;
            let query = supabaseAdmin
                .from('vendors')
                .select('*')
                .order('vendor_name', { ascending: true });
            if (type)
                query = query.eq('type', type);
            if (status)
                query = query.eq('status', status);
            const { data, error } = await query;
            if (error)
                throw error;
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'get_towers': {
            const status = args?.status;
            const tower_number = args?.tower_number;
            let query = supabaseAdmin
                .from('towers')
                .select('*')
                .order('tower_number', { ascending: true });
            if (status)
                query = query.eq('status', status);
            if (tower_number)
                query = query.eq('tower_number', tower_number);
            const { data, error } = await query;
            if (error)
                throw error;
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'get_tasks': {
            const status = args?.status || 'pending';
            const limit = args?.limit || 50;
            let query = supabaseAdmin
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (status)
                query = query.eq('status', status);
            const { data, error } = await query;
            if (error)
                throw error;
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'get_seed_inventory': {
            const lowStock = args?.lowStock;
            const cropId = args?.cropId;
            let query = supabaseAdmin
                .from('seeds')
                .select('*, crops(*), vendors(*)')
                .order('crops(name)', { ascending: true });
            if (cropId) {
                query = query.eq('crop_id', cropId);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            // Filter for low stock if requested
            let filteredData = data;
            if (lowStock && data) {
                filteredData = data.filter((seed) => seed.current_quantity < 100);
            }
            return { content: [{ type: 'text', text: JSON.stringify(filteredData, null, 2) }] };
        }
        case 'get_seeding_plans': {
            const startDate = args?.startDate;
            const endDate = args?.endDate;
            const limit = args?.limit || 50;
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
            if (error)
                throw error;
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'get_spacing_plans': {
            const startDate = args?.startDate;
            const endDate = args?.endDate;
            const limit = args?.limit || 50;
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
            if (error)
                throw error;
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        default:
            return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
    }
});
// --------------------
// MCP SSE Transport
// --------------------
app.get('/mcp', authMiddleware, async (_req, res) => {
    try {
        const transport = new SSEServerTransport('/mcp/messages', res);
        const sessionId = transport.sessionId;
        sseTransports[sessionId] = transport;
        transport.onclose = () => {
            delete sseTransports[sessionId];
        };
        await mcpServer.connect(transport);
    }
    catch (error) {
        console.error('Error establishing MCP SSE connection:', error);
        if (!res.headersSent) {
            res.status(500).send('Failed to establish MCP SSE connection');
        }
    }
});
app.post('/mcp/messages', authMiddleware, async (req, res) => {
    const sessionId = req.query.sessionId;
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
    }
    catch (error) {
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
app.post('/api/sage/chat', authMiddleware, async (req, res) => {
    console.log('[/api/sage/chat] Request received:', req.body);
    try {
        const { message, farmId, sessionId, farmName = 'your farm' } = req.body;
        if (!message) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }
        // Helper function to call MCP tools with farmId filtering
        const getMCPData = async (toolName, params) => {
            console.log(`[getMCPData] Called with tool: ${toolName}, params:`, params, 'farmId:', farmId);
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
                    if (farmId)
                        query = query.eq('farm_id', farmId);
                    const { data, error } = await query;
                    if (error)
                        throw error;
                    return JSON.stringify(data, null, 2);
                }
                case 'get_seed_inventory': {
                    let query = supabaseAdmin.from('seed_inventory').select('*');
                    if (farmId)
                        query = query.eq('farm_id', farmId);
                    const { data, error } = await query;
                    if (error)
                        throw error;
                    return JSON.stringify(data, null, 2);
                }
                case 'get_nutrient_readings': {
                    const tower_id = params?.tower_id;
                    const limit = params?.limit || 50;
                    let query = supabaseAdmin
                        .from('nutrient_readings')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(limit);
                    if (farmId)
                        query = query.eq('farm_id', farmId);
                    if (tower_id)
                        query = query.eq('tower_id', tower_id);
                    const { data, error } = await query;
                    if (error)
                        throw error;
                    return JSON.stringify(data, null, 2);
                }
                case 'get_water_tests': {
                    const limit = params?.limit || 50;
                    let query = supabaseAdmin
                        .from('water_tests')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(limit);
                    if (farmId)
                        query = query.eq('farm_id', farmId);
                    const { data, error } = await query;
                    if (error)
                        throw error;
                    return JSON.stringify(data, null, 2);
                }
                case 'get_water_labs': {
                    const { data, error } = await supabaseAdmin
                        .from('water_labs')
                        .select('*')
                        .eq('is_active', true);
                    if (error)
                        throw error;
                    return JSON.stringify(data, null, 2);
                }
                case 'get_plant_batches': {
                    const status = params?.status;
                    const limit = params?.limit || 50;
                    let query = supabaseAdmin
                        .from('plant_batches')
                        .select('*, seeds(*, crops(*))')
                        .order('created_at', { ascending: false })
                        .limit(limit);
                    if (farmId)
                        query = query.eq('farm_id', farmId);
                    if (status)
                        query = query.eq('status', status);
                    const { data, error } = await query;
                    if (error) {
                        console.error('[getMCPData] Supabase error:', error);
                        throw error;
                    }
                    console.log('[getMCPData] Successfully retrieved', data?.length, 'plant batches');
                    return JSON.stringify(data, null, 2);
                }
                case 'get_spray_logs': {
                    const sprayType = params?.sprayType;
                    const limit = params?.limit || 50;
                    let query = supabaseAdmin
                        .from('core_spray_applications')
                        .select('*')
                        .order('application_date', { ascending: false })
                        .limit(limit);
                    if (farmId)
                        query = query.eq('farm_id', farmId);
                    if (sprayType)
                        query = query.eq('spray_type', sprayType);
                    const { data, error } = await query;
                    if (error)
                        throw error;
                    return JSON.stringify(data, null, 2);
                }
                case 'get_crops': {
                    const status = params?.status;
                    let query = supabaseAdmin
                        .from('crops')
                        .select('*')
                        .order('crop_name', { ascending: true });
                    if (farmId)
                        query = query.eq('farm_id', farmId);
                    if (status)
                        query = query.eq('status', status);
                    const { data, error } = await query;
                    if (error)
                        throw error;
                    return JSON.stringify(data, null, 2);
                }
                case 'get_vendors': {
                    const type = params?.type;
                    const status = params?.status;
                    let query = supabaseAdmin
                        .from('vendors')
                        .select('*')
                        .order('vendor_name', { ascending: true });
                    if (farmId)
                        query = query.eq('farm_id', farmId);
                    if (type)
                        query = query.eq('type', type);
                    if (status)
                        query = query.eq('status', status);
                    const { data, error } = await query;
                    if (error)
                        throw error;
                    return JSON.stringify(data, null, 2);
                }
                case 'get_towers': {
                    const status = params?.status;
                    const tower_number = params?.tower_number;
                    let query = supabaseAdmin
                        .from('towers')
                        .select('*')
                        .order('tower_number', { ascending: true });
                    if (farmId)
                        query = query.eq('farm_id', farmId);
                    if (status)
                        query = query.eq('status', status);
                    if (tower_number)
                        query = query.eq('tower_number', tower_number);
                    const { data, error } = await query;
                    if (error)
                        throw error;
                    return JSON.stringify(data, null, 2);
                }
                case 'get_tasks': {
                    const status = params?.status || 'pending';
                    const limit = params?.limit || 50;
                    let query = supabaseAdmin
                        .from('tasks')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(limit);
                    if (farmId)
                        query = query.eq('farm_id', farmId);
                    if (status)
                        query = query.eq('status', status);
                    const { data, error } = await query;
                    if (error)
                        throw error;
                    return JSON.stringify(data, null, 2);
                }
                case 'get_seed_inventory': {
                    const lowStock = params?.lowStock;
                    const cropId = params?.cropId;
                    let query = supabaseAdmin
                        .from('seeds')
                        .select('*, crops(*), vendors(*)')
                        .order('crops(name)', { ascending: true });
                    if (farmId)
                        query = query.eq('farm_id', farmId);
                    if (cropId)
                        query = query.eq('crop_id', cropId);
                    const { data, error } = await query;
                    if (error)
                        throw error;
                    // Filter for low stock if requested
                    let filteredData = data;
                    if (lowStock && data) {
                        filteredData = data.filter((seed) => seed.current_quantity < 100);
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
                    if (farmId)
                        query = query.eq('farm_id', farmId);
                    if (startDate)
                        query = query.gte('seeding_date', startDate);
                    if (endDate)
                        query = query.lte('seeding_date', endDate);
                    const { data, error } = await query;
                    if (error)
                        throw error;
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
                    if (farmId)
                        query = query.eq('farm_id', farmId);
                    if (startDate)
                        query = query.gte('spacing_date', startDate);
                    if (endDate)
                        query = query.lte('spacing_date', endDate);
                    const { data, error } = await query;
                    if (error)
                        throw error;
                    return JSON.stringify(data, null, 2);
                }
                default:
                    throw new Error(`Unknown tool: ${toolName}`);
            }
        };
        // Process message through SimpleSage
        const response = await sage.processMessage(message, { farmName }, getMCPData);
        res.json({
            response,
            sessionId: sessionId || 'default',
            timestamp: new Date().toISOString()
        });
    }
    catch (err) {
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
