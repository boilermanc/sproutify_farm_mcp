#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  console.error('❌ Error: SUPABASE_URL environment variable is not set');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_KEY environment variable is not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  console.log('Checking for spray/pest control tables...\n');

  const tableNames = [
    'spray_logs',
    'pest_sprays',
    'spray_applications',
    'spray_records',
    'pest_control_logs',
    'chemical_applications',
    'pesticide_logs'
  ];

  for (const tableName of tableNames) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (!error) {
      console.log(`✅ Table exists: ${tableName}`);
      if (data && data.length > 0) {
        console.log(`   Sample columns:`, Object.keys(data[0]).join(', '));
      }
    } else {
      console.log(`❌ Table not found: ${tableName}`);
    }
  }
}

checkTables();
