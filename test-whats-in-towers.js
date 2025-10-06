import { SimpleSage } from './dist/services/simpleSage.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const farmId = '6f51084a-24f6-44d6-a6cf-2770e75284d1'; // Carson Farm

// Mock MCP data getter
async function getMCPData(toolName, args = {}) {
  console.log(`[TEST] Calling tool: ${toolName}`, args);

  if (toolName === 'get_plant_batches') {
    const { data, error } = await supabase
      .from('plant_batches')
      .select('*, seeds(*, crops(*)), towers(*)')
      .eq('farm_id', farmId)
      .limit(args.limit || 20);

    if (error) throw error;
    console.log(`[TEST] Found ${data.length} plant batches`);
    console.log(`[TEST] Batches with towers:`, data.filter(b => b.towers).length);
    return JSON.stringify(data);
  }

  return '[]';
}

async function test() {
  const sage = new SimpleSage();

  const questions = [
    "what's in my towers",
    "whats in my towers?",
    "what is in my towers",
    "how many towers do i have growing"
  ];

  for (const question of questions) {
    console.log('\n' + '='.repeat(60));
    console.log(`QUESTION: "${question}"`);
    console.log('='.repeat(60));

    const response = await sage.processMessage(question, { farmName: 'Carson Farm' }, getMCPData);
    console.log('\nRESPONSE:');
    console.log(response);
  }
}

test().catch(console.error);
