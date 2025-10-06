import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qffmtkmetkfysmqmughg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZm10a21ldGtmeXNtcW11Z2hnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzAxMDQ5NywiZXhwIjoyMDcyNTg2NDk3fQ.EbrYSb-d07JI7DuH92gtbUy0nAD5FfOZ9HzLkidW2eM';
const farmId = '097991c7-b481-4aeb-affe-397c75fe465d';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTowerCount() {
  console.log('🔍 Testing get_plant_batches with tower information...\n');

  // Query plant batches with tower data
  const { data: batches, error } = await supabase
    .from('plant_batches')
    .select('*, seeds(*, crops(*)), towers(*)')
    .eq('farm_id', farmId)
    .limit(100);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📦 Total plant batches found: ${batches.length}\n`);

  if (batches.length === 0) {
    console.log('No plant batches found.');
    return;
  }

  // Count unique towers
  const towersWithPlants = new Map();

  batches.forEach(batch => {
    console.log(`\nBatch ID: ${batch.id}`);
    console.log(`  Status: ${batch.status}`);
    console.log(`  Crop: ${batch.seeds?.crops?.crop_name || 'Unknown'}`);
    console.log(`  Tower info:`, batch.towers);

    if (batch.towers && batch.towers.tower_number) {
      const towerNum = batch.towers.tower_number;
      if (!towersWithPlants.has(towerNum)) {
        towersWithPlants.set(towerNum, []);
      }
      towersWithPlants.get(towerNum).push({
        crop: batch.seeds?.crops?.crop_name || 'Unknown',
        status: batch.status
      });
    }
  });

  const towerCount = towersWithPlants.size;
  const towerList = Array.from(towersWithPlants.keys()).sort((a, b) => a - b);

  console.log('\n' + '='.repeat(60));
  console.log(`🌱 TOWERS WITH GROWING PLANTS: ${towerCount}`);
  console.log(`Tower numbers: ${towerList.join(', ')}`);
  console.log('='.repeat(60));

  console.log('\n📊 Details by Tower:\n');
  towerList.forEach(towerNum => {
    const crops = towersWithPlants.get(towerNum);
    console.log(`Tower ${towerNum}:`);
    crops.forEach(crop => {
      console.log(`  - ${crop.crop} (${crop.status})`);
    });
  });

  console.log('\n✅ Test completed successfully!');
}

testTowerCount();
