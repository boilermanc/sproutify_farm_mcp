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
      body { margin: 0; }
      .report-container { 
        width: 100%; 
        max-width: none;
        box-shadow: none;
      }
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #333;
    }
    
    .report-container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .report-header {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      color: white;
      padding: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .report-header h1 {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .report-header .subtitle {
      opacity: 0.9;
      font-size: 14px;
    }
    
    .report-header .logo {
      font-size: 20px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .report-header .logo .icon {
      width: 30px;
      height: 30px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    
    .report-meta {
      background: #f9fafb;
      padding: 20px 30px;
      border-bottom: 1px solid #e5e7eb;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }
    
    .report-meta .meta-item {
      display: flex;
      flex-direction: column;
    }
    
    .report-meta .meta-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    
    .report-meta .meta-value {
      font-size: 14px;
      font-weight: 500;
      color: #111827;
    }
    
    .report-content {
      padding: 30px;
    }
    
    .report-section {
      margin-bottom: 30px;
    }
    
    .report-section h2 {
      font-size: 20px;
      color: #111827;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #22c55e;
    }
    
    .report-section h3 {
      font-size: 16px;
      color: #374151;
      margin-bottom: 10px;
      margin-top: 15px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    th {
      background: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 14px;
    }
    
    tr:hover {
      background: #fafafa;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }
    
    .status-empty { background: #f3f4f6; color: #6b7280; }
    .status-growing { background: #fef3c7; color: #92400e; }
    .status-ready_harvest { background: #d1fae5; color: #065f46; }
    .status-maintenance { background: #fee2e2; color: #991b1b; }
    .status-seeded { background: #dbeafe; color: #1e40af; }
    .status-germinating { background: #fce7f3; color: #9f1239; }
    .status-spacing { background: #e9d5ff; color: #6b21a8; }
    
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    
    .stat-card {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    
    .stat-value {
      font-size: 32px;
      font-weight: 600;
      color: #22c55e;
      margin-bottom: 5px;
    }
    
    .stat-label {
      font-size: 14px;
      color: #6b7280;
    }
    
    .report-footer {
      background: #f9fafb;
      padding: 20px 30px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    
    .print-button {
      background: #22c55e;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      margin: 20px;
      font-weight: 500;
    }
    
    .print-button:hover {
      background: #16a34a;
    }
    
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #6b7280;
    }
    
    .chart-container {
      margin: 20px 0;
      padding: 20px;
      background: #fafafa;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <button onclick="window.print()" class="print-button no-print">🖨️ Print Report</button>
  
  <div class="report-container">
    <div class="report-header">
      <div>
        <h1>${title}</h1>
        <div class="subtitle">${context.farmName}</div>
      </div>
      <div class="logo">
        <div class="icon">🌱</div>
        <span>Sproutify Sage</span>
      </div>
    </div>
    
    <div class="report-meta">
      <div class="meta-item">
        <div class="meta-label">Report Date</div>
        <div class="meta-value">${currentDate}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Report Type</div>
        <div class="meta-value">${context.reportType}</div>
      </div>
      ${context.dateRange ? `
      <div class="meta-item">
        <div class="meta-label">Date Range</div>
        <div class="meta-value">${new Date(context.dateRange.start).toLocaleDateString()} - ${new Date(context.dateRange.end).toLocaleDateString()}</div>
      </div>
      ` : ''}
      <div class="meta-item">
        <div class="meta-label">Generated By</div>
        <div class="meta-value">Sproutify Sage</div>
      </div>
    </div>
    
    <div class="report-content">
      ${content}
    </div>
    
    <div class="report-footer">
      Generated by Sproutify Sage • ${new Date().toLocaleString()} • Confidential
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
}