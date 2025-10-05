#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const farmId = '624a653c-d36b-47d6-806d-584bd6c2cfcf';

async function testQuery() {
  console.log('Testing plant_batches query with farmId:', farmId);

  // First, try without the crops join to see the structure
  console.log('\n1. Testing without crops join:');
  const { data: basicData, error: basicError } = await supabase
    .from('plant_batches')
    .select('*')
    .eq('farm_id', farmId)
    .limit(1);

  if (basicError) {
    console.error('Error:', basicError);
  } else {
    console.log('Success! Found', basicData.length, 'batches');
    if (basicData.length > 0) {
      console.log('Sample record:', JSON.stringify(basicData[0], null, 2));
    }
  }

  // Now try with the seeds and crops join
  console.log('\n2. Testing WITH seeds->crops join:');
  const { data, error } = await supabase
    .from('plant_batches')
    .select('*, seeds(*, crops(*))')
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Found', data.length, 'batches');
    console.log(JSON.stringify(data, null, 2));
  }
}

testQuery();
