import { SupabaseClient } from '@supabase/supabase-js';

export interface ReportContext {
  farmId: string;
  farmName: string;
  userEmail: string;
  reportType: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export class ReportGenerator {
  constructor(private supabase: SupabaseClient) {}

  // Generate HTML template for all reports
  private generateHTMLTemplate(title: string, content: string, context: ReportContext): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${context.farmName}</title>
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

    .report-date {
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

    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #212529;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e9ecef;
    }

    .section-subtitle {
      font-size: 16px;
      font-weight: 500;
      color: #495057;
      margin: 20px 0 10px 0;
    }

    /* Stats Grid */
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

    /* Tables */
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

    .badge-empty { background: #e9ecef; color: #495057; }
    .badge-growing { background: #fff3cd; color: #856404; }
    .badge-ready { background: #d4edda; color: #155724; }
    .badge-maintenance { background: #f8d7da; color: #721c24; }
    .badge-alert { background: #fff3cd; color: #856404; }
    .badge-seeded { background: #dbeafe; color: #1e40af; }
    .badge-germinating { background: #fce7f3; color: #9f1239; }
    .badge-spacing { background: #e9d5ff; color: #6b21a8; }

    /* Legacy status badge support */
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .status-empty { background: #e9ecef; color: #495057; }
    .status-growing { background: #fff3cd; color: #856404; }
    .status-ready_harvest { background: #d4edda; color: #155724; }
    .status-maintenance { background: #f8d7da; color: #721c24; }
    .status-seeded { background: #dbeafe; color: #1e40af; }
    .status-germinating { background: #fce7f3; color: #9f1239; }
    .status-spacing { background: #e9d5ff; color: #6b21a8; }

    /* Legacy stat grid support */
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }

    .stat-card {
      border: 1px solid #dee2e6;
      padding: 15px;
      border-radius: 4px;
    }

    /* Legacy report-section support */
    .report-section {
      margin-bottom: 35px;
    }

    .report-section h2 {
      font-size: 18px;
      font-weight: 600;
      color: #212529;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e9ecef;
    }

    /* Alerts */
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

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #6c757d;
      font-style: italic;
    }

    /* Utility classes */
    .text-muted { color: #6c757d; }
    .text-success { color: #22c55e; }
    .text-danger { color: #dc3545; }
    .text-warning { color: #ffc107; }
    .font-bold { font-weight: 600; }
    .text-center { text-align: center; }
    .mb-0 { margin-bottom: 0; }
    .mb-1 { margin-bottom: 10px; }
    .mb-2 { margin-bottom: 20px; }
    .mt-0 { margin-top: 0; }
    .mt-1 { margin-top: 10px; }
    .mt-2 { margin-top: 20px; }
  </style>
</head>
<body>
  <button onclick="window.print()" class="print-button no-print">🖨️ Print Report</button>

  <div class="page-container">
    <!-- Header -->
    <div class="report-header">
      <div class="farm-name">${context.farmName}</div>
      <h1 class="report-title">${title}</h1>
      <div class="report-date">${currentDate}</div>
    </div>

    <!-- Content -->
    <div class="report-content">
      ${content}
    </div>

    <!-- Footer -->
    <div class="report-footer">
      Powered by Sproutify Sage © 2025
    </div>
  </div>
</body>
</html>`;
  }

  // Tower Status Report
  async generateTowerStatusReport(context: ReportContext): Promise<string> {
    const { data: towers, error } = await this.supabase
      .from('towers')
      .select(`
        *,
        plant_batches (
          id,
          quantity,
          status,
          seeded_date,
          crop_id,
          crops:crop_id (name, variety, days_to_harvest)
        )
      `)
      .eq('farm_id', context.farmId)
      .order('position');

    if (error) throw error;

    const statusCounts = towers?.reduce((acc, tower) => {
      acc[tower.status] = (acc[tower.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const content = `
      <div class="report-section">
        <h2>Tower Utilization Summary</h2>
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-value">${towers?.length || 0}</div>
            <div class="stat-label">Total Towers</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${statusCounts['growing'] || 0}</div>
            <div class="stat-label">Currently Growing</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${statusCounts['empty'] || 0}</div>
            <div class="stat-label">Empty Towers</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${statusCounts['ready_harvest'] || 0}</div>
            <div class="stat-label">Ready to Harvest</div>
          </div>
        </div>
      </div>
      
      <div class="report-section">
        <h2>Tower Details</h2>
        <table>
          <thead>
            <tr>
              <th>Position</th>
              <th>Status</th>
              <th>Crop</th>
              <th>Quantity</th>
              <th>Planted Date</th>
              <th>Est. Harvest</th>
            </tr>
          </thead>
          <tbody>
            ${towers?.map(tower => `
              <tr>
                <td><strong>${tower.position}</strong></td>
                <td><span class="status-badge status-${tower.status}">${tower.status.replace('_', ' ')}</span></td>
                <td>${tower.plant_batches?.crops ? `${tower.plant_batches.crops.name} - ${tower.plant_batches.crops.variety}` : '-'}</td>
                <td>${tower.plant_batches?.quantity || '-'}</td>
                <td>${tower.plant_batches?.seeded_date ? new Date(tower.plant_batches.seeded_date).toLocaleDateString() : '-'}</td>
                <td>${tower.plant_batches?.seeded_date && tower.plant_batches?.crops?.days_to_harvest ? 
                  new Date(new Date(tower.plant_batches.seeded_date).getTime() + tower.plant_batches.crops.days_to_harvest * 24 * 60 * 60 * 1000).toLocaleDateString() : 
                  '-'}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty-state">No towers found</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    return this.generateHTMLTemplate('Tower Status Report', content, context);
  }

  // Seed Inventory Report
  async generateSeedInventoryReport(context: ReportContext): Promise<string> {
    const { data: seeds, error } = await this.supabase
      .from('seeds')
      .select(`
        *,
        crops:crop_id (name, variety, category),
        vendors:vendor_id (name, contact_email, contact_phone)
      `)
      .eq('farm_id', context.farmId)
      .order('crops(name)');

    if (error) throw error;

    const lowStockSeeds = seeds?.filter(seed => seed.current_quantity < 100) || [];
    const totalValue = seeds?.reduce((sum, seed) => sum + (seed.current_quantity * (seed.cost_per_unit || 0)), 0) || 0;

    const content = `
      <div class="report-section">
        <h2>Inventory Summary</h2>
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-value">${seeds?.length || 0}</div>
            <div class="stat-label">Seed Varieties</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${seeds?.reduce((sum, seed) => sum + seed.current_quantity, 0) || 0}</div>
            <div class="stat-label">Total Seeds</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">$${totalValue.toFixed(2)}</div>
            <div class="stat-label">Inventory Value</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${lowStockSeeds.length}</div>
            <div class="stat-label">Low Stock Items</div>
          </div>
        </div>
      </div>
      
      <div class="report-section">
        <h2>Seed Inventory Details</h2>
        <table>
          <thead>
            <tr>
              <th>Crop</th>
              <th>Category</th>
              <th>Current Qty</th>
              <th>Initial Qty</th>
              <th>Unit Cost</th>
              <th>Total Value</th>
              <th>Vendor</th>
              <th>Lot #</th>
            </tr>
          </thead>
          <tbody>
            ${seeds?.map(seed => `
              <tr>
                <td><strong>${seed.crops?.name} - ${seed.crops?.variety}</strong></td>
                <td>${seed.crops?.category || '-'}</td>
                <td style="${seed.current_quantity < 100 ? 'color: #dc2626; font-weight: bold;' : ''}">${seed.current_quantity}</td>
                <td>${seed.initial_quantity}</td>
                <td>$${seed.cost_per_unit?.toFixed(2) || '0.00'}</td>
                <td>$${(seed.current_quantity * (seed.cost_per_unit || 0)).toFixed(2)}</td>
                <td>${seed.vendors?.name || '-'}</td>
                <td>${seed.lot_number || '-'}</td>
              </tr>
            `).join('') || '<tr><td colspan="8" class="empty-state">No seeds in inventory</td></tr>'}
          </tbody>
        </table>
      </div>
      
      ${lowStockSeeds.length > 0 ? `
      <div class="report-section">
        <h2>⚠️ Low Stock Alert</h2>
        <table>
          <thead>
            <tr>
              <th>Crop</th>
              <th>Current Quantity</th>
              <th>Vendor</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            ${lowStockSeeds.map(seed => `
              <tr>
                <td><strong>${seed.crops?.name} - ${seed.crops?.variety}</strong></td>
                <td style="color: #dc2626; font-weight: bold;">${seed.current_quantity}</td>
                <td>${seed.vendors?.name || '-'}</td>
                <td>${seed.vendors?.contact_email || seed.vendors?.contact_phone || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    `;

    return this.generateHTMLTemplate('Seed Inventory Report', content, context);
  }

  // Weekly Planning Report
  async generateWeeklyPlanningReport(context: ReportContext): Promise<string> {
    const startDate = context.dateRange?.start || new Date().toISOString();
    const endDate = context.dateRange?.end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: seedingPlans } = await this.supabase
      .from('seeding_plans')
      .select(`
        *,
        crops:crop_id (name, variety)
      `)
      .eq('farm_id', context.farmId)
      .gte('seeding_date', startDate)
      .lte('seeding_date', endDate)
      .order('seeding_date');

    const { data: spacingPlans } = await this.supabase
      .from('spacing_plans')
      .select(`
        *,
        plant_batches (
          crop_id,
          crops:crop_id (name, variety)
        )
      `)
      .eq('farm_id', context.farmId)
      .gte('spacing_date', startDate)
      .lte('spacing_date', endDate)
      .order('spacing_date');

    const content = `
      <div class="report-section">
        <h2>Week at a Glance</h2>
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-value">${seedingPlans?.length || 0}</div>
            <div class="stat-label">Seeding Activities</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${spacingPlans?.length || 0}</div>
            <div class="stat-label">Spacing Activities</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${seedingPlans?.reduce((sum, plan) => sum + plan.quantity, 0) || 0}</div>
            <div class="stat-label">Total Seeds to Plant</div>
          </div>
        </div>
      </div>
      
      <div class="report-section">
        <h2>Seeding Schedule</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Crop</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${seedingPlans?.map(plan => `
              <tr>
                <td><strong>${new Date(plan.seeding_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong></td>
                <td>${plan.crops?.name} - ${plan.crops?.variety}</td>
                <td>${plan.quantity}</td>
                <td><span class="status-badge status-${plan.completed ? 'ready_harvest' : 'growing'}">${plan.completed ? 'Completed' : 'Pending'}</span></td>
                <td>${plan.notes || '-'}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="empty-state">No seeding activities planned</td></tr>'}
          </tbody>
        </table>
      </div>
      
      ${spacingPlans && spacingPlans.length > 0 ? `
      <div class="report-section">
        <h2>Spacing Schedule</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Crop</th>
              <th>From Tray</th>
              <th>To Tray</th>
              <th>Quantity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${spacingPlans.map(plan => `
              <tr>
                <td><strong>${new Date(plan.spacing_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong></td>
                <td>${plan.plant_batches?.crops?.name} - ${plan.plant_batches?.crops?.variety || '-'}</td>
                <td>${plan.from_tray}</td>
                <td>${plan.to_tray}</td>
                <td>${plan.quantity}</td>
                <td><span class="status-badge status-${plan.completed ? 'ready_harvest' : 'growing'}">${plan.completed ? 'Completed' : 'Pending'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    `;

    return this.generateHTMLTemplate('Weekly Planning Report', content, context);
  }

  // Harvest Report
  async generateHarvestReport(context: ReportContext): Promise<string> {
    const { data: readyTowers } = await this.supabase
      .from('towers')
      .select(`
        *,
        plant_batches (
          id,
          quantity,
          seeded_date,
          planted_date,
          crop_id,
          crops:crop_id (name, variety, days_to_harvest)
        )
      `)
      .eq('farm_id', context.farmId)
      .eq('status', 'ready_harvest')
      .order('position');

    const { data: upcomingHarvests } = await this.supabase
      .from('plant_batches')
      .select(`
        *,
        crops:crop_id (name, variety, days_to_harvest),
        towers:tower_id (position)
      `)
      .eq('farm_id', context.farmId)
      .eq('status', 'planted')
      .not('planted_date', 'is', null)
      .order('planted_date');

    // Calculate upcoming harvests based on days_to_harvest
    const upcoming = upcomingHarvests?.map(batch => {
      const harvestDate = new Date(batch.planted_date);
      harvestDate.setDate(harvestDate.getDate() + (batch.crops?.days_to_harvest || 0));
      return {
        ...batch,
        estimated_harvest_date: harvestDate
      };
    }).filter(batch => {
      const daysUntilHarvest = Math.ceil((batch.estimated_harvest_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntilHarvest > 0 && daysUntilHarvest <= 14; // Next 2 weeks
    }).sort((a, b) => a.estimated_harvest_date.getTime() - b.estimated_harvest_date.getTime());

    const content = `
      <div class="report-section">
        <h2>Harvest Overview</h2>
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-value">${readyTowers?.length || 0}</div>
            <div class="stat-label">Towers Ready Now</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${upcoming?.length || 0}</div>
            <div class="stat-label">Upcoming (14 days)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${readyTowers?.reduce((sum, t) => sum + (t.plant_batches?.quantity || 0), 0) || 0}</div>
            <div class="stat-label">Plants Ready</div>
          </div>
        </div>
      </div>
      
      <div class="report-section">
        <h2>🟢 Ready to Harvest Now</h2>
        ${readyTowers && readyTowers.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Tower</th>
              <th>Crop</th>
              <th>Quantity</th>
              <th>Planted Date</th>
              <th>Days in Tower</th>
            </tr>
          </thead>
          <tbody>
            ${readyTowers.map(tower => {
              const daysInTower = tower.plant_batches?.planted_date ? 
                Math.floor((Date.now() - new Date(tower.plant_batches.planted_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
              return `
              <tr>
                <td><strong>${tower.position}</strong></td>
                <td>${tower.plant_batches?.crops?.name} - ${tower.plant_batches?.crops?.variety}</td>
                <td>${tower.plant_batches?.quantity}</td>
                <td>${tower.plant_batches?.planted_date ? new Date(tower.plant_batches.planted_date).toLocaleDateString() : '-'}</td>
                <td>${daysInTower} days</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ` : '<div class="empty-state">No towers ready for harvest</div>'}
      </div>
      
      <div class="report-section">
        <h2>📅 Upcoming Harvests (Next 14 Days)</h2>
        ${upcoming && upcoming.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Est. Harvest Date</th>
              <th>Days Until</th>
              <th>Tower</th>
              <th>Crop</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${upcoming.map(batch => {
              const daysUntil = Math.ceil((batch.estimated_harvest_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return `
              <tr>
                <td><strong>${batch.estimated_harvest_date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong></td>
                <td>${daysUntil} days</td>
                <td>${batch.towers?.position || '-'}</td>
                <td>${batch.crops?.name} - ${batch.crops?.variety}</td>
                <td>${batch.quantity}</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ` : '<div class="empty-state">No upcoming harvests in the next 14 days</div>'}
      </div>
    `;

    return this.generateHTMLTemplate('Harvest Report', content, context);
  }

  // Production Summary Report
  async generateProductionSummaryReport(context: ReportContext): Promise<string> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Get recent harvests
    const { data: recentHarvests } = await this.supabase
      .from('plant_batches')
      .select(`
        *,
        crops:crop_id (name, variety, category)
      `)
      .eq('farm_id', context.farmId)
      .eq('status', 'harvested')
      .gte('harvested_date', thirtyDaysAgo);

    // Get active batches
    const { data: activeBatches } = await this.supabase
      .from('plant_batches')
      .select(`
        *,
        crops:crop_id (name, variety, category)
      `)
      .eq('farm_id', context.farmId)
      .in('status', ['seeded', 'germinating', 'spacing', 'ready_to_plant', 'planted']);

    // Group by crop category
    const productionByCategory = recentHarvests?.reduce((acc, batch) => {
      const category = batch.crops?.category || 'Other';
      if (!acc[category]) {
        acc[category] = { count: 0, yield: 0 };
      }
      acc[category].count++;
      acc[category].yield += batch.yield_amount || 0;
      return acc;
    }, {} as Record<string, { count: number; yield: number }>);

    const totalYield = recentHarvests?.reduce((sum, batch) => sum + (batch.yield_amount || 0), 0) || 0;

    const content = `
      <div class="report-section">
        <h2>30-Day Production Summary</h2>
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-value">${recentHarvests?.length || 0}</div>
            <div class="stat-label">Batches Harvested</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${totalYield}</div>
            <div class="stat-label">Total Yield (units)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${activeBatches?.length || 0}</div>
            <div class="stat-label">Active Batches</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${Object.keys(productionByCategory || {}).length}</div>
            <div class="stat-label">Crop Categories</div>
          </div>
        </div>
      </div>
      
      <div class="report-section">
        <h2>Production by Category</h2>
        ${productionByCategory && Object.keys(productionByCategory).length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Batches Harvested</th>
              <th>Total Yield</th>
              <th>Avg Yield/Batch</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(productionByCategory).map(([category, data]) => {
              const typedData = data as { count: number; yield: number };
              return `
              <tr>
                <td><strong>${category}</strong></td>
                <td>${typedData.count}</td>
                <td>${typedData.yield}</td>
                <td>${(typedData.yield / typedData.count).toFixed(1)}</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ` : '<div class="empty-state">No production data for the last 30 days</div>'}
      </div>
      
      <div class="report-section">
        <h2>Active Production Pipeline</h2>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            ${['seeded', 'germinating', 'spacing', 'ready_to_plant', 'planted'].map(status => {
              const count = activeBatches?.filter(b => b.status === status).length || 0;
              return `
              <tr>
                <td><span class="status-badge status-${status}">${status.replace('_', ' ')}</span></td>
                <td>${count}</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    return this.generateHTMLTemplate('Production Summary Report', content, context);
  }

  // Spray Applications Report
  async generateSprayApplicationsReport(context: ReportContext): Promise<string> {
    const startDate = context.dateRange?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = context.dateRange?.end || new Date().toISOString();

    const { data: sprayLogs, error } = await this.supabase
      .from('core_spray_applications')
      .select('*')
      .eq('farm_id', context.farmId)
      .gte('application_date', startDate)
      .lte('application_date', endDate)
      .order('application_date', { ascending: false });

    if (error) throw error;

    const totalApplications = sprayLogs?.length || 0;
    const sprayTypes = sprayLogs?.reduce((acc, log) => {
      acc[log.spray_type] = (acc[log.spray_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const content = `
      <div class="section">
        <h2>Application Summary</h2>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-value">${totalApplications}</div>
            <div class="stat-label">Total Applications</div>
          </div>
          ${Object.entries(sprayTypes).map(([type, count]) => `
          <div class="stat-box">
            <div class="stat-value">${count}</div>
            <div class="stat-label">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
          </div>
          `).join('')}
        </div>
      </div>

      <div class="section">
        <h2>Application History</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Product</th>
              <th>Rate</th>
              <th>Target</th>
              <th>Applied By</th>
            </tr>
          </thead>
          <tbody>
            ${sprayLogs && sprayLogs.length > 0 ? sprayLogs.map(log => `
              <tr>
                <td><strong>${new Date(log.application_date).toLocaleDateString()}</strong></td>
                <td><span class="badge badge-${log.spray_type}">${log.spray_type}</span></td>
                <td>${log.product_name || '-'}</td>
                <td>${log.application_rate || '-'}</td>
                <td>${log.target_pest || log.target_area || '-'}</td>
                <td>${log.applied_by || '-'}</td>
              </tr>
            `).join('') : '<tr><td colspan="6" class="empty-state">No spray applications in selected period</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    return this.generateHTMLTemplate('Spray Applications Report', content, context);
  }

  // pH and EC Readings Report
  async generateNutrientReadingsReport(context: ReportContext): Promise<string> {
    const startDate = context.dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = context.dateRange?.end || new Date().toISOString();

    const { data: readings, error } = await this.supabase
      .from('nutrient_readings')
      .select('*')
      .eq('farm_id', context.farmId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const avgPH = readings?.reduce((sum, r) => sum + (r.ph_level || 0), 0) / (readings?.length || 1);
    const avgEC = readings?.reduce((sum, r) => sum + (r.ec_level || 0), 0) / (readings?.length || 1);
    const outOfRangePH = readings?.filter(r => r.ph_level < 5.5 || r.ph_level > 6.5).length || 0;
    const totalReadings = readings?.length || 0;

    const content = `
      <div class="section">
        <h2>Reading Summary</h2>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-value">${totalReadings}</div>
            <div class="stat-label">Total Readings</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${avgPH.toFixed(2)}</div>
            <div class="stat-label">Avg pH</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${avgEC.toFixed(2)}</div>
            <div class="stat-label">Avg EC</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${outOfRangePH}</div>
            <div class="stat-label">Out of Range pH</div>
          </div>
        </div>
      </div>

      ${outOfRangePH > 0 ? `
      <div class="section">
        <div class="alert">
          <div class="alert-title">⚠️ pH Alert</div>
          ${outOfRangePH} readings outside optimal range (5.5-6.5)
        </div>
      </div>
      ` : ''}

      <div class="section">
        <h2>Reading History</h2>
        <table>
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Tower</th>
              <th>pH Level</th>
              <th>EC Level</th>
              <th>Temperature</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${readings && readings.length > 0 ? readings.map(reading => {
              const isOutOfRange = reading.ph_level < 5.5 || reading.ph_level > 6.5;
              return `
              <tr>
                <td><strong>${new Date(reading.created_at).toLocaleString()}</strong></td>
                <td>${reading.tower_id || 'N/A'}</td>
                <td ${isOutOfRange ? 'class="text-danger"' : ''}>${reading.ph_level?.toFixed(2) || '-'}</td>
                <td>${reading.ec_level?.toFixed(2) || '-'}</td>
                <td>${reading.water_temp ? reading.water_temp + '°F' : '-'}</td>
                <td>${reading.notes || '-'}</td>
              </tr>
              `;
            }).join('') : '<tr><td colspan="6" class="empty-state">No readings in selected period</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    return this.generateHTMLTemplate('pH & EC Readings Report', content, context);
  }

  // Water Test Results Report
  async generateWaterTestReport(context: ReportContext): Promise<string> {
    const { data: waterTests, error } = await this.supabase
      .from('water_tests')
      .select(`
        *,
        water_labs:lab_id (name, contact_email)
      `)
      .eq('farm_id', context.farmId)
      .order('test_date', { ascending: false });

    if (error) throw error;

    const totalTests = waterTests?.length || 0;
    const latestTest = waterTests?.[0];

    const content = `
      <div class="section">
        <h2>Test Summary</h2>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-value">${totalTests}</div>
            <div class="stat-label">Total Tests</div>
          </div>
          ${latestTest ? `
          <div class="stat-box">
            <div class="stat-value">${new Date(latestTest.test_date).toLocaleDateString()}</div>
            <div class="stat-label">Latest Test</div>
          </div>
          ` : ''}
        </div>
      </div>

      <div class="section">
        <h2>Water Test History</h2>
        <table>
          <thead>
            <tr>
              <th>Test Date</th>
              <th>Lab</th>
              <th>pH</th>
              <th>TDS</th>
              <th>Hardness</th>
              <th>Iron</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${waterTests && waterTests.length > 0 ? waterTests.map(test => `
              <tr>
                <td><strong>${new Date(test.test_date).toLocaleDateString()}</strong></td>
                <td>${test.water_labs?.name || '-'}</td>
                <td>${test.ph_level?.toFixed(2) || '-'}</td>
                <td>${test.tds_ppm || '-'}</td>
                <td>${test.hardness_ppm || '-'}</td>
                <td>${test.iron_ppm || '-'}</td>
                <td>${test.notes || '-'}</td>
              </tr>
            `).join('') : '<tr><td colspan="7" class="empty-state">No water tests found</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    return this.generateHTMLTemplate('Water Test Results Report', content, context);
  }

  // Vendor List Report
  async generateVendorListReport(context: ReportContext): Promise<string> {
    const { data: vendors, error } = await this.supabase
      .from('vendors')
      .select('*')
      .eq('farm_id', context.farmId)
      .order('vendor_name', { ascending: true });

    if (error) throw error;

    const totalVendors = vendors?.length || 0;
    const vendorsByType = vendors?.reduce((acc, vendor) => {
      acc[vendor.type] = (acc[vendor.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const content = `
      <div class="section">
        <h2>Vendor Summary</h2>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-value">${totalVendors}</div>
            <div class="stat-label">Total Vendors</div>
          </div>
          ${Object.entries(vendorsByType).map(([type, count]) => `
          <div class="stat-box">
            <div class="stat-value">${count}</div>
            <div class="stat-label">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
          </div>
          `).join('')}
        </div>
      </div>

      <div class="section">
        <h2>Vendor Directory</h2>
        <table>
          <thead>
            <tr>
              <th>Vendor Name</th>
              <th>Type</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${vendors && vendors.length > 0 ? vendors.map(vendor => `
              <tr>
                <td><strong>${vendor.vendor_name}</strong></td>
                <td><span class="badge badge-${vendor.type}">${vendor.type}</span></td>
                <td>${vendor.contact_name || '-'}</td>
                <td>${vendor.contact_email || '-'}</td>
                <td>${vendor.contact_phone || '-'}</td>
                <td><span class="badge badge-${vendor.status === 'active' ? 'ok' : 'empty'}">${vendor.status}</span></td>
              </tr>
            `).join('') : '<tr><td colspan="6" class="empty-state">No vendors found</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    return this.generateHTMLTemplate('Vendor List Report', content, context);
  }

  // Chemical Inventory Report
  async generateChemicalInventoryReport(context: ReportContext): Promise<string> {
    const { data: chemicals, error } = await this.supabase
      .from('ipm_chemical_inventory')
      .select('*')
      .eq('farm_id', context.farmId)
      .order('product_name', { ascending: true });

    if (error) throw error;

    const totalProducts = chemicals?.length || 0;
    const lowStockItems = chemicals?.filter(c => c.quantity_on_hand < c.reorder_threshold).length || 0;
    const chemicalsByType = chemicals?.reduce((acc, chem) => {
      acc[chem.product_type] = (acc[chem.product_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const content = `
      <div class="section">
        <h2>Inventory Summary</h2>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-value">${totalProducts}</div>
            <div class="stat-label">Total Products</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${lowStockItems}</div>
            <div class="stat-label">Low Stock Items</div>
          </div>
          ${Object.entries(chemicalsByType).map(([type, count]) => `
          <div class="stat-box">
            <div class="stat-value">${count}</div>
            <div class="stat-label">${type}</div>
          </div>
          `).join('')}
        </div>
      </div>

      ${lowStockItems > 0 ? `
      <div class="section">
        <div class="alert">
          <div class="alert-title">⚠️ Low Stock Alert</div>
          ${lowStockItems} ${lowStockItems === 1 ? 'product is' : 'products are'} below reorder threshold
        </div>
      </div>
      ` : ''}

      <div class="section">
        <h2>Chemical Inventory</h2>
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Type</th>
              <th>On Hand</th>
              <th>Unit</th>
              <th>Reorder At</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${chemicals && chemicals.length > 0 ? chemicals.map(chem => {
              const isLow = chem.quantity_on_hand < chem.reorder_threshold;
              return `
              <tr>
                <td><strong>${chem.product_name}</strong></td>
                <td><span class="badge badge-${chem.product_type}">${chem.product_type}</span></td>
                <td ${isLow ? 'class="text-danger"' : ''}>${chem.quantity_on_hand || 0}</td>
                <td>${chem.unit_of_measure || '-'}</td>
                <td>${chem.reorder_threshold || 0}</td>
                <td>
                  <span class="badge ${isLow ? 'badge-low' : 'badge-ok'}">
                    ${isLow ? 'Low Stock' : 'OK'}
                  </span>
                </td>
              </tr>
              `;
            }).join('') : '<tr><td colspan="6" class="empty-state">No chemical inventory found</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    return this.generateHTMLTemplate('Chemical Inventory Report', content, context);
  }
}