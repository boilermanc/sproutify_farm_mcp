#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { SimpleSage } from './dist/services/simpleSage.js';

// Validate required environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (typeof supabaseUrl !== 'string' || typeof supabaseServiceKey !== 'string') {
  const missingVars = [];
  if (typeof supabaseUrl !== 'string') missingVars.push('SUPABASE_URL');
  if (typeof supabaseServiceKey !== 'string') missingVars.push('SUPABASE_SERVICE_KEY');
  
  console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please ensure both SUPABASE_URL and SUPABASE_SERVICE_KEY are set in your environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const farmId = '624a653c-d36b-47d6-806d-584bd6c2cfcf';

// Simulated getMCPData function matching server.ts
const getMCPData = async (toolName, params) => {
  console.log(`[getMCPData] Called with tool: ${toolName}`);

  if (toolName === 'get_plant_batches') {
    const status = params?.status;
    const limit = params?.limit || 50;

    let query = supabase
      .from('plant_batches')
      .select('*, seeds(*, crops(*))')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (farmId) query = query.eq('farm_id', farmId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) {
      console.error('[getMCPData] Error:', error);
      throw error;
    }
    console.log('[getMCPData] Success! Retrieved', data.length, 'batches');
    return JSON.stringify(data, null, 2);
  }

  if (toolName === 'get_farm_stats') {
    let towerQuery = supabase.from('towers').select('*', { count: 'exact', head: true });
    let seedQuery = supabase.from('seed_inventory').select('*', { count: 'exact', head: true });

    if (farmId) {
      towerQuery = towerQuery.eq('farm_id', farmId);
      seedQuery = seedQuery.eq('farm_id', farmId);
    }

    const { count: towerCount } = await towerQuery;
    const { count: seedCount } = await seedQuery;
    return `Farm Stats:\n- Towers: ${towerCount || 0}\n- Seeds: ${seedCount || 0}`;
  }

  if (toolName === 'get_nutrient_readings') {
    const tower_id = params?.tower_id;
    const limit = params?.limit || 50;

    let query = supabase
      .from('nutrient_readings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (farmId) query = query.eq('farm_id', farmId);
    if (tower_id) query = query.eq('tower_id', tower_id);

    const { data, error } = await query;
    if (error) {
      console.error('[getMCPData] Error:', error);
      throw error;
    }
    console.log('[getMCPData] Success! Retrieved', data.length, 'nutrient readings');
    return JSON.stringify(data, null, 2);
  }

  if (toolName === 'get_spray_logs') {
    const sprayType = params?.sprayType;
    const limit = params?.limit || 50;

    let query = supabase
      .from('core_spray_applications')
      .select('*')
      .order('application_date', { ascending: false })
      .limit(limit);

    if (farmId) query = query.eq('farm_id', farmId);
    if (sprayType) query = query.eq('spray_type', sprayType);

    const { data, error } = await query;
    if (error) {
      console.error('[getMCPData] Error:', error);
      throw error;
    }
    console.log('[getMCPData] Success! Retrieved', data.length, 'spray applications');
    return JSON.stringify(data, null, 2);
  }

  if (toolName === 'get_water_tests') {
    const limit = params?.limit || 50;

    let query = supabase
      .from('water_tests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (farmId) query = query.eq('farm_id', farmId);

    const { data, error } = await query;
    if (error) {
      console.error('[getMCPData] Error:', error);
      throw error;
    }
    console.log('[getMCPData] Success! Retrieved', data.length, 'water tests');
    return JSON.stringify(data, null, 2);
  }

  if (toolName === 'get_water_labs') {
    const { data, error } = await supabase
      .from('water_labs')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('[getMCPData] Error:', error);
      throw error;
    }
    console.log('[getMCPData] Success! Retrieved', data.length, 'water labs');
    return JSON.stringify(data, null, 2);
  }

  if (toolName === 'get_crops') {
    const status = params?.status;

    let query = supabase
      .from('crops')
      .select('*')
      .order('crop_name', { ascending: true });

    if (farmId) query = query.eq('farm_id', farmId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) {
      console.error('[getMCPData] Error:', error);
      throw error;
    }
    console.log('[getMCPData] Success! Retrieved', data.length, 'crops');
    return JSON.stringify(data, null, 2);
  }

  if (toolName === 'get_vendors') {
    const type = params?.type;
    const status = params?.status;

    let query = supabase
      .from('vendors')
      .select('*')
      .order('vendor_name', { ascending: true });

    if (farmId) query = query.eq('farm_id', farmId);
    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) {
      console.error('[getMCPData] Error:', error);
      throw error;
    }
    console.log('[getMCPData] Success! Retrieved', data.length, 'vendors');
    return JSON.stringify(data, null, 2);
  }

  if (toolName === 'get_towers') {
    const status = params?.status;
    const tower_number = params?.tower_number;

    let query = supabase
      .from('towers')
      .select('*')
      .order('tower_number', { ascending: true });

    if (farmId) query = query.eq('farm_id', farmId);
    if (status) query = query.eq('status', status);
    if (tower_number) query = query.eq('tower_number', tower_number);

    const { data, error } = await query;
    if (error) {
      console.error('[getMCPData] Error:', error);
      throw error;
    }
    console.log('[getMCPData] Success! Retrieved', data.length, 'towers');
    return JSON.stringify(data, null, 2);
  }

  if (toolName === 'get_tasks') {
    const status = params?.status || 'pending';
    const limit = params?.limit || 50;

    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (farmId) query = query.eq('farm_id', farmId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) {
      console.error('[getMCPData] Error:', error);
      throw error;
    }
    console.log('[getMCPData] Success! Retrieved', data.length, 'tasks');
    return JSON.stringify(data, null, 2);
  }

  if (toolName === 'get_planting_plans') {
    const limit = params?.limit || 50;

    let query = supabase
      .from('planting_plans')
      .select('*')
      .order('planting_date', { ascending: true })
      .limit(limit);

    if (farmId) query = query.eq('farm_id', farmId);

    const { data, error } = await query;
    if (error) {
      console.error('[getMCPData] Error:', error);
      throw error;
    }
    console.log('[getMCPData] Success! Retrieved', data.length, 'planting plans');
    return JSON.stringify(data, null, 2);
  }

  throw new Error(`Unknown tool: ${toolName}`);
};

async function test() {
  const query = process.argv[2] || "What's seeded?";
  console.log(`Testing SimpleSage with "${query}" query\n`);

  const sage = new SimpleSage();

  try {
    const response = await sage.processMessage(
      query,
      { farmName: 'Test Farm' },
      getMCPData
    );

    console.log('\n=== SUCCESS! ===');
    console.log('Sage Response:');
    console.log(response);
  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error(error);
  }
}

test();
