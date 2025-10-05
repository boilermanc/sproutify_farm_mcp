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

async function testQuery() {
  console.log('Testing planting_plans table with farmId:', farmId);

  // First, see what's in the table
  console.log('\n1. Testing planting_plans table:');
  const { data: basicData, error: basicError } = await supabase
    .from('planting_plans')
    .select('*')
    .eq('farm_id', farmId)
    .limit(1);

  if (basicError) {
    console.error('Error:', basicError);
  } else {
    console.log('Success! Found', basicData.length, 'plans');
    if (basicData.length > 0) {
      console.log('Sample record:', JSON.stringify(basicData[0], null, 2));
      console.log('\nColumns:', Object.keys(basicData[0]).join(', '));
    }
  }
}

testQuery();
