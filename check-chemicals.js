#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const farmId = '624a653c-d36b-47d6-806d-584bd6c2cfcf';

async function checkChemicals() {
  console.log('Checking for chemical/pesticide tables...\n');

  const tableNames = [
    'chemicals',
    'pesticides',
    'farm_chemicals',
    'spray_chemicals',
    'core_chemicals',
    'chemical_inventory'
  ];

  for (const tableName of tableNames) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('farm_id', farmId)
      .limit(3);

    if (!error) {
      console.log(`✅ Table exists: ${tableName}`);
      console.log(`   Found ${data.length} items for this farm`);
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

checkChemicals();
