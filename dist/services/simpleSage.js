// src/services/simpleSage.ts
// No-API Sage implementation with personality
import { FARMING_KNOWLEDGE } from './sageKnowledge.js';
export class SimpleSage {
    knowledge = FARMING_KNOWLEDGE;
    async processMessage(message, context, getMCPData) {
        const lowerMessage = message.toLowerCase();
        // Check for greetings
        if (this.isGreeting(lowerMessage)) {
            return this.getGreeting(context.farmName);
        }
        // Check for pest questions
        const pestResponse = this.checkPestQuestion(lowerMessage);
        if (pestResponse)
            return pestResponse;
        // Check for disease questions
        const diseaseResponse = this.checkDiseaseQuestion(lowerMessage);
        if (diseaseResponse)
            return diseaseResponse;
        // Check for nutrient questions
        const nutrientResponse = this.checkNutrientQuestion(lowerMessage);
        if (nutrientResponse)
            return nutrientResponse;
        // Check for environmental questions
        const envResponse = this.checkEnvironmentalQuestion(lowerMessage);
        if (envResponse)
            return envResponse;
        // Check for crop-specific questions
        const cropResponse = this.checkCropQuestion(lowerMessage);
        if (cropResponse)
            return cropResponse;
        // Check for farm data requests (if MCP function provided)
        if (getMCPData) {
            const dataResponse = await this.checkDataRequest(lowerMessage, getMCPData);
            if (dataResponse)
                return dataResponse;
        }
        // Default helpful response
        return this.getHelpfulDefault();
    }
    isGreeting(message) {
        const greetings = ['hello', 'hi', 'hey', 'howdy', 'greetings', 'good morning', 'good afternoon'];
        return greetings.some(g => message.includes(g));
    }
    getGreeting(farmName) {
        const greetings = [
            `Hello! 🌱 I'm Sage, your agricultural assistant for ${farmName}. I can help with pest management, nutrient issues, growing tips, and your farm data. What would you like to know?`,
            `Hi there! 🌿 Ready to help you grow amazing crops at ${farmName}. Ask me about pests, diseases, nutrients, or your current tower status!`,
            `Greetings, farmer! 💚 Sage here to assist with ${farmName}. Whether it's troubleshooting issues or optimizing growth, I'm here to help!`
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }
    checkPestQuestion(message) {
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
    checkDiseaseQuestion(message) {
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
    checkNutrientQuestion(message) {
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
    checkEnvironmentalQuestion(message) {
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
    checkCropQuestion(message) {
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
    async checkDataRequest(message, getMCPData) {
        // Tower-related queries
        if (message.includes('tower') || message.includes('how many')) {
            try {
                const data = await getMCPData('get_farm_stats');
                return `📊 Based on your farm data:\n\n${data}`;
            }
            catch (error) {
                return "I'd love to check your tower status, but I'm having trouble connecting to your farm systems right now. Try again in a moment!";
            }
        }
        // Inventory queries
        if (message.includes('seed') && message.includes('inventory')) {
            try {
                const data = await getMCPData('get_seed_inventory');
                return `📦 Your seed inventory:\n\n${data}`;
            }
            catch (error) {
                return "I couldn't access your inventory system right now. In the meantime, remember to keep at least 2 weeks of seeds on hand!";
            }
        }
        return null;
    }
    getHelpfulDefault() {
        return `I'm here to help with your vertical farm! 🌱

I can assist with:
- **Pest & Disease Management** - "How do I get rid of aphids?"
- **Nutrient Issues** - "Why are my leaves turning yellow?"
- **Environmental Control** - "What's the ideal temperature for lettuce?"
- **Crop Information** - "How long does basil take to grow?"
- **Your Farm Data** - "How many towers do I have?"

What would you like to know about?`;
    }
}
