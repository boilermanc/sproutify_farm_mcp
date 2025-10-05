#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const farmId = '624a653c-d36b-47d6-806d-584bd6c2cfcf';

async function checkTable(name) {
  const { data, error } = await supabase.from(name).select('*').eq('farm_id', farmId).limit(1);
  if (!error) {
    console.log(`✅ ${name} - ${data.length > 0 ? 'HAS DATA' : 'empty'}`);
    return true;
  }
  console.log(`❌ ${name}`);
  return false;
}

async function check() {
  console.log('Checking potentially useful tables:\n');

  await checkTable('harvests');
  await checkTable('harvest_logs');
  await checkTable('crops');
  await checkTable('vendors');
  await checkTable('tasks');
  await checkTable('loss_reasons');
  await checkTable('tower_types');
}

check();
