#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
// Supabase client setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials in environment variables");
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);
// Create MCP server
const server = new Server({
    name: "sproutify-farm-mcp",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_towers",
                description: "Get tower information and counts for a farm. Use this for questions about how many towers, tower status counts, or tower positions. Returns basic tower data without crop details.",
                inputSchema: {
                    type: "object",
                    properties: {
                        farmId: { type: "string", description: "The farm ID" },
                        status: {
                            type: "string",
                            enum: ["empty", "growing", "ready_harvest", "maintenance"],
                            description: "Filter by tower status (optional)"
                        }
                    },
                    required: ["farmId"]
                }
            },
            {
                name: "get_nutrient_issues",
                description: "Get nutrient-related issues including pH and EC problems for a farm. Use this when asked about pH levels, EC readings, nutrient imbalances, or when nutrients were last checked.",
                inputSchema: {
                    type: "object",
                    properties: {
                        farmId: { type: "string", description: "The farm ID" },
                        status: {
                            type: "string",
                            enum: ["open", "resolved", "monitoring"],
                            description: "Filter by issue status (optional)"
                        },
                        limit: { type: "number", description: "Limit number of results (optional, default 50)" }
                    },
                    required: ["farmId"]
                }
            },
            {
                name: "get_water_issues",
                description: "Get water quality issues for a farm. Use this when asked about water quality, water problems, reservoir issues, or water system status.",
                inputSchema: {
                    type: "object",
                    properties: {
                        farmId: { type: "string", description: "The farm ID" },
                        status: {
                            type: "string",
                            enum: ["open", "resolved", "monitoring"],
                            description: "Filter by issue status (optional)"
                        },
                        limit: { type: "number", description: "Limit number of results (optional, default 50)" }
                    },
                    required: ["farmId"]
                }
            },
            {
                name: "get_plant_batches",
                description: "Get planting records and plant batches for a farm. Use this for questions about what's planted, planting dates, crop varieties, or plant batch status.",
                inputSchema: {
                    type: "object",
                    properties: {
                        farmId: { type: "string", description: "The farm ID" },
                        status: {
                            type: "string",
                            enum: ["seeding", "germinating", "growing", "ready_harvest", "harvested"],
                            description: "Filter by batch status (optional)"
                        },
                        limit: { type: "number", description: "Limit number of results (optional, default 50)" }
                    },
                    required: ["farmId"]
                }
            },
            {
                name: "get_spray_logs",
                description: "Get core spray application logs for a farm. Use this for questions about sprays applied, spray schedules, or pest/disease treatment history. This is for CORE spray functionality only, NOT IPM module.",
                inputSchema: {
                    type: "object",
                    properties: {
                        farmId: { type: "string", description: "The farm ID" },
                        sprayType: {
                            type: "string",
                            enum: ["pesticide", "fungicide", "nutrient", "other"],
                            description: "Filter by spray type (optional)"
                        },
                        limit: { type: "number", description: "Limit number of results (optional, default 50)" }
                    },
                    required: ["farmId"]
                }
            },
            {
                name: "get_seed_inventory",
                description: "Get seed inventory and stock levels for a farm. Use this for questions about available seeds, seed quantities, low stock alerts, seed varieties, or seed costs.",
                inputSchema: {
                    type: "object",
                    properties: {
                        farmId: { type: "string", description: "The farm ID" },
                        lowStock: { type: "boolean", description: "Filter to show only low stock items (< 100 seeds) (optional)" },
                        cropId: { type: "string", description: "Filter by specific crop ID (optional)" }
                    },
                    required: ["farmId"]
                }
            },
            {
                name: "get_seeding_plans",
                description: "Get seeding schedule and plans for a farm. Use this for questions about upcoming seeding activities, what to seed next, seeding dates, or seeding quantities.",
                inputSchema: {
                    type: "object",
                    properties: {
                        farmId: { type: "string", description: "The farm ID" },
                        startDate: { type: "string", description: "Start date for seeding plans (ISO format, optional)" },
                        endDate: { type: "string", description: "End date for seeding plans (ISO format, optional)" },
                        limit: { type: "number", description: "Limit number of results (optional, default 50)" }
                    },
                    required: ["farmId"]
                }
            },
            {
                name: "get_spacing_plans",
                description: "Get spacing schedule and plans for a farm. Use this for questions about spacing activities, moving plants between trays, spacing dates, or which batches need spacing.",
                inputSchema: {
                    type: "object",
                    properties: {
                        farmId: { type: "string", description: "The farm ID" },
                        startDate: { type: "string", description: "Start date for spacing plans (ISO format, optional)" },
                        endDate: { type: "string", description: "End date for spacing plans (ISO format, optional)" },
                        limit: { type: "number", description: "Limit number of results (optional, default 50)" }
                    },
                    required: ["farmId"]
                }
            }
        ]
    };
});
// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "get_towers": {
                // Validate args exists and has required properties
                if (!args || typeof args !== 'object') {
                    throw new Error("Missing arguments");
                }
                const farmId = args.farmId;
                const status = args.status;
                if (!farmId) {
                    throw new Error("farmId is required");
                }
                let query = supabase
                    .from('towers')
                    .select('*')
                    .eq('farm_id', farmId);
                if (status) {
                    query = query.eq('status', status);
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
            case "get_nutrient_issues": {
                if (!args || typeof args !== 'object') {
                    throw new Error("Missing arguments");
                }
                const farmId = args.farmId;
                const status = args.status;
                const limit = args.limit;
                if (!farmId) {
                    throw new Error("farmId is required");
                }
                let query = supabase
                    .from('nutrient_issues')
                    .select('*')
                    .eq('farm_id', farmId)
                    .order('created_at', { ascending: false });
                if (status) {
                    query = query.eq('status', status);
                }
                if (limit) {
                    query = query.limit(limit);
                }
                else {
                    query = query.limit(50);
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
            case "get_water_issues": {
                if (!args || typeof args !== 'object') {
                    throw new Error("Missing arguments");
                }
                const farmId = args.farmId;
                const status = args.status;
                const limit = args.limit;
                if (!farmId) {
                    throw new Error("farmId is required");
                }
                let query = supabase
                    .from('water_issues')
                    .select('*')
                    .eq('farm_id', farmId)
                    .order('created_at', { ascending: false });
                if (status) {
                    query = query.eq('status', status);
                }
                if (limit) {
                    query = query.limit(limit);
                }
                else {
                    query = query.limit(50);
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
            case "get_plant_batches": {
                if (!args || typeof args !== 'object') {
                    throw new Error("Missing arguments");
                }
                const farmId = args.farmId;
                const status = args.status;
                const limit = args.limit;
                if (!farmId) {
                    throw new Error("farmId is required");
                }
                let query = supabase
                    .from('plant_batches')
                    .select('*, crops(*)')
                    .eq('farm_id', farmId)
                    .order('created_at', { ascending: false });
                if (status) {
                    query = query.eq('status', status);
                }
                if (limit) {
                    query = query.limit(limit);
                }
                else {
                    query = query.limit(50);
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
            case "get_spray_logs": {
                if (!args || typeof args !== 'object') {
                    throw new Error("Missing arguments");
                }
                const farmId = args.farmId;
                const sprayType = args.sprayType;
                const limit = args.limit;
                if (!farmId) {
                    throw new Error("farmId is required");
                }
                let query = supabase
                    .from('spray_logs')
                    .select('*')
                    .eq('farm_id', farmId)
                    .order('application_date', { ascending: false });
                if (sprayType) {
                    query = query.eq('spray_type', sprayType);
                }
                if (limit) {
                    query = query.limit(limit);
                }
                else {
                    query = query.limit(50);
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
            case "get_seed_inventory": {
                if (!args || typeof args !== 'object') {
                    throw new Error("Missing arguments");
                }
                const farmId = args.farmId;
                const lowStock = args.lowStock;
                const cropId = args.cropId;
                if (!farmId) {
                    throw new Error("farmId is required");
                }
                let query = supabase
                    .from('seeds')
                    .select('*, crops(*), vendors(*)')
                    .eq('farm_id', farmId)
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
                    filteredData = data.filter(seed => seed.current_quantity < 100);
                }
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(filteredData, null, 2)
                        }
                    ]
                };
            }
            case "get_seeding_plans": {
                if (!args || typeof args !== 'object') {
                    throw new Error("Missing arguments");
                }
                const farmId = args.farmId;
                const startDate = args.startDate;
                const endDate = args.endDate;
                const limit = args.limit;
                if (!farmId) {
                    throw new Error("farmId is required");
                }
                let query = supabase
                    .from('seeding_plans')
                    .select('*, crops(*), plant_batches(*)')
                    .eq('farm_id', farmId)
                    .order('seeding_date', { ascending: true });
                if (startDate) {
                    query = query.gte('seeding_date', startDate);
                }
                if (endDate) {
                    query = query.lte('seeding_date', endDate);
                }
                if (limit) {
                    query = query.limit(limit);
                }
                else {
                    query = query.limit(50);
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
            case "get_spacing_plans": {
                if (!args || typeof args !== 'object') {
                    throw new Error("Missing arguments");
                }
                const farmId = args.farmId;
                const startDate = args.startDate;
                const endDate = args.endDate;
                const limit = args.limit;
                if (!farmId) {
                    throw new Error("farmId is required");
                }
                let query = supabase
                    .from('spacing_plans')
                    .select('*, plant_batches(*, crops(*))')
                    .eq('farm_id', farmId)
                    .order('spacing_date', { ascending: true });
                if (startDate) {
                    query = query.gte('spacing_date', startDate);
                }
                if (endDate) {
                    query = query.lte('spacing_date', endDate);
                }
                if (limit) {
                    query = query.limit(limit);
                }
                else {
                    query = query.limit(50);
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
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`
                }
            ]
        };
    }
});
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Sproutify Farm MCP server running... Ready for Sage to connect!");
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
