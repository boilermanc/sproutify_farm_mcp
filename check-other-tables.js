#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_KEY');

  console.error(`Error: Missing required environment variable(s): ${missing.join(', ')}`);
  console.error('Please ensure these variables are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const farmId = '624a653c-d36b-47d6-806d-584bd6c2cfcf';

async function check(name) {
  const { data, error } = await supabase.from(name).select('*').eq('farm_id', farmId).limit(1);
  if (error) {
    console.error(`❌ ${name} - ERROR: ${error.message || error}`);
    if (error.code || error.details) {
      console.error(`   Code: ${error.code}, Details: ${error.details || 'none'}`);
    }
    return false;
  }
  if (data) {
    console.log(`✅ ${name} - ${data.length > 0 ? 'HAS DATA' : 'empty'}`);
    if (data.length > 0) {
      console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
    }
    return true;
  }
  return false;
}

async function scan() {
  console.log('Checking additional tables:\n');

  // Plans and schedules we found
  await check('planting_plans');
  await check('spacing_plans');

  // Loss tracking
  await check('loss_reasons');
  await check('spacing_loss_reasons');
  await check('planting_loss_reasons');

  // Nutrient/chemical
  await check('nutrient_schedules');
  await check('fertilizer_applications');

  // Categories and lookups
  await check('crop_categories');
  await check('package_units');
  await check('measurement_units');

  // Growth tracking
  await check('growth_observations');
  await check('crop_observations');

  console.log('\nChecking non-farm_id tables (global lookups):');

  const globalTables = [
    'chemical_registry'
  ];

  for (const table of globalTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error && data) {
      console.log(`✅ ${table} - ${data.length > 0 ? 'HAS DATA' : 'empty'} (global lookup)`);
    }
  }
}

scan();
