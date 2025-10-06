import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qffmtkmetkfysmqmughg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZm10a21ldGtmeXNtcW11Z2hnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzAxMDQ5NywiZXhwIjoyMDcyNTg2NDk3fQ.EbrYSb-d07JI7DuH92gtbUy0nAD5FfOZ9HzLkidW2eM';
const farmId = '6f51084a-24f6-44d6-a6cf-2770e75284d1';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRomaine() {
  console.log('🔍 Checking for Romaine Lettuce growing...\n');

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

  console.log(`📦 Total plant batches: ${batches.length}\n`);

  // Filter for romaine
  const romaineBatches = batches.filter(batch =>
    batch.seeds?.crops?.crop_name?.toLowerCase().includes('romaine')
  );

  console.log(`🥬 Romaine batches found: ${romaineBatches.length}\n`);

  if (romaineBatches.length === 0) {
    console.log('No romaine lettuce found.');
    return;
  }

  // Count romaine in towers (planted/growing status)
  const romaineInTowers = romaineBatches.filter(batch =>
    batch.towers && batch.towers.tower_number &&
    (batch.status === 'planted' || batch.status === 'growing' || batch.status === 'ready_harvest')
  );

  console.log('═'.repeat(60));
  console.log(`🌱 ROMAINE GROWING IN TOWERS: ${romaineInTowers.length > 0 ? 'YES' : 'NO'}`);
  console.log('═'.repeat(60));

  if (romaineInTowers.length > 0) {
    console.log('\n📍 Romaine in Towers:\n');
    romaineInTowers.forEach(batch => {
      console.log(`  Tower ${batch.towers.tower_number}: ${batch.seeds.crops.crop_name} (${batch.status})`);
      console.log(`    Batch ID: ${batch.id}`);
      console.log(`    Seeded: ${batch.seeded_date || 'N/A'}`);
      console.log(`    Planted: ${batch.planted_date || 'N/A'}`);
      console.log('');
    });
  }

  // Show romaine in other stages
  const romaineOtherStages = romaineBatches.filter(batch =>
    !batch.towers || !batch.towers.tower_number
  );

  if (romaineOtherStages.length > 0) {
    console.log('\n📋 Romaine in Other Stages (not yet in towers):\n');
    const byStatus = {};
    romaineOtherStages.forEach(batch => {
      if (!byStatus[batch.status]) byStatus[batch.status] = 0;
      byStatus[batch.status]++;
    });
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} batches`);
    });
  }

  console.log('\n✅ Analysis complete!');
}

checkRomaine();
