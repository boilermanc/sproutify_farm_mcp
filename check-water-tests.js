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

const farmId = '624a653c-d36b-47d6-806d-584bd6c2cfcf';

async function checkWaterTables() {
  console.log('Checking for water test/quality tables...\n');

  const tableNames = [
    'water_tests',
    'water_quality_tests',
    'water_analysis',
    'water_samples',
    'water_lab_results',
    'core_water_tests'
  ];

  for (const tableName of tableNames) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error) {
      console.log(`✅ Table exists: ${tableName}`);
      if (data && data.length > 0) {
        console.log(`   Columns:`, Object.keys(data[0]).join(', '));
        console.log(`   Most recent test:`, JSON.stringify(data[0], null, 2));
      } else {
        console.log(`   (No data for this farm)`);
      }
      console.log('');
    } else {
      console.log(`❌ Table not found: ${tableName}`);
    }
  }
}

checkWaterTables();
