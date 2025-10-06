// src/services/simpleSage.ts
// No-API Sage implementation with personality

import { FARMING_KNOWLEDGE } from './sageKnowledge.js';

export class SimpleSage {
  private knowledge = FARMING_KNOWLEDGE;
  
  async processMessage(
    message: string,
    context: { farmName: string },
    getMCPData?: (tool: string, params?: any) => Promise<any>
  ): Promise<string> {
    console.log('[SimpleSage.processMessage] Called with:', { message, context, hasMCPData: !!getMCPData });
    const lowerMessage = message.toLowerCase();
    
    // Check for greetings
    if (this.isGreeting(lowerMessage)) {
      return this.getGreeting(context.farmName);
    }
    
    // Check for pest questions
    const pestResponse = this.checkPestQuestion(lowerMessage);
    if (pestResponse) return pestResponse;
    
    // Check for disease questions
    const diseaseResponse = this.checkDiseaseQuestion(lowerMessage);
    if (diseaseResponse) return diseaseResponse;
    
    // Check for nutrient questions
    const nutrientResponse = this.checkNutrientQuestion(lowerMessage);
    if (nutrientResponse) return nutrientResponse;
    
    // Check for environmental questions
    const envResponse = this.checkEnvironmentalQuestion(lowerMessage);
    if (envResponse) return envResponse;
    
    // Check for crop-specific questions
    const cropResponse = this.checkCropQuestion(lowerMessage);
    if (cropResponse) return cropResponse;

    // Check for report requests
    const reportResponse = this.checkReportQuestion(lowerMessage);
    if (reportResponse) return reportResponse;

    // Check for training manual questions (if MCP function provided)
    if (getMCPData) {
      const manualResponse = await this.checkTrainingManualQuestion(lowerMessage, getMCPData);
      if (manualResponse) return manualResponse;
    }

    // Check for farm data requests (if MCP function provided)
    if (getMCPData) {
      const dataResponse = await this.checkDataRequest(lowerMessage, getMCPData);
      if (dataResponse) return dataResponse;
    }

    // Default helpful response
    return this.getHelpfulDefault();
  }
  
  private isGreeting(message: string): boolean {
    const greetings = ['hello', 'hi', 'hey', 'howdy', 'greetings', 'good morning', 'good afternoon'];
    return greetings.some(g => message.includes(g));
  }
  
  private getGreeting(farmName: string): string {
    const greetings = [
      `Hello! 🌱 I'm Sage, your agricultural assistant for ${farmName}. I can help with pest management, nutrient issues, growing tips, and your farm data. What would you like to know?`,
      `Hi there! 🌿 Ready to help you grow amazing crops at ${farmName}. Ask me about pests, diseases, nutrients, or your current tower status!`,
      `Greetings, farmer! 💚 Sage here to assist with ${farmName}. Whether it's troubleshooting issues or optimizing growth, I'm here to help!`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  private checkPestQuestion(message: string): string | null {
    for (const [pest, info] of Object.entries(this.knowledge.pests)) {
      if (message.includes(pest)) {
        return `🐛 **Dealing with ${pest.charAt(0).toUpperCase() + pest.slice(1)}**

**Signs to look for:**
${info.symptoms}

**Treatment options:**
${info.solutions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

**Prevention:**
${info.prevention}

💡 Pro tip: In vertical farming, maintaining proper environmental controls is your first line of defense. Most pests thrive in specific conditions - deny them that, and you'll have fewer problems!`;
      }
    }
    
    // Generic pest question
    if (message.includes('pest') || message.includes('bug') || message.includes('insect')) {
      return `🐛 **Common Vertical Farm Pests**

The most common pests I see in aeroponic systems are:
- **Aphids** - Small, soft-bodied insects that cluster on new growth
- **Spider mites** - Tiny pests that create webbing on leaves
- **Thrips** - Small insects that cause silvery streaks
- **Whiteflies** - White flying insects when plants are disturbed
- **Fungus gnats** - Small flies around growing medium

Which pest are you dealing with? Describe what you're seeing and I can provide specific solutions!`;
    }
    
    return null;
  }
  
  private checkDiseaseQuestion(message: string): string | null {
    for (const [disease, info] of Object.entries(this.knowledge.diseases)) {
      if (message.includes(disease.replace('_', ' '))) {
        return `🦠 **Managing ${disease.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}**

**Symptoms:**
${info.symptoms}

**Treatment:**
${info.solutions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

**Prevention:**
${info.prevention}

⚡ Remember: In controlled environments, prevention is much easier than treatment. Maintain proper conditions and you'll rarely see diseases!`;
      }
    }
    
    return null;
  }
  
  private checkNutrientQuestion(message: string): string | null {
    // Check for yellowing leaves (common question)
    if (message.includes('yellow') && (message.includes('leaf') || message.includes('leaves'))) {
      return `🍃 **Diagnosing Yellow Leaves**

Yellow leaves can indicate several issues:

**Nitrogen deficiency** (most common):
- Lower leaves yellow first
- Slow overall growth
- Solution: Check and adjust nutrient solution

**Iron deficiency**:
- New leaves yellow with green veins
- Solution: Lower pH to 5.5-6.0, add chelated iron

**Overwatering/Root issues**:
- General yellowing with wilting
- Solution: Check roots, improve drainage

**Natural aging**:
- Only bottom leaves, plant otherwise healthy
- This is normal - just remove old leaves

To diagnose: Which leaves are affected (new/old)? Any patterns in the yellowing? Check your pH (should be 5.8-6.2) and EC levels!`;
    }
    
    for (const [nutrient, info] of Object.entries(this.knowledge.nutrients)) {
      if (message.includes(nutrient)) {
        return `🧪 **${nutrient.charAt(0).toUpperCase() + nutrient.slice(1)} in Your System**

**Deficiency signs:**
${info.deficiency}

**Excess signs:**
${info.excess}

**Solutions:**
${info.solutions}

📊 Quick tip: Always check pH first! Most nutrient issues are actually pH problems in disguise. Keep it at 5.8-6.2 for most crops.`;
      }
    }
    
    return null;
  }
  
  private checkEnvironmentalQuestion(message: string): string | null {
    for (const [factor, info] of Object.entries(this.knowledge.environmental)) {
      if (message.includes(factor)) {
        const details = Object.entries(info)
          .map(([key, value]) => `**${key.replace('_', ' ')}:** ${value}`)
          .join('\n\n');
        
        return `🌡️ **${factor.charAt(0).toUpperCase() + factor.slice(1)} Management**

${details}

Need help adjusting your ${factor}? Let me know your current readings and crop type!`;
      }
    }
    
    return null;
  }
  
  private checkCropQuestion(message: string): string | null {
    for (const [crop, info] of Object.entries(this.knowledge.crops)) {
      if (message.includes(crop)) {
        return `🌱 **Growing ${crop.charAt(0).toUpperCase() + crop.slice(1)}**

**Popular varieties:** ${info.varieties.join(', ')}

**Germination:** ${info.germination}
**Days to harvest:** ${info["days to harvest"]}
**Spacing:** ${info.spacing}

**Pro tips:** ${info.tips}

Want specific variety recommendations or troubleshooting help? Just ask!`;
      }
    }
    
    return null;
  }

  private async checkTrainingManualQuestion(
    message: string,
    getMCPData: (tool: string, params?: any) => Promise<any>
  ): Promise<string | null> {
    // Keywords that indicate training manual questions
    const trainingKeywords = [
      'tower farm', 'design', 'construction', 'build', 'setup',
      'maintenance', 'troubleshoot', 'repair', 'install',
      'system', 'equipment', 'manual', 'guide', 'instructions',
      'best practice', 'operation', 'procedure'
    ];

    // Check if message contains training manual keywords
    const hasTrainingKeyword = trainingKeywords.some(keyword => message.includes(keyword));

    // Also check for question words that might indicate seeking general knowledge
    const isQuestion = message.includes('how') || message.includes('what') ||
                      message.includes('why') || message.includes('when') ||
                      message.includes('should') || message.includes('can');

    if (hasTrainingKeyword || (isQuestion && !this.isDataSpecificQuestion(message))) {
      console.log('[SimpleSage] Detected training manual question');

      try {
        const data = await getMCPData('search_training_manual', { query: message, limit: 3 });
        const results = JSON.parse(data);

        // Check if results contain a message (no results found)
        if (results.message) {
          return null; // Let other handlers try
        }

        if (results.length === 0) {
          return null; // Let other handlers try
        }

        // Format results for user
        let response = `📘 **From the Tower Farm Training Manuals:**\n\n`;

        results.forEach((result: any, index: number) => {
          response += `**${result.manual}${result.section ? ` - ${result.section}` : ''}**\n`;
          response += `${result.content}\n\n`;
          if (result.page) {
            response += `*Page ${result.page}*\n\n`;
          }
        });

        response += `*Want more details? Ask me to elaborate!*`;

        return response;
      } catch (error: any) {
        console.error('[SimpleSage] Error searching training manual:', error);
        return null; // Fall back to other handlers
      }
    }

    return null;
  }

  // Helper to check if question is data-specific (about current farm state)
  private isDataSpecificQuestion(message: string): boolean {
    const dataKeywords = [
      'my', 'our', 'current', 'now', 'today',
      'seeded', 'planted', 'growing', 'harvested',
      'tower', 'batch', 'crop', 'reading'
    ];
    return dataKeywords.some(keyword => message.includes(keyword));
  }

  private async checkDataRequest(
    message: string,
    getMCPData: (tool: string, params?: any) => Promise<any>
  ): Promise<string | null> {
    try {
      // pH/EC/Nutrient readings
      if (message.includes('ph') || message.includes('ec') ||
          (message.includes('nutrient') && (message.includes('level') || message.includes('reading') || message.includes('check') || message.includes('what')))) {
        const data = await getMCPData('get_nutrient_readings', { limit: 10 });
        const readings = JSON.parse(data);
        if (readings.length === 0) {
          return `📊 No pH/EC readings recorded yet. Ideal ranges: pH 5.5-6.5, EC varies by crop.`;
        }

        // Format readings in a clean list
        let response = `🧪 **Recent Nutrient Readings**\n\n`;
        readings.forEach((r: any) => {
          const date = new Date(r.reading_date).toLocaleDateString();
          const tower = r.tower_number ? `Tower ${r.tower_number}` : 'Unknown';
          const ph = r.ph_level || 'N/A';
          const ec = r.ec_level || 'N/A';
          response += `  • ${date} - ${tower}: pH ${ph}, EC ${ec}\n`;
        });
        return response.trim();
      }

      // Water tests
      if (message.includes('water') && (message.includes('test') || message.includes('lab') || message.includes('when') || message.includes('last'))) {
        if (message.includes('lab') && !message.includes('test')) {
          // Query for available labs
          const data = await getMCPData('get_water_labs');
          const labs = JSON.parse(data);
          if (labs.length === 0) {
            return `🔬 No water testing labs configured yet.\n\n**Next step:** Add water testing laboratories to your system to track where samples are sent.`;
          }
          return `🔬 **Available Water Testing Labs:**\n\n${data}`;
        } else {
          // Query for water tests
          const data = await getMCPData('get_water_tests', { limit: 10 });
          const tests = JSON.parse(data);
          if (tests.length === 0) {
            return `💧 No water tests recorded yet.`;
          }

          // Format water tests cleanly
          let response = `💧 **Water Test History**\n\n`;
          tests.forEach((test: any, index: number) => {
            const testDate = new Date(test.created_at).toLocaleDateString();
            const lab = test.lab_name || 'Unknown lab';
            const status = test.status || 'pending';
            if (index === 0) response += `**Most recent:** `;
            response += `${testDate} - ${lab} (${status})\n`;
          });
          return response.trim();
        }
      }

      // Seeding schedule/plans - Check FIRST for future plans
      if (message.includes('seeding') && (message.includes('plan') || message.includes('schedule') || message.includes('next') || message.includes('upcoming'))) {
        const data = await getMCPData('get_seeding_plans', { limit: 10 });
        const plans = JSON.parse(data);
        if (plans.length === 0) {
          return `📅 No upcoming seeding plans scheduled.`;
        }

        let response = `📅 **Upcoming Seeding Schedule** (${plans.length})\n\n`;
        plans.forEach((plan: any) => {
          const date = new Date(plan.planned_date).toLocaleDateString();
          const crop = plan.crop_name || 'Unknown crop';
          const quantity = plan.planned_quantity || 0;
          response += `  • ${date}: ${crop} - ${quantity} plants\n`;
        });
        return response.trim();
      }

      // Towers with growing plants - CHECK THIS FIRST
      if (message.includes('tower') && (message.includes('growing') || message.includes('planted') || message.includes('have') || message.includes('in my') || message.includes('what'))) {
        const data = await getMCPData('get_plant_batches', { limit: 100 });
        const batches = JSON.parse(data);

        if (batches.length === 0) {
          return `🗼 You don't have any towers with plants growing currently. Time to start planting!`;
        }

        // Extract unique towers
        const towersWithPlants = new Map();
        batches.forEach((batch: any) => {
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

        let details = '';
        towerList.forEach(towerNum => {
          const crops = towersWithPlants.get(towerNum);
          details += `\n**Tower ${towerNum}:**\n`;
          crops.forEach((crop: any) => {
            details += `  - ${crop.crop} (${crop.status})\n`;
          });
        });

        return `🌱 **Towers with Growing Plants:** ${towerCount}\n\n**Tower numbers:** ${towerList.join(', ')}\n${details}`;
      }

      // Specific crop growing query (e.g., "do I have romaine growing?")
      const cropMatches = message.match(/(?:have|got|growing|any)\s+(?:any\s+)?(\w+(?:\s+\w+)?)\s+(?:growing|planted|in towers?)/i);
      if (cropMatches || (message.includes('growing') && (message.includes('romaine') || message.includes('basil') || message.includes('lettuce') || message.includes('kale')))) {
        console.log('[SimpleSage] Detected crop-specific growing query');
        const data = await getMCPData('get_plant_batches', { limit: 100 });
        const batches = JSON.parse(data);

        if (batches.length === 0) {
          return `📋 You don't have any active plant batches currently. Time to start seeding!`;
        }

        // Extract crop name from message
        const cropKeywords = ['romaine', 'basil', 'lettuce', 'kale', 'butterhead', 'oakleaf', 'arugula', 'spinach', 'chard'];
        const searchCrop = cropKeywords.find(crop => message.toLowerCase().includes(crop));

        if (searchCrop) {
          const cropBatches = batches.filter((b: any) =>
            b.seeds?.crops?.crop_name?.toLowerCase().includes(searchCrop)
          );

          if (cropBatches.length === 0) {
            return `🥬 No ${searchCrop} batches found. You currently have ${batches.length} batches of other crops.`;
          }

          // Count batches in towers (planted/growing status)
          const inTowers = cropBatches.filter((b: any) =>
            b.towers && b.towers.tower_number &&
            (b.status === 'planted' || b.status === 'growing' || b.status === 'ready_harvest')
          );

          const otherStages = cropBatches.filter((b: any) =>
            !b.towers || !b.towers.tower_number
          );

          let response = `🌱 **${searchCrop.charAt(0).toUpperCase() + searchCrop.slice(1)} Status:**\n\n`;

          if (inTowers.length > 0) {
            response += `**✅ Growing in Towers (${inTowers.length}):**\n`;
            inTowers.forEach((b: any) => {
              response += `  - Tower ${b.towers.tower_number}: ${b.seeds.crops.crop_name} (${b.status})\n`;
            });
            response += '\n';
          } else {
            response += `**No ${searchCrop} currently in towers.**\n\n`;
          }

          if (otherStages.length > 0) {
            const byStatus: any = {};
            otherStages.forEach((b: any) => {
              if (!byStatus[b.status]) byStatus[b.status] = 0;
              byStatus[b.status]++;
            });
            response += `**📋 In Pipeline (${otherStages.length}):**\n`;
            Object.entries(byStatus).forEach(([status, count]) => {
              response += `  - ${status}: ${count} batches\n`;
            });
          }

          return response;
        }
      }

      // Seeded/Planted items - Current batches (check after seeding plans and tower queries)
      if ((message.includes('seeded') ||
          message.includes('planted') ||
          (message.includes('plant') && (message.includes('what') || message.includes('current') || message.includes('batch'))) ||
          (message.includes('seed') && (message.includes('what') || message.includes('current') || message.includes('have'))) ||
          message.includes('growing')) &&
          !message.includes('tower')) {
        console.log('[SimpleSage] Detected seeded/planted query, calling get_plant_batches');
        const data = await getMCPData('get_plant_batches', { limit: 20 });
        console.log('[SimpleSage] Received plant batches data:', data?.substring(0, 200));
        const batches = JSON.parse(data);
        if (batches.length === 0) {
          return `📋 You don't have any active plant batches currently. Time to start seeding!`;
        }

        // Group by status
        const grouped: any = {};
        batches.forEach((batch: any) => {
          const status = batch.status || 'unknown';
          if (!grouped[status]) grouped[status] = [];
          grouped[status].push(batch);
        });

        let response = `🌱 **Current Plant Batches** (${batches.length} total)\n\n`;

        // Format each status group
        Object.entries(grouped).forEach(([status, statusBatches]: [string, any]) => {
          const statusEmoji = status === 'seeded' ? '🌱' : status === 'spaced' ? '🌿' : status === 'planted' ? '🪴' : '📦';
          response += `${statusEmoji} **${status.toUpperCase()}** (${statusBatches.length})\n`;

          statusBatches.forEach((batch: any) => {
            const crop = batch.seeds?.crops?.crop_name || 'Unknown crop';
            const variety = batch.seeds?.variety_name || '';
            const seedDate = batch.seeded_date ? new Date(batch.seeded_date).toLocaleDateString() : 'N/A';
            const plantsSeeded = batch.plants_seeded || 0;
            const tower = batch.towers?.tower_number ? `Tower ${batch.towers.tower_number}` : '';

            response += `  • ${crop}${variety ? ` (${variety})` : ''} - ${plantsSeeded} plants - Seeded: ${seedDate}${tower ? ` - ${tower}` : ''}\n`;
          });
          response += '\n';
        });

        return response.trim();
      }

      // Spacing schedule/plans
      if (message.includes('spacing') || (message.includes('space') && message.includes('plan'))) {
        const data = await getMCPData('get_spacing_plans', { limit: 10 });
        const plans = JSON.parse(data);
        if (plans.length === 0) {
          return `📏 No spacing activities scheduled.`;
        }

        let response = `📏 **Spacing Schedule** (${plans.length})\n\n`;
        plans.forEach((plan: any) => {
          const date = new Date(plan.planned_date).toLocaleDateString();
          const crop = plan.crop_name || 'Unknown';
          const batch = plan.batch_id || '';
          response += `  • ${date}: ${crop}${batch ? ` (Batch ${batch})` : ''}\n`;
        });
        return response.trim();
      }

      // Planting schedule/plans
      if ((message.includes('planting') || message.includes('plant')) && (message.includes('plan') || message.includes('schedule') || message.includes('when') || message.includes('should'))) {
        const data = await getMCPData('get_planting_plans', { limit: 10 });
        const plans = JSON.parse(data);
        if (plans.length === 0) {
          return `🌱 No planting activities scheduled.`;
        }

        let response = `🌱 **Planting Schedule** (${plans.length})\n\n`;
        plans.forEach((plan: any) => {
          const date = new Date(plan.planned_date).toLocaleDateString();
          const crop = plan.crop_name || 'Unknown';
          const tower = plan.tower_number ? `Tower ${plan.tower_number}` : '';
          response += `  • ${date}: ${crop}${tower ? ` → ${tower}` : ''}\n`;
        });
        return response.trim();
      }

      // Crops
      if (message.includes('crop') && (message.includes('what') || message.includes('grow') || message.includes('show') || message.includes('list'))) {
        const data = await getMCPData('get_crops', { status: 'active' });
        const crops = JSON.parse(data);
        if (crops.length === 0) {
          return `🌾 No crops configured yet. Add crops to start tracking your production!`;
        }
        return `🌾 **Crops We Grow:**\n\n${data}`;
      }

      // Vendors
      if (message.includes('vendor') || message.includes('supplier')) {
        const data = await getMCPData('get_vendors', { status: 'active' });
        const vendors = JSON.parse(data);
        if (vendors.length === 0) {
          return `🏢 No vendors configured yet. Add suppliers to track your sources!`;
        }
        return `🏢 **Our Vendors:**\n\n${data}`;
      }

      // General tower info (not growing-specific)
      if (message.includes('tower') && !message.includes('growing') && !message.includes('planted') && !message.includes('have') && !message.includes('in my') && !message.includes('what')) {
        const data = await getMCPData('get_towers');
        const towers = JSON.parse(data);
        if (towers.length === 0) {
          return `🗼 No towers configured in the system.`;
        }
        const emptyTowers = towers.filter((t: any) => !t.current_crop_id);
        return `🗼 **Tower Status:**\n\nTotal: ${towers.length} towers\nEmpty: ${emptyTowers.length}\n\n${data}`;
      }

      // Tasks
      if (message.includes('task') && (message.includes('what') || message.includes('show') || message.includes('do'))) {
        const data = await getMCPData('get_tasks', { status: 'pending', limit: 20 });
        const tasks = JSON.parse(data);
        if (tasks.length === 0) {
          return `✅ No pending tasks! Everything's on track.`;
        }
        return `📋 **Pending Tasks:**\n\n${data}`;
      }

      // Spray logs
      if (message.includes('spray') && !message.includes('ipm')) {
        const data = await getMCPData('get_spray_logs', { limit: 10 });
        const logs = JSON.parse(data);
        if (logs.length === 0) {
          return `🚿 No spray applications recorded yet.`;
        }
        return `🚿 **Recent Spray Applications:**\n\n${data}`;
      }

      // Seed inventory
      if (message.includes('seed') && (message.includes('inventory') || message.includes('stock') || message.includes('low'))) {
        const lowStockOnly = message.includes('low');
        const data = await getMCPData('get_seed_inventory', { lowStock: lowStockOnly });
        const inventory = JSON.parse(data);
        if (lowStockOnly && inventory.length === 0) {
          return `✅ All seed stocks are healthy (above 100 seeds)!`;
        }
        if (inventory.length === 0) {
          return `📦 No seeds in inventory. Time to order!`;
        }
        return `📦 **Seed Inventory${lowStockOnly ? ' (Low Stock Items)' : ''}:**\n\n${data}`;
      }

      // Tower-related queries
      if (message.includes('tower') || message.includes('how many')) {
        const data = await getMCPData('get_farm_stats');
        return `📊 **Farm Statistics:**\n\n${data}`;
      }

    } catch (error) {
      console.error('[SimpleSage] Error in checkDataRequest:', error);
      return "I'm having trouble accessing your farm data right now. Please try again in a moment!";
    }

    return null;
  }
  
  private checkReportQuestion(message: string): string | null {
    if (message.includes('report') && (message.includes('what') || message.includes('can') || message.includes('run') || message.includes('generate') || message.includes('available'))) {
      return `📊 **Available Printable Reports:**

I can generate professional printable reports for you:

**Inventory & Resources:**
- **Seed Inventory Report** - Current stock levels, low stock alerts, reorder recommendations
- **Chemical Inventory Report** - Chemical products, quantities, reorder alerts
- **Tower Status Report** - Tower utilization, what's growing where, harvest readiness
- **Vendor List Report** - Complete vendor directory with contact information

**Production & Planning:**
- **Seed Batch Report** - Details on specific batches (seeding dates, growth stages, timeline)
- **Weekly Planning Report** - Upcoming seeding, spacing, and planting activities
- **Harvest Report** - Ready to harvest now, upcoming harvest schedule (next 14 days)
- **Production Summary Report** - 30-day harvest statistics, active pipeline, production by category

**Quality & Compliance:**
- **pH & EC Readings Report** - Nutrient monitoring history, out of range alerts
- **Water Test Results Report** - Lab test history, water quality metrics
- **Spray Applications Report** - Chemical application logs, spray history (90 days)

**How to generate:**
Ask me to create a specific report like "Generate seed inventory report" or "Create pH readings report" and I'll prepare a professional PDF-ready document for you!

Which report would you like to see?`;
    }

    if (message.includes('report') && (message.includes('generate') || message.includes('create') || message.includes('make'))) {
      return `📊 To generate a report, please specify which one you'd like:

**Inventory:**
- "Generate seed inventory report"
- "Generate chemical inventory report"
- "Generate vendor list report"

**Production:**
- "Create tower status report"
- "Make harvest report"
- "Generate weekly planning report"
- "Create production summary report"

**Quality:**
- "Generate pH readings report"
- "Create water test report"
- "Generate spray applications report"

Or ask "What reports can I run?" to see all available options!`;
    }

    return null;
  }

  private getHelpfulDefault(): string {
    return `I'm here to help with your vertical farm! 🌱

I can assist with:
- **Pest & Disease Management** - "How do I get rid of aphids?"
- **Nutrient Issues** - "Why are my leaves turning yellow?" or "Check my pH levels"
- **Environmental Control** - "What's the ideal temperature for lettuce?"
- **Crop Information** - "How long does basil take to grow?"
- **Farm Data** - "How many towers do I have?" or "What's seeded?"
- **Planning** - "What's my seeding schedule?" or "What needs spacing?"
- **Inventory** - "What seeds are low in stock?"
- **Water Quality** - "Any water issues?"
- **Spray Logs** - "What sprays have been applied?"
- **Reports** - "What reports can I run?" or "Generate seed inventory report"

What would you like to know about?`;
  }
}