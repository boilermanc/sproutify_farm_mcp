#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const farmId = '624a653c-d36b-47d6-806d-584bd6c2cfcf';

async function exploreTable(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('farm_id', farmId)
    .limit(1);

  if (!error) {
    console.log(`✅ ${tableName}`);
    if (data && data.length > 0) {
      console.log(`   Has data (${data.length} sample)`);
      console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
    } else {
      console.log(`   Empty (no data for this farm)`);
    }
    return true;
  }
  return false;
}

async function exploreTables() {
  console.log('Exploring database tables...\n');
  console.log('=== FARM & SETUP ===');
  await exploreTable('farms');
  await exploreTable('towers');
  await exploreTable('tower_types');

  console.log('\n=== CROPS & SEEDS ===');
  await exploreTable('crops');
  await exploreTable('seed_inventory');
  await exploreTable('seeds');

  console.log('\n=== PLANT PRODUCTION ===');
  await exploreTable('plant_batches');
  await exploreTable('seeding_plans');
  await exploreTable('harvests');
  await exploreTable('harvest_logs');

  console.log('\n=== NUTRIENTS & WATER ===');
  await exploreTable('nutrient_readings');
  await exploreTable('nutrient_tasks');
  await exploreTable('water_tests');
  await exploreTable('water_labs');

  console.log('\n=== PEST CONTROL ===');
  await exploreTable('core_spray_applications');
  await exploreTable('farm_chemicals');
  await exploreTable('chemical_registry');

  console.log('\n=== TASKS & ISSUES ===');
  await exploreTable('tasks');
  await exploreTable('farm_tasks');
  await exploreTable('issues');
  await exploreTable('alerts');

  console.log('\n=== VENDORS & INVENTORY ===');
  await exploreTable('vendors');
  await exploreTable('inventory');
  await exploreTable('supplies');

  console.log('\n=== OTHER ===');
  await exploreTable('loss_reasons');
  await exploreTable('notes');
  await exploreTable('photos');
}

exploreTables();
