import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { ConversationManager, ConversationState } from './conversationManager.js';
import { DateParser } from './dateParser.js';

interface DataEntryIntent {
  type: 'seed' | 'record_ph' | 'record_ec' | 'record_temperature' | 'spray' | 'harvest' | 'plant' | 'none';
  confidence: number;
  extractedData?: Record<string, any>;
}

export class ConversationalDataEntry {
  private conversationManager: ConversationManager;
  private openai: OpenAI;

  constructor(private supabase: SupabaseClient) {
    this.conversationManager = new ConversationManager(supabase);
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ''
    });
  }

  /**
   * Detect user intent from message using pattern matching (fast, reliable fallback)
   */
  detectIntentPattern(message: string): DataEntryIntent {
    const lowerMessage = message.toLowerCase();

    // Seeding patterns
    if (lowerMessage.match(/\b(seed|seeding|seeded|plant.*seed)\b/i)) {
      return { type: 'seed', confidence: 0.9 };
    }

    // pH recording patterns
    if (lowerMessage.match(/\b(record|log|enter|add).*\bph\b/i) || lowerMessage.match(/\bph\b.*(reading|value|level)/i)) {
      return { type: 'record_ph', confidence: 0.9 };
    }

    // EC recording patterns
    if (lowerMessage.match(/\b(record|log|enter|add).*\bec\b/i) || lowerMessage.match(/\bec\b.*(reading|value|level)/i)) {
      return { type: 'record_ec', confidence: 0.9 };
    }

    // Temperature recording patterns
    if (lowerMessage.match(/\b(record|log|enter|add).*(temp|temperature)/i) || lowerMessage.match(/\b(temp|temperature).*(reading|value)/i)) {
      return { type: 'record_temperature', confidence: 0.9 };
    }

    // Spray patterns
    if (lowerMessage.match(/\b(spray|sprayed|spraying|chemical.*application)\b/i)) {
      return { type: 'spray', confidence: 0.8 };
    }

    // Harvest patterns
    if (lowerMessage.match(/\b(harvest|harvested|harvesting|pick|picked)\b/i)) {
      return { type: 'harvest', confidence: 0.8 };
    }

    // Planting patterns (transplanting seedlings to towers)
    if (lowerMessage.match(/\b(plant|transplant|move.*tower)\b/i) && !lowerMessage.match(/\bseed/i)) {
      return { type: 'plant', confidence: 0.8 };
    }

    return { type: 'none', confidence: 0 };
  }

  /**
   * Detect user intent from message using OpenAI (with fallback to pattern matching)
   */
  async detectIntent(message: string): Promise<DataEntryIntent> {
    // Try pattern-based detection first (fast and reliable)
    const patternIntent = this.detectIntentPattern(message);
    if (patternIntent.confidence > 0.7) {
      console.log('[ConversationalDataEntry] Pattern-based intent detected:', patternIntent.type);
      return patternIntent;
    }

    // Fallback to OpenAI for complex cases
    try {
      console.log('[ConversationalDataEntry] Attempting OpenAI intent detection...');
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an intent classifier for a farm management system. Detect what data entry operation the user wants to perform.

Available intents:
- seed: User wants to record seeding/planting seeds in trays
- record_ph: User wants to record pH reading
- record_ec: User wants to record EC (electrical conductivity) reading
- record_temperature: User wants to record water temperature
- spray: User wants to record spray application
- harvest: User wants to record a harvest
- plant: User wants to plant seedlings in towers
- none: User is asking a question or wants something else

Also extract any data mentioned in the message.

Respond with JSON only:
{
  "type": "seed|record_ph|record_ec|record_temperature|spray|harvest|plant|none",
  "confidence": 0.0-1.0,
  "extractedData": {
    "quantity": number,
    "crop": "crop name",
    "tray": number,
    "tower": number,
    "value": number,
    "date": "date string"
  }
}`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.3
      });

      const response = completion.choices[0].message.content || '{}';
      const intent = JSON.parse(response);
      console.log('[ConversationalDataEntry] OpenAI intent detected:', intent.type);
      return intent;
    } catch (e: any) {
      console.error('[ConversationalDataEntry] OpenAI intent detection failed:', e.message);
      // Return pattern-based result even if confidence was low
      return patternIntent;
    }
  }

  /**
   * Handle conversational data entry
   */
  async handleMessage(
    message: string,
    userId: string,
    farmId: string,
    farmName: string
  ): Promise<string | null> {
    // Check for active conversation
    let conversation = this.conversationManager.getConversation(userId, farmId);

    // Check for cancel/exit commands
    if (message.toLowerCase().match(/^(cancel|exit|stop|nevermind|quit)$/)) {
      if (conversation) {
        this.conversationManager.clearConversation(userId, farmId);
        return "No problem! I've cancelled that operation. How else can I help?";
      }
      return null; // Not handling this message
    }

    // If there's an active conversation, continue it
    if (conversation) {
      return await this.continueConversation(message, conversation, userId, farmId, farmName);
    }

    // Otherwise, detect intent to start new conversation
    const intent = await this.detectIntent(message);

    if (intent.confidence < 0.6 || intent.type === 'none') {
      return null; // Not a data entry operation, let other handlers process it
    }

    // Start new conversation based on intent
    return await this.startDataEntry(intent, message, userId, farmId, farmName);
  }

  /**
   * Start a new data entry conversation
   */
  private async startDataEntry(
    intent: DataEntryIntent,
    originalMessage: string,
    userId: string,
    farmId: string,
    farmName: string
  ): Promise<string> {
    const conversation = this.conversationManager.startConversation(userId, farmId, intent.type);
    conversation.data = intent.extractedData || {};

    // Route to appropriate flow
    switch (intent.type) {
      case 'seed':
        return await this.handleSeedingFlow(conversation, userId, farmId, farmName, true);
      case 'record_ph':
      case 'record_ec':
      case 'record_temperature':
        return await this.handleNutrientReadingFlow(conversation, userId, farmId, farmName, true);
      case 'spray':
        return await this.handleSprayFlow(conversation, userId, farmId, farmName, true);
      default:
        this.conversationManager.clearConversation(userId, farmId);
        return `I understand you want to ${intent.type}, but that flow isn't implemented yet. Try asking me to generate a report or search the training manual instead!`;
    }
  }

  /**
   * Continue an existing conversation
   */
  private async continueConversation(
    message: string,
    conversation: ConversationState,
    userId: string,
    farmId: string,
    farmName: string
  ): Promise<string> {
    // Route to appropriate flow handler
    switch (conversation.intent) {
      case 'seed':
        return await this.handleSeedingFlow(conversation, userId, farmId, farmName, false, message);
      case 'record_ph':
      case 'record_ec':
      case 'record_temperature':
        return await this.handleNutrientReadingFlow(conversation, userId, farmId, farmName, false, message);
      case 'spray':
        return await this.handleSprayFlow(conversation, userId, farmId, farmName, false, message);
      default:
        this.conversationManager.clearConversation(userId, farmId);
        return "I'm sorry, I got confused. Let's start over. What would you like to do?";
    }
  }

  /**
   * Seeding conversation flow
   */
  private async handleSeedingFlow(
    conversation: ConversationState,
    userId: string,
    farmId: string,
    farmName: string,
    isStart: boolean,
    userResponse?: string
  ): Promise<string> {
    const step = conversation.step;
    const data = conversation.data;

    // Step 0: Ask for crop (if not already provided)
    if (step === 0) {
      if (data.crop) {
        conversation.step = 1;
        this.conversationManager.updateConversation(userId, farmId, conversation);
        return await this.handleSeedingFlow(conversation, userId, farmId, farmName, false);
      }
      return "Great! I'll help you record that seeding. What crop are you seeding?";
    }

    // Step 1: Process crop, ask for quantity
    if (step === 1 && userResponse) {
      data.crop = userResponse.trim();

      // Validate crop exists
      const { data: crops } = await this.supabase
        .from('crops')
        .select('id, crop_name')
        .eq('farm_id', farmId)
        .ilike('crop_name', `%${data.crop}%`);

      if (!crops || crops.length === 0) {
        return `I couldn't find a crop matching "${data.crop}". Can you try again with the exact crop name?`;
      }

      if (crops.length > 1) {
        const cropNames = crops.map(c => c.crop_name).join(', ');
        return `I found multiple crops: ${cropNames}. Which one did you mean?`;
      }

      data.cropId = crops[0].id;
      data.cropName = crops[0].crop_name;
      conversation.step = 2;
      this.conversationManager.updateConversation(userId, farmId, conversation);

      if (data.quantity) {
        conversation.step = 3;
        this.conversationManager.updateConversation(userId, farmId, conversation);
        return await this.handleSeedingFlow(conversation, userId, farmId, farmName, false);
      }

      return `Perfect! ${data.cropName}. How many plants are you seeding?`;
    }

    // Step 2: Process quantity, ask for tray
    if (step === 2 && userResponse) {
      const quantity = parseInt(userResponse.trim());
      if (isNaN(quantity) || quantity <= 0) {
        return "Please enter a valid number of plants (e.g., 100, 50, 25).";
      }

      data.quantity = quantity;
      conversation.step = 3;
      this.conversationManager.updateConversation(userId, farmId, conversation);

      if (data.tray) {
        conversation.step = 4;
        this.conversationManager.updateConversation(userId, farmId, conversation);
        return await this.handleSeedingFlow(conversation, userId, farmId, farmName, false);
      }

      return `Got it, ${quantity} plants. Which tray number?`;
    }

    // Step 3: Process tray, ask for date
    if (step === 3 && userResponse) {
      const tray = parseInt(userResponse.trim());
      if (isNaN(tray) || tray <= 0) {
        return "Please enter a valid tray number (e.g., 1, 2, 5).";
      }

      data.tray = tray;
      conversation.step = 4;
      this.conversationManager.updateConversation(userId, farmId, conversation);

      return `Perfect! Tray ${tray}. When was this seeded? (You can say "today", "May 2nd", "5/2", etc.)`;
    }

    // Step 4: Process date, show confirmation
    if (step === 4 && userResponse) {
      const parsedDate = DateParser.parseDate(userResponse.trim());
      if (!parsedDate) {
        return `I couldn't understand that date. Please try again with formats like "today", "May 2nd", "5/2", or "2025-05-02".`;
      }

      data.date = parsedDate;
      conversation.step = 5;
      conversation.confirmationPending = true;
      this.conversationManager.updateConversation(userId, farmId, conversation);

      return `Perfect! Let me confirm:\n\n` +
        `📝 **Seeding Record**\n` +
        `   • Crop: ${data.cropName}\n` +
        `   • Quantity: ${data.quantity} plants\n` +
        `   • Tray: ${data.tray}\n` +
        `   • Date: ${DateParser.formatDate(data.date)}\n\n` +
        `Should I save this? (yes/no)`;
    }

    // Step 5: Process confirmation
    if (step === 5 && userResponse) {
      const response = userResponse.toLowerCase().trim();

      if (response === 'no' || response === 'n') {
        this.conversationManager.clearConversation(userId, farmId);
        return "No problem! I've cancelled that. Let me know if you want to try again.";
      }

      if (response !== 'yes' && response !== 'y') {
        return "Please reply with 'yes' to confirm or 'no' to cancel.";
      }

      // Get seed for this crop
      const { data: seeds } = await this.supabase
        .from('seeds')
        .select('id')
        .eq('farm_id', farmId)
        .eq('crop_id', data.cropId)
        .limit(1);

      if (!seeds || seeds.length === 0) {
        this.conversationManager.clearConversation(userId, farmId);
        return `Sorry, I couldn't find any seeds for ${data.cropName}. Please add seeds for this crop first.`;
      }

      // Create plant batch
      const { data: batch, error } = await this.supabase
        .from('plant_batches')
        .insert({
          farm_id: farmId,
          seed_id: seeds[0].id,
          plants_seeded: data.quantity,
          seeds_used: data.quantity,
          seeding_tray_tag: data.tray.toString(),
          seed_date: DateParser.formatForDatabase(data.date),
          status: 'seeded'
        })
        .select()
        .single();

      this.conversationManager.clearConversation(userId, farmId);

      if (error) {
        return `Sorry, I encountered an error saving that: ${error.message}`;
      }

      return `✅ **Seeding recorded successfully!**\n\n` +
        `I've added ${data.quantity} ${data.cropName} plants in tray ${data.tray}. ` +
        `You can track their progress in your reports!`;
    }

    return "I'm sorry, something went wrong. Let's start over. What would you like to do?";
  }

  /**
   * Nutrient reading conversation flow (pH, EC, temperature)
   */
  private async handleNutrientReadingFlow(
    conversation: ConversationState,
    userId: string,
    farmId: string,
    farmName: string,
    isStart: boolean,
    userResponse?: string
  ): Promise<string> {
    const step = conversation.step;
    const data = conversation.data;
    const readingType = conversation.intent.replace('record_', '');

    // Step 0: Ask for tower
    if (step === 0) {
      if (data.tower) {
        conversation.step = 1;
        this.conversationManager.updateConversation(userId, farmId, conversation);
        return await this.handleNutrientReadingFlow(conversation, userId, farmId, farmName, false);
      }
      return `I'll help you record that ${readingType.toUpperCase()} reading. Which tower number?`;
    }

    // Step 1: Process tower, ask for value
    if (step === 1 && userResponse) {
      const towerNum = parseInt(userResponse.trim());
      if (isNaN(towerNum) || towerNum <= 0) {
        return "Please enter a valid tower number.";
      }

      // Validate tower exists
      const { data: towers } = await this.supabase
        .from('towers')
        .select('id, tower_number')
        .eq('farm_id', farmId)
        .eq('tower_number', towerNum);

      if (!towers || towers.length === 0) {
        return `I couldn't find tower ${towerNum}. Please check the tower number and try again.`;
      }

      data.tower = towerNum;
      data.towerId = towers[0].id;
      conversation.step = 2;
      this.conversationManager.updateConversation(userId, farmId, conversation);

      if (data.value) {
        conversation.step = 3;
        this.conversationManager.updateConversation(userId, farmId, conversation);
        return await this.handleNutrientReadingFlow(conversation, userId, farmId, farmName, false);
      }

      return `Tower ${towerNum}. What's the ${readingType.toUpperCase()} value?`;
    }

    // Step 2: Process value, ask for date
    if (step === 2 && userResponse) {
      const value = parseFloat(userResponse.trim());
      if (isNaN(value)) {
        return `Please enter a valid numeric value for ${readingType.toUpperCase()}.`;
      }

      // Validate range
      if (readingType === 'ph' && (value < 0 || value > 14)) {
        return "pH should be between 0 and 14. Please check your reading.";
      }

      if (readingType === 'temperature' && (value < -10 || value > 50)) {
        return "Temperature seems out of range. Please verify (expected range: -10°C to 50°C).";
      }

      data.value = value;
      conversation.step = 3;
      this.conversationManager.updateConversation(userId, farmId, conversation);

      return `Got it, ${readingType.toUpperCase()} = ${value}. When was this reading taken? (You can say "today", "May 2nd", etc.)`;
    }

    // Step 3: Process date, show confirmation
    if (step === 3 && userResponse) {
      const parsedDate = DateParser.parseDate(userResponse.trim());
      if (!parsedDate) {
        return `I couldn't understand that date. Try "today", "May 2nd", "5/2", etc.`;
      }

      data.date = parsedDate;
      conversation.step = 4;
      conversation.confirmationPending = true;
      this.conversationManager.updateConversation(userId, farmId, conversation);

      const warnings = [];
      if (readingType === 'ph' && (data.value < 5.5 || data.value > 6.5)) {
        warnings.push(`⚠️ pH is outside optimal range (5.5-6.5)`);
      }

      return `Perfect! Let me confirm:\n\n` +
        `📝 **${readingType.toUpperCase()} Reading**\n` +
        `   • Tower: ${data.tower}\n` +
        `   • Value: ${data.value}\n` +
        `   • Date: ${DateParser.formatDate(data.date)}\n` +
        (warnings.length > 0 ? `\n${warnings.join('\n')}\n` : '') +
        `\nShould I save this? (yes/no)`;
    }

    // Step 4: Process confirmation - REQUIRES recorded_by UUID
    if (step === 4 && userResponse) {
      const response = userResponse.toLowerCase().trim();

      if (response === 'no' || response === 'n') {
        this.conversationManager.clearConversation(userId, farmId);
        return "No problem! I've cancelled that reading.";
      }

      if (response !== 'yes' && response !== 'y') {
        return "Please reply 'yes' to confirm or 'no' to cancel.";
      }

      // NOTE: This will fail until we have a valid recorded_by UUID
      // For now, return error message
      this.conversationManager.clearConversation(userId, farmId);
      return `⚠️ **Nutrient reading functionality requires user authentication.**\n\n` +
        `The database requires a valid user ID to record readings. This feature will be available ` +
        `once user authentication is implemented. For now, please use the web interface to record readings.`;

      // TODO: Once we have user authentication, uncomment this:
      /*
      const readingData: any = {
        farm_id: farmId,
        tower_id: data.towerId,
        reading_type: 'manual',
        recorded_at: DateParser.formatForDatabase(data.date),
        recorded_by: userId // This needs to be a valid UUID
      };

      if (readingType === 'ph') readingData.ph_value = data.value;
      if (readingType === 'ec') readingData.ec_value = data.value;
      if (readingType === 'temperature') readingData.temperature = data.value;

      const { error } = await this.supabase
        .from('nutrient_readings')
        .insert(readingData);

      this.conversationManager.clearConversation(userId, farmId);

      if (error) {
        return `Sorry, I encountered an error: ${error.message}`;
      }

      return `✅ **Reading recorded successfully!**\n\n${readingType.toUpperCase()} = ${data.value} for Tower ${data.tower}.`;
      */
    }

    return "I'm sorry, something went wrong. Let's start over.";
  }

  /**
   * Spray application conversation flow
   */
  private async handleSprayFlow(
    conversation: ConversationState,
    userId: string,
    farmId: string,
    farmName: string,
    isStart: boolean,
    userResponse?: string
  ): Promise<string> {
    this.conversationManager.clearConversation(userId, farmId);
    return "Spray application tracking is coming soon! For now, please use the web interface.";
  }
}
