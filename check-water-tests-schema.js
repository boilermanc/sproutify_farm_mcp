#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
async function checkSchema() {
  console.log('Checking water_tests table structure...\n');

  const { data, error } = await supabase
    .from('water_tests')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);

    // Try without ordering
    const { data: basicData, error: basicError } = await supabase
      .from('water_tests')
      .select('*')
      .limit(0);

    if (!basicError) {
      console.log('Table exists but is empty. Cannot determine schema from empty table.');
    }
  } else {
    if (data.length > 0) {
      console.log('Columns:', Object.keys(data[0]).join(', '));
    } else {
      console.log('Table is empty. Cannot determine schema from empty table.');
    }
  }
}

checkSchema();
