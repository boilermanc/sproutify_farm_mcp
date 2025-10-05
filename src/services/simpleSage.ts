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
          return `📊 No nutrient readings recorded yet.\n\n**Get started:** Record pH and EC readings in your towers to track nutrient levels.\n**Ideal ranges:** pH 5.5-6.5, EC varies by crop stage.`;
        }
        return `🧪 **Recent Nutrient Readings:**\n\n${data}\n\n**Note:** Monitor pH daily (ideal: 5.5-6.5) and EC regularly (varies by crop stage).`;
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
            return `💧 No water tests recorded yet.\n\n**Get started:** Submit water samples to a certified lab for baseline testing.\n**Recommended:** Test water quality at least annually, or when issues arise.`;
          }
          const mostRecent = tests[0];
          const testDate = new Date(mostRecent.created_at).toLocaleDateString();
          return `💧 **Water Test History:**\n\n**Most recent test:** ${testDate}\n\n${data}\n\n**Tip:** Regular water testing helps identify potential issues before they affect crops.`;
        }
      }

      // Seeding schedule/plans - Check FIRST for future plans
      if (message.includes('seeding') && (message.includes('plan') || message.includes('schedule') || message.includes('next') || message.includes('upcoming'))) {
        const data = await getMCPData('get_seeding_plans', { limit: 10 });
        const plans = JSON.parse(data);
        if (plans.length === 0) {
          return `📅 No upcoming seeding plans scheduled. Consider planning your next crops!`;
        }
        return `📅 **Upcoming Seeding Schedule:**\n\n${data}`;
      }

      // Seeded/Planted items - Current batches (check after seeding plans)
      if (message.includes('seeded') ||
          message.includes('planted') ||
          (message.includes('plant') && (message.includes('what') || message.includes('current') || message.includes('batch'))) ||
          (message.includes('seed') && (message.includes('what') || message.includes('current') || message.includes('have'))) ||
          message.includes('growing')) {
        console.log('[SimpleSage] Detected seeded/planted query, calling get_plant_batches');
        const data = await getMCPData('get_plant_batches', { limit: 20 });
        console.log('[SimpleSage] Received plant batches data:', data?.substring(0, 200));
        const batches = JSON.parse(data);
        if (batches.length === 0) {
          return `📋 You don't have any active plant batches currently. Time to start seeding!`;
        }
        return `🌱 **Current Plant Batches:**\n\n${data}\n\n${batches.length} active batches tracked.`;
      }

      // Spacing schedule/plans
      if (message.includes('spacing') || (message.includes('space') && message.includes('plan'))) {
        const data = await getMCPData('get_spacing_plans', { limit: 10 });
        const plans = JSON.parse(data);
        if (plans.length === 0) {
          return `📏 No spacing activities scheduled currently.`;
        }
        return `📏 **Spacing Schedule:**\n\n${data}`;
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

      // Towers
      if (message.includes('tower')) {
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

What would you like to know about?`;
  }
}