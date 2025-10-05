#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

// Generate HTML printable report
function generateHTMLReport(batch) {
  const cropName = batch.seeds?.crops?.crop_name || 'Unknown Crop';
  const varietyName = batch.seeds?.vendor_seed_name || 'Unknown Variety';
  const seedDate = new Date(batch.seed_date || batch.created_at).toLocaleDateString();
  const status = batch.status || 'Unknown';
  const plantsSeeded = batch.plants_seeded || 0;
  const expectedSpacingDate = batch.expected_spacing_date ? new Date(batch.expected_spacing_date).toLocaleDateString() : 'Not yet';
  const expectedPlantingDate = batch.expected_planting_date ? new Date(batch.expected_planting_date).toLocaleDateString() : 'Not yet';
  const expectedHarvestDate = batch.expected_harvest_date ? new Date(batch.expected_harvest_date).toLocaleDateString() : 'Not yet';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seed Batch Report - ${cropName}</title>
  <style>
    @media print {
      .no-print { display: none; }
      body { margin: 0; padding: 0; }
      .page-container {
        width: 100%;
        max-width: none;
        margin: 0;
        box-shadow: none;
      }
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8f9fa;
      color: #212529;
      line-height: 1.6;
    }

    .page-container {
      max-width: 8.5in;
      margin: 0 auto;
      background: white;
      padding: 0.75in;
    }

    /* Header */
    .report-header {
      border-bottom: 3px solid #22c55e;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .farm-name {
      font-size: 14px;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    .report-title {
      font-size: 28px;
      font-weight: 600;
      color: #212529;
      margin-bottom: 8px;
    }

    .report-subtitle {
      font-size: 14px;
      color: #6c757d;
    }

    /* Content */
    .report-content {
      margin: 30px 0;
    }

    .section {
      margin-bottom: 35px;
    }

    .section h2 {
      font-size: 18px;
      font-weight: 600;
      color: #212529;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e9ecef;
    }

    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 12px;
      margin-bottom: 10px;
    }

    .info-label {
      font-weight: 600;
      color: #495057;
      font-size: 14px;
    }

    .info-value {
      color: #212529;
      font-size: 14px;
    }

    /* Status badges */
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .badge-seeded { background: #dbeafe; color: #1e40af; }
    .badge-germinating { background: #fce7f3; color: #9f1239; }
    .badge-growing { background: #fff3cd; color: #856404; }
    .badge-ready_harvest { background: #d4edda; color: #155724; }
    .badge-harvested { background: #e9ecef; color: #495057; }

    /* Timeline */
    .timeline {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-top: 20px;
      padding: 20px 0;
      border-top: 1px solid #e9ecef;
    }

    .timeline-item {
      text-align: center;
      padding: 15px;
      border: 1px solid #dee2e6;
      border-radius: 4px;
    }

    .timeline-item .label {
      font-size: 12px;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .timeline-item .date {
      font-weight: 600;
      color: #22c55e;
      font-size: 14px;
    }

    /* Notes */
    .notes {
      background: #f8f9fa;
      padding: 15px;
      border-left: 4px solid #22c55e;
      font-style: italic;
      color: #495057;
      border-radius: 2px;
    }

    /* Footer */
    .report-footer {
      border-top: 2px solid #e9ecef;
      padding-top: 20px;
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
    }

    /* Print Button */
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #22c55e;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
      transition: all 0.2s;
    }

    .print-button:hover {
      background: #16a34a;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
    }
  </style>
</head>
<body>
  <button onclick="window.print()" class="print-button no-print">🖨️ Print Report</button>

  <div class="page-container">
    <!-- Header -->
    <div class="report-header">
      <div class="farm-name">Sproutify Farm</div>
      <h1 class="report-title">Seed Batch Report</h1>
      <div class="report-subtitle">Batch ID: ${batch.id?.slice(0, 8) || 'N/A'}</div>
    </div>

    <!-- Content -->
    <div class="report-content">
      <div class="section">
        <h2>Crop Information</h2>
        <div class="info-grid">
          <div class="info-label">Crop:</div>
          <div class="info-value">${cropName}</div>

          <div class="info-label">Variety:</div>
          <div class="info-value">${varietyName}</div>

          <div class="info-label">Status:</div>
          <div class="info-value">
            <span class="badge badge-${status.toLowerCase()}">${status}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Seeding Details</h2>
        <div class="info-grid">
          <div class="info-label">Seed Date:</div>
          <div class="info-value">${seedDate}</div>

          <div class="info-label">Plants Seeded:</div>
          <div class="info-value">${plantsSeeded}</div>

          <div class="info-label">Seeds Used:</div>
          <div class="info-value">${batch.seeds_used || 0}</div>

          <div class="info-label">Tray Tag:</div>
          <div class="info-value">${batch.seeding_tray_tag || 'N/A'}</div>
        </div>
      </div>

      <div class="section">
        <h2>Growth Timeline</h2>
        <div class="timeline">
          <div class="timeline-item">
            <div class="label">Seeded</div>
            <div class="date">${seedDate}</div>
          </div>
          <div class="timeline-item">
            <div class="label">Spacing</div>
            <div class="date">${expectedSpacingDate}</div>
          </div>
          <div class="timeline-item">
            <div class="label">Planting</div>
            <div class="date">${expectedPlantingDate}</div>
          </div>
          <div class="timeline-item">
            <div class="label">Harvest</div>
            <div class="date">${expectedHarvestDate}</div>
          </div>
        </div>
      </div>

      ${batch.seeds?.notes ? `
      <div class="section">
        <h2>Notes</h2>
        <div class="notes">${batch.seeds.notes}</div>
      </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div class="report-footer">
      Powered by Sproutify Sage © 2025
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

async function test() {
  console.log('Generating HTML Printable Report...\n');

  try {
    const batch = await getLatestSeedBatch();

    if (!batch) {
      console.log('No seed batches found in database.');
      return;
    }

    const html = generateHTMLReport(batch);
    const filename = 'batch-report.html';

    fs.writeFileSync(filename, html);

    console.log(`✅ Report generated successfully!`);
    console.log(`📄 File saved as: ${filename}`);
    console.log(`\n🌐 Open ${filename} in your browser to view the printable report`);

  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error(error);
  }
}

test();
