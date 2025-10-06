import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qffmtkmetkfysmqmughg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZm10a21ldGtmeXNtcW11Z2hnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzAxMDQ5NywiZXhwIjoyMDcyNTg2NDk3fQ.EbrYSb-d07JI7DuH92gtbUy0nAD5FfOZ9HzLkidW2eM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAllBatches() {
  console.log('🔍 Checking all plant batches (no farm filter)...\n');

  // Query all plant batches
  const { data: batches, error } = await supabase
    .from('plant_batches')
    .select('*, seeds(*, crops(*)), towers(*)')
    .limit(100);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📦 Total plant batches found: ${batches.length}\n`);

  if (batches.length === 0) {
    console.log('No plant batches found in the database.');
    return;
  }

  // Group by farm_id
  const batchesByFarm = {};
  batches.forEach(batch => {
    const farmId = batch.farm_id || 'no-farm-id';
    if (!batchesByFarm[farmId]) {
      batchesByFarm[farmId] = [];
    }
    batchesByFarm[farmId].push(batch);
  });

  console.log('Batches grouped by farm_id:');
  Object.entries(batchesByFarm).forEach(([farmId, batches]) => {
    console.log(`\nFarm ID: ${farmId} (${batches.length} batches)`);

    const towersWithPlants = new Set();
    batches.forEach(batch => {
      if (batch.towers && batch.towers.tower_number) {
        towersWithPlants.add(batch.towers.tower_number);
      }
      console.log(`  - ${batch.seeds?.crops?.crop_name || 'Unknown crop'} (${batch.status}) ${batch.towers ? `[Tower ${batch.towers.tower_number}]` : '[No tower]'}`);
    });

    console.log(`  🌱 Towers with plants: ${towersWithPlants.size} (${Array.from(towersWithPlants).sort((a,b) => a-b).join(', ')})`);
  });

  console.log('\n✅ Test completed successfully!');
}

testAllBatches();
