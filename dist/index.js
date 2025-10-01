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
                description: "Get tower information for a farm",
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
