#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  console.log('Checking for nutrient-related tables...\n');

  // Try to query the information schema to see what tables exist
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .like('table_name', '%nutrient%');

  if (error) {
    console.error('Error querying schema:', error);

    // Fallback: Try common table names
    console.log('\nTrying common nutrient table names...\n');

    const tableNames = [
      'nutrient_issues',
      'nutrient_tasks',
      'nutrient_readings',
      'nutrient_logs',
      'tower_readings',
      'tower_logs',
      'ph_readings',
      'ec_readings'
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
  } else {
    console.log('Found nutrient-related tables:');
    data.forEach(row => console.log(`  - ${row.table_name}`));
  }
}

checkTables();
