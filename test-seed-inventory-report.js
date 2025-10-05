#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

async function getSeedInventory() {
  const { data, error } = await supabase
    .from('seeds')
    .select('*, crops(*)')
    .eq('farm_id', farmId)
    .order('quantity_on_hand', { ascending: true });

  if (error) {
    console.error('Error fetching seed inventory:', error);
    throw error;
  }

  return data;
}

function generateSeedInventoryReport(inventory) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const totalVarieties = inventory.length;
  const totalSeeds = inventory.reduce((sum, item) => sum + (item.quantity_on_hand || 0), 0);
  const lowStockItems = inventory.filter(item => item.quantity_on_hand < item.reorder_threshold);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seed Inventory Report - Sproutify Farm</title>
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

    .report-date {
      font-size: 14px;
      color: #6c757d;
    }

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

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }

    .stat-box {
      border: 1px solid #dee2e6;
      padding: 15px;
      border-radius: 4px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #22c55e;
      line-height: 1;
      margin-bottom: 5px;
    }

    .stat-label {
      font-size: 13px;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 13px;
    }

    th {
      background: #f8f9fa;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      color: #495057;
      border-bottom: 2px solid #dee2e6;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e9ecef;
      color: #212529;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover {
      background: #f8f9fa;
    }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .badge-low { background: #f8d7da; color: #721c24; }
    .badge-ok { background: #d4edda; color: #155724; }

    .alert {
      padding: 15px;
      margin: 15px 0;
      border-left: 4px solid #ffc107;
      background: #fff3cd;
      border-radius: 4px;
    }

    .alert-title {
      font-weight: 600;
      margin-bottom: 5px;
      color: #856404;
    }

    .report-footer {
      border-top: 2px solid #e9ecef;
      padding-top: 20px;
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
    }

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

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #6c757d;
      font-style: italic;
    }

    .text-danger {
      color: #dc3545;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <button onclick="window.print()" class="print-button no-print">🖨️ Print Report</button>

  <div class="page-container">
    <div class="report-header">
      <div class="farm-name">Sproutify Farm</div>
      <h1 class="report-title">Seed Inventory Report</h1>
      <div class="report-date">${currentDate}</div>
    </div>

    <div class="report-content">
      <div class="section">
        <h2>Inventory Summary</h2>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-value">${totalVarieties}</div>
            <div class="stat-label">Seed Varieties</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${totalSeeds}</div>
            <div class="stat-label">Total Seeds</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${lowStockItems.length}</div>
            <div class="stat-label">Low Stock Items</div>
          </div>
        </div>
      </div>

      ${lowStockItems.length > 0 ? `
      <div class="section">
        <div class="alert">
          <div class="alert-title">⚠️ Low Stock Alert</div>
          ${lowStockItems.length} ${lowStockItems.length === 1 ? 'item is' : 'items are'} below reorder threshold
        </div>
      </div>
      ` : ''}

      <div class="section">
        <h2>Seed Inventory Details</h2>
        <table>
          <thead>
            <tr>
              <th>Crop</th>
              <th>Variety</th>
              <th>On Hand</th>
              <th>Reorder At</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${inventory.length > 0 ? inventory.map(item => {
              const cropName = item.crops?.crop_name || 'Unknown';
              const varietyName = item.vendor_seed_name || 'Unknown';
              const onHand = item.quantity_on_hand || 0;
              const reorderAt = item.reorder_threshold || 0;
              const isLow = onHand < reorderAt;

              return `
              <tr>
                <td><strong>${cropName}</strong></td>
                <td>${varietyName}</td>
                <td ${isLow ? 'class="text-danger"' : ''}>${onHand}</td>
                <td>${reorderAt}</td>
                <td>
                  <span class="badge ${isLow ? 'badge-low' : 'badge-ok'}">
                    ${isLow ? 'Low Stock' : 'OK'}
                  </span>
                </td>
              </tr>
              `;
            }).join('') : '<tr><td colspan="5" class="empty-state">No seed inventory found</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

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
  console.log('Generating Seed Inventory Report...\n');

  try {
    const inventory = await getSeedInventory();

    if (!inventory || inventory.length === 0) {
      console.log('No seed inventory found in database.');
      return;
    }

    const html = generateSeedInventoryReport(inventory);
    const filename = 'seed-inventory-report.html';

    fs.writeFileSync(filename, html);

    console.log(`✅ Report generated successfully!`);
    console.log(`📄 File saved as: ${filename}`);
    console.log(`📊 Found ${inventory.length} seed varieties`);
    console.log(`\n🌐 Open ${filename} in your browser to view the printable report`);

  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error(error);
  }
}

test();
