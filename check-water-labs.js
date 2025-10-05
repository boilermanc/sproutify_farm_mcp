#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  console.error('Error: SUPABASE_URL environment variable is not defined');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is not defined');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkWaterLabs() {
  console.log('Checking for water labs table...\n');

  const tableNames = [
    'water_labs',
    'labs',
    'testing_labs',
    'water_testing_labs'
  ];

  for (const tableName of tableNames) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(3);

    if (!error) {
      console.log(`✅ Table exists: ${tableName}`);
      console.log(`   Found ${data.length} labs`);
      if (data && data.length > 0) {
        console.log(`   Columns:`, Object.keys(data[0]).join(', '));
        console.log(`   Sample:`, JSON.stringify(data[0], null, 2));
      }
      console.log('');
    } else {
      console.log(`❌ Table not found: ${tableName}`);
    }
  }
}

checkWaterLabs();
