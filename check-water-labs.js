#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
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
