#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { ReportGenerator } from './reports/generator.js';
// Load environment variables
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3010;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    console.error("Missing Supabase credentials in environment variables");
    process.exit(1);
}
// Service client for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
function extractAccessToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    const tokenParam = req.query.access_token;
    if (typeof tokenParam === 'string' && tokenParam.trim().length > 0) {
        return tokenParam;
    }
    if (Array.isArray(tokenParam)) {
        const firstValid = tokenParam.find((value) => typeof value === 'string' && value.trim().length > 0);
        if (firstValid && typeof firstValid === 'string') {
            return firstValid;
        }
    }
    return null;
}
// Middleware to verify JWT and extract user context
async function authenticateUser(token) {
    if (!token) {
        return null;
    }
    try {
        // Verify the JWT token with Supabase
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            console.error("Auth error:", error);
            return null;
        }
        // Get user's profile and farm information
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*, farms(*)')
            .eq('id', user.id)
            .single();
        if (profileError || !profile) {
            console.error("Profile error:", profileError);
            return null;
        }
        return {
            userId: user.id,
            farmId: profile.farm_id,
            email: profile.email || user.email || '',
            role: profile.role || 'viewer'
        };
    }
    catch (error) {
        console.error("Auth error:", error);
        return null;
    }
}
// Create MCP server for each connection
function createMCPServer(userContext) {
    const server = new Server({
        name: "sproutify-farm-mcp",
        version: "0.1.0",
    }, {
        capabilities: {
            tools: {},
        },
    });
    // Create a scoped Supabase client for this user's farm
    const scopedSupabase = createClient(supabaseUrl, supabaseServiceKey);
    // Handle tool listing
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: "get_towers",
                    description: "Get tower information for your farm",
                    inputSchema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "string",
                                enum: ["empty", "growing", "ready_harvest", "maintenance"],
                                description: "Filter by tower status (optional)"
                            }
                        }
                    }
                },
                {
                    name: "get_crop_plans",
                    description: "Get seeding and spacing plans for your farm",
                    inputSchema: {
                        type: "object",
                        properties: {
                            startDate: { type: "string", description: "Start date (ISO format, optional)" },
                            endDate: { type: "string", description: "End date (ISO format, optional)" }
                        }
                    }
                },
                {
                    name: "get_seed_inventory",
                    description: "Get seed inventory for your farm",
                    inputSchema: {
                        type: "object",
                        properties: {
                            lowStockOnly: { type: "boolean", description: "Only show low stock items (optional)" }
                        }
                    }
                },
                {
                    name: "create_seeding_plan",
                    description: "Create a new seeding plan",
                    inputSchema: {
                        type: "object",
                        properties: {
                            weekStartDate: { type: "string", description: "Week start date (ISO format)" },
                            seedingDate: { type: "string", description: "Seeding date (ISO format)" },
                            cropId: { type: "string", description: "The crop ID" },
                            quantity: { type: "number", description: "Number of seeds" },
                            notes: { type: "string", description: "Optional notes" }
                        },
                        required: ["weekStartDate", "seedingDate", "cropId", "quantity"]
                    }
                },
                {
                    name: "get_farm_info",
                    description: "Get information about your farm",
                    inputSchema: {
                        type: "object",
                        properties: {}
                    }
                },
                {
                    name: "generate_report",
                    description: "Generate a printable report for your farm",
                    inputSchema: {
                        type: "object",
                        properties: {
                            reportType: {
                                type: "string",
                                enum: ["tower_status", "seed_inventory", "weekly_planning", "harvest", "production_summary"],
                                description: "Type of report to generate"
                            },
                            dateRange: {
                                type: "object",
                                properties: {
                                    start: { type: "string", description: "Start date (ISO format)" },
                                    end: { type: "string", description: "End date (ISO format)" }
                                },
                                description: "Optional date range for the report"
                            }
                        },
                        required: ["reportType"]
                    }
                }
            ]
        };
    });
    // Handle tool execution
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const farmId = userContext.farmId; // Always use the authenticated user's farm
        try {
            switch (name) {
                case "get_farm_info": {
                    const { data, error } = await scopedSupabase
                        .from('farms')
                        .select('*')
                        .eq('id', farmId)
                        .single();
                    if (error)
                        throw error;
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Farm: ${data.farm_name}\nLocation: ${data.city}, ${data.state}, ${data.country}\nTowers: ${data.number_of_towers || 0}\nStatus: ${data.status}`
                            }
                        ]
                    };
                }
                case "get_towers": {
                    const status = args?.status;
                    let query = scopedSupabase
                        .from('towers')
                        .select('*')
                        .eq('farm_id', farmId);
                    if (status) {
                        query = query.eq('status', status);
                    }
                    const { data, error } = await query;
                    if (error)
                        throw error;
                    // Count by status for summary
                    const statusCounts = data?.reduce((acc, tower) => {
                        acc[tower.status] = (acc[tower.status] || 0) + 1;
                        return acc;
                    }, {}) || {};
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Total Towers: ${data?.length || 0}\n\nBy Status:\n${Object.entries(statusCounts).map(([s, count]) => `- ${s}: ${count}`).join('\n')}\n\nDetails:\n${JSON.stringify(data, null, 2)}`
                            }
                        ]
                    };
                }
                case "get_crop_plans": {
                    const startDate = args?.startDate;
                    const endDate = args?.endDate;
                    let seedingQuery = scopedSupabase
                        .from('seeding_plans')
                        .select(`
              *,
              crops:crop_id (name, variety)
            `)
                        .eq('farm_id', farmId);
                    if (startDate) {
                        seedingQuery = seedingQuery.gte('seeding_date', startDate);
                    }
                    if (endDate) {
                        seedingQuery = seedingQuery.lte('seeding_date', endDate);
                    }
                    const { data: seedingPlans, error: seedingError } = await seedingQuery;
                    if (seedingError)
                        throw seedingError;
                    // Get spacing plans too
                    const { data: spacingPlans, error: spacingError } = await scopedSupabase
                        .from('spacing_plans')
                        .select('*')
                        .eq('farm_id', farmId);
                    if (spacingError)
                        throw spacingError;
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    seeding: seedingPlans,
                                    spacing: spacingPlans
                                }, null, 2)
                            }
                        ]
                    };
                }
                case "get_seed_inventory": {
                    const lowStockOnly = args?.lowStockOnly;
                    let query = scopedSupabase
                        .from('seeds')
                        .select(`
              *,
              crops:crop_id (name, variety),
              vendors:vendor_id (name, contact_email)
            `)
                        .eq('farm_id', farmId);
                    if (lowStockOnly) {
                        query = query.lt('current_quantity', 100);
                    }
                    const { data, error } = await query;
                    if (error)
                        throw error;
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(data, null, 2)
                            }
                        ]
                    };
                }
                case "create_seeding_plan": {
                    if (!args || typeof args !== 'object') {
                        throw new Error("Missing arguments");
                    }
                    const params = args;
                    // Check user role for write permissions
                    if (userContext.role === 'viewer') {
                        throw new Error("You don't have permission to create seeding plans");
                    }
                    const { data, error } = await scopedSupabase
                        .from('seeding_plans')
                        .insert({
                        farm_id: farmId,
                        week_start_date: params.weekStartDate,
                        seeding_date: params.seedingDate,
                        crop_id: params.cropId,
                        quantity: params.quantity,
                        notes: params.notes
                    })
                        .select()
                        .single();
                    if (error)
                        throw error;
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Seeding plan created successfully for ${params.quantity} seeds on ${params.seedingDate}`
                            }
                        ]
                    };
                }
                case "generate_report": {
                    if (!args || typeof args !== 'object') {
                        throw new Error("Missing arguments");
                    }
                    const params = args;
                    const reportType = params.reportType;
                    const dateRange = params.dateRange;
                    // Get farm info for the report context
                    const { data: farmData, error: farmError } = await scopedSupabase
                        .from('farms')
                        .select('farm_name')
                        .eq('id', farmId)
                        .single();
                    if (farmError)
                        throw farmError;
                    const reportGenerator = new ReportGenerator(scopedSupabase);
                    const context = {
                        farmId,
                        farmName: farmData.farm_name,
                        userEmail: userContext.email,
                        reportType: reportType.replace('_', ' ').toUpperCase(),
                        dateRange
                    };
                    let htmlReport;
                    switch (reportType) {
                        case 'tower_status':
                            htmlReport = await reportGenerator.generateTowerStatusReport(context);
                            break;
                        case 'seed_inventory':
                            htmlReport = await reportGenerator.generateSeedInventoryReport(context);
                            break;
                        case 'weekly_planning':
                            htmlReport = await reportGenerator.generateWeeklyPlanningReport(context);
                            break;
                        case 'harvest':
                            htmlReport = await reportGenerator.generateHarvestReport(context);
                            break;
                        case 'production_summary':
                            htmlReport = await reportGenerator.generateProductionSummaryReport(context);
                            break;
                        default:
                            throw new Error(`Unknown report type: ${reportType}`);
                    }
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Report generated successfully! The HTML report is ready for display.`
                            },
                            {
                                type: "text",
                                text: htmlReport
                            }
                        ]
                    };
                }
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        }
        catch (error) {
            let detail;
            if (error instanceof Error && error.message) {
                detail = error.message;
            }
            else if (typeof error === 'object' && error !== null) {
                try {
                    detail = JSON.stringify(error, null, 2);
                }
                catch (_jsonError) {
                    detail = String(error);
                }
            }
            else {
                detail = String(error);
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${detail}`
                    }
                ]
            };
        }
    });
    return server;
}
const activeSessions = new Map();
// SSE endpoint for MCP
app.get('/mcp/sse', async (req, res) => {
    const token = extractAccessToken(req);
    const userContext = await authenticateUser(token);
    if (!userContext) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    console.log(`MCP connection from user ${userContext.email} for farm ${userContext.farmId}`);
    const transport = new SSEServerTransport('/mcp/sse', res);
    const sessionId = transport.sessionId;
    const server = createMCPServer(userContext);
    activeSessions.set(sessionId, { transport, user: userContext });
    transport.onclose = () => {
        activeSessions.delete(sessionId);
    };
    try {
        await server.connect(transport);
        console.log(`Established MCP SSE session ${sessionId}`);
    }
    catch (error) {
        activeSessions.delete(sessionId);
        console.error('Failed to establish MCP SSE session:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to establish MCP session' });
        }
    }
});
app.post('/mcp/sse', async (req, res) => {
    const rawSessionId = req.query.sessionId;
    const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'Missing sessionId' });
    }
    const session = activeSessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    const token = extractAccessToken(req);
    const userContext = await authenticateUser(token);
    if (!userContext || userContext.userId !== session.user.userId) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        await session.transport.handlePostMessage(req, res, req.body);
    }
    catch (error) {
        console.error('Error handling MCP message:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to process MCP message' });
        }
    }
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'sproutify-farm-mcp' });
});
// Direct report generation endpoint
app.post('/reports/generate', async (req, res) => {
    const userContext = await authenticateUser(extractAccessToken(req));
    if (!userContext) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const { reportType, dateRange } = req.body;
        if (!reportType) {
            return res.status(400).json({ error: 'Report type is required' });
        }
        // Get farm info
        const { data: farmData, error: farmError } = await supabaseAdmin
            .from('farms')
            .select('farm_name')
            .eq('id', userContext.farmId)
            .single();
        if (farmError)
            throw farmError;
        const reportGenerator = new ReportGenerator(supabaseAdmin);
        const context = {
            farmId: userContext.farmId,
            farmName: farmData.farm_name,
            userEmail: userContext.email,
            reportType: reportType.replace('_', ' ').toUpperCase(),
            dateRange
        };
        let htmlReport;
        switch (reportType) {
            case 'tower_status':
                htmlReport = await reportGenerator.generateTowerStatusReport(context);
                break;
            case 'seed_inventory':
                htmlReport = await reportGenerator.generateSeedInventoryReport(context);
                break;
            case 'weekly_planning':
                htmlReport = await reportGenerator.generateWeeklyPlanningReport(context);
                break;
            case 'harvest':
                htmlReport = await reportGenerator.generateHarvestReport(context);
                break;
            case 'production_summary':
                htmlReport = await reportGenerator.generateProductionSummaryReport(context);
                break;
            default:
                return res.status(400).json({ error: `Unknown report type: ${reportType}` });
        }
        // Send HTML response
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlReport);
    }
    catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});
// Start the server
app.listen(PORT, () => {
    console.log(`Sproutify Farm MCP server (for Sage) running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`MCP SSE endpoint: http://localhost:${PORT}/mcp/sse`);
    console.log(`Report generator: http://localhost:${PORT}/reports/generate`);
});
