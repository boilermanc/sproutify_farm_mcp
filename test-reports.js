#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

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

// Get the latest seed batch
async function getLatestSeedBatch() {
  let query = supabase
    .from('plant_batches')
    .select('*, seeds(*, crops(*))')
    .order('created_at', { ascending: false })
    .limit(1);

  if (farmId) query = query.eq('farm_id', farmId);

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching batch:', error);
    throw error;
  }

  return data[0];
}

// Generate a printable report for a seed batch
function generateBatchReport(batch) {
  const cropName = batch.seeds?.crops?.crop_name || 'Unknown Crop';
  const varietyName = batch.seeds?.variety_name || 'Unknown Variety';
  const seedDate = new Date(batch.created_at).toLocaleDateString();
  const status = batch.status || 'Unknown';
  const quantity = batch.quantity_seeded || 0;
  const trayCount = batch.tray_count || 0;

  const report = `
╔════════════════════════════════════════════════════════════════╗
║                     SEED BATCH REPORT                          ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Batch ID:         ${batch.id?.slice(0, 8) || 'N/A'}                                      ║
║  Crop:             ${cropName.padEnd(42)}║
║  Variety:          ${varietyName.padEnd(42)}║
║  Status:           ${status.toUpperCase().padEnd(42)}║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  SEEDING DETAILS                                               ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Seed Date:        ${seedDate.padEnd(42)}║
║  Quantity Seeded:  ${String(quantity).padEnd(42)}║
║  Tray Count:       ${String(trayCount).padEnd(42)}║
║  Cells Per Tray:   ${String(batch.cells_per_tray || 'N/A').padEnd(42)}║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  GROWTH STAGES                                                 ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Germination Date: ${(batch.germination_date ? new Date(batch.germination_date).toLocaleDateString() : 'Not yet').padEnd(42)}║
║  Spacing Date:     ${(batch.spacing_date ? new Date(batch.spacing_date).toLocaleDateString() : 'Not yet').padEnd(42)}║
║  Planting Date:    ${(batch.planting_date ? new Date(batch.planting_date).toLocaleDateString() : 'Not yet').padEnd(42)}║
║  Harvest Date:     ${(batch.harvest_date ? new Date(batch.harvest_date).toLocaleDateString() : 'Not yet').padEnd(42)}║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  NOTES                                                         ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
${(batch.notes || 'No notes available').split('\n').map(line => `║  ${line.padEnd(60)}║`).join('\n')}
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  Generated: ${new Date().toLocaleString().padEnd(44)}║
╚════════════════════════════════════════════════════════════════╝
`;

  return report;
}

async function test() {
  console.log('Testing Printable Report Generation\n');
  console.log('Fetching latest seed batch...\n');

  try {
    const batch = await getLatestSeedBatch();

    if (!batch) {
      console.log('No seed batches found in database.');
      return;
    }

    console.log('=== PRINTABLE SEED BATCH REPORT ===\n');
    const report = generateBatchReport(batch);
    console.log(report);

    console.log('\n=== RAW BATCH DATA ===');
    console.log(JSON.stringify(batch, null, 2));

  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error(error);
  }
}

test();
