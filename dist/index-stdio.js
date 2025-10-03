#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
// --------------------
// Supabase Setup
// --------------------
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
// --------------------
// MCP Server + Tools
// --------------------
const mcpServer = new Server({ name: 'sage-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });
// List available tools
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'get_towers',
                description: 'Get tower information for a specific farm',
                inputSchema: {
                    type: 'object',
                    properties: {
                        farmId: {
                            type: 'string',
                            description: 'The farm ID to get towers for',
                        },
                    },
                    required: ['farmId'],
                },
            },
            {
                name: 'get_seed_inventory',
                description: 'Get seed inventory for a specific farm',
                inputSchema: {
                    type: 'object',
                    properties: {
                        farmId: {
                            type: 'string',
                            description: 'The farm ID to get seed inventory for',
                        },
                    },
                    required: ['farmId'],
                },
            },
            {
                name: 'get_farm_stats',
                description: 'Get quick statistics about a specific farm',
                inputSchema: {
                    type: 'object',
                    properties: {
                        farmId: {
                            type: 'string',
                            description: 'The farm ID to get statistics for',
                        },
                    },
                    required: ['farmId'],
                },
            },
        ],
    };
});
// Handle tool calls
mcpServer.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const farmId = args?.farmId;
    if (!farmId) {
        throw new Error('farmId is required');
    }
    switch (name) {
        case 'get_towers': {
            const { data, error } = await supabaseAdmin
                .from('towers')
                .select('*')
                .eq('farm_id', farmId);
            if (error)
                throw error;
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'get_seed_inventory': {
            const { data, error } = await supabaseAdmin
                .from('seeds')
                .select('*')
                .eq('farm_id', farmId);
            if (error)
                throw error;
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'get_farm_stats': {
            const { count: towerCount } = await supabaseAdmin
                .from('towers')
                .select('*', { count: 'exact', head: true })
                .eq('farm_id', farmId);
            const { count: seedCount } = await supabaseAdmin
                .from('seeds')
                .select('*', { count: 'exact', head: true })
                .eq('farm_id', farmId);
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
// Start stdio transport
// --------------------
async function main() {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error('MCP Server running on stdio');
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
