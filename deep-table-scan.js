#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const farmId = '624a653c-d36b-47d6-806d-584bd6c2cfcf';

async function checkTable(name) {
  const { data, error } = await supabase.from(name).select('*').eq('farm_id', farmId).limit(1);
  if (!error && data) {
    return { exists: true, hasData: data.length > 0, columns: data.length > 0 ? Object.keys(data[0]) : [] };
  }
  return { exists: false };
}

async function deepScan() {
  console.log('🔍 Deep scanning for useful tables...\n');

  const categories = {
    'Production & Harvest': [
      'harvests',
      'harvest_logs',
      'production_logs',
      'yield_data',
      'crop_cycles'
    ],
    'Inventory & Supplies': [
      'inventory',
      'supplies',
      'equipment',
      'farm_supplies',
      'stock_levels'
    ],
    'Monitoring & Sensors': [
      'sensor_readings',
      'environment_logs',
      'climate_data',
      'monitoring_logs'
    ],
    'Planning & Schedules': [
      'planting_plans',
      'harvest_schedules',
      'crop_plans',
      'rotation_plans'
    ],
    'Issues & Alerts': [
      'issues',
      'alerts',
      'notifications',
      'farm_alerts'
    ],
    'Quality & Testing': [
      'quality_tests',
      'lab_results',
      'crop_quality'
    ],
    'Staff & Users': [
      'staff',
      'users',
      'farm_users',
      'employees'
    ],
    'Notes & Documentation': [
      'notes',
      'farm_notes',
      'observations',
      'logs'
    ],
    'Sales & Customers': [
      'sales',
      'orders',
      'customers',
      'deliveries'
    ]
  };

  for (const [category, tables] of Object.entries(categories)) {
    console.log(`\n📂 ${category}`);
    console.log('─'.repeat(50));

    for (const table of tables) {
      const result = await checkTable(table);
      if (result.exists) {
        const status = result.hasData ? '✅ HAS DATA' : '📭 empty';
        console.log(`${status} - ${table}`);
        if (result.hasData && result.columns.length > 0) {
          console.log(`   Columns: ${result.columns.slice(0, 8).join(', ')}${result.columns.length > 8 ? '...' : ''}`);
        }
      }
    }
  }
}

deepScan();
