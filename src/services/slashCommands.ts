// Slash Command Handler
// Processes commands like /plant, /seed, /record, /spray, /harvest

import { SupabaseClient } from '@supabase/supabase-js';

export interface SlashCommandResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class SlashCommandHandler {
  constructor(private supabase: SupabaseClient) {}

  async handleCommand(
    message: string,
    farmId: string,
    farmName: string
  ): Promise<SlashCommandResult | null> {
    // Check if message starts with /
    if (!message.startsWith('/')) {
      return null;
    }

    const parts = message.trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    console.log('[SlashCommand] Detected command:', { command, args });

    switch (command) {
      case '/plant':
        return this.handlePlantCommand(args, farmId);
      case '/seed':
        return this.handleSeedCommand(args, farmId);
      case '/record':
        return this.handleRecordCommand(args, farmId);
      case '/spray':
        return this.handleSprayCommand(args, farmId);
      case '/harvest':
        return this.handleHarvestCommand(args, farmId);
      case '/help':
        return this.handleHelpCommand();
      default:
        return {
          success: false,
          message: `❌ Unknown command: ${command}\n\nType /help to see available commands.`,
          error: 'Unknown command'
        };
    }
  }

  private handleHelpCommand(): SlashCommandResult {
    return {
      success: true,
      message: `🔧 **Slash Commands Help**

**Planting & Seeding:**
\`/seed <quantity> <crop_name> in tray <tray_number>\`
  Example: /seed 100 romaine in tray 1

\`/plant <batch_id> in tower <tower_number>\`
  Example: /plant abc123 in tower 1.05

**Recording Data:**
\`/record ph <value> for tower <tower_number>\`
  Example: /record ph 6.2 for tower 1.05

\`/record ec <value> for tower <tower_number>\`
  Example: /record ec 2.1 for tower 1.05

\`/record temperature <value> for tower <tower_number>\`
  Example: /record temperature 68 for tower 1.05

**Applications:**
\`/spray <product> on tower <tower_number> <amount> <unit>\`
  Example: /spray regalia on tower 1.05 2 oz

**Harvesting:**
\`/harvest tower <tower_number>\`
  Example: /harvest tower 1.05

Type any command to get started!`
    };
  }

  // /plant <batch_id> in tower <tower_number>
  private async handlePlantCommand(args: string[], farmId: string): Promise<SlashCommandResult> {
    try {
      // Parse: <batch_id> in tower <tower_number>
      const batchIdMatch = args[0];
      const towerMatch = args.findIndex(arg => arg.toLowerCase() === 'tower');

      if (!batchIdMatch || towerMatch === -1 || !args[towerMatch + 1]) {
        return {
          success: false,
          message: `❌ Invalid syntax. Use: \`/plant <batch_id> in tower <tower_number>\`

Example: /plant abc123 in tower 1.05`,
          error: 'Invalid syntax'
        };
      }

      const batchId = batchIdMatch;
      const towerNumber = args[towerMatch + 1];

      // Validate batch exists
      const { data: batch, error: batchError } = await this.supabase
        .from('plant_batches')
        .select('*, seeds(vendor_seed_name, crops(crop_name))')
        .eq('id', batchId)
        .eq('farm_id', farmId)
        .single();

      if (batchError || !batch) {
        return {
          success: false,
          message: `❌ Batch ID "${batchId}" not found in your farm.`,
          error: 'Batch not found'
        };
      }

      // Validate tower exists
      const { data: tower, error: towerError } = await this.supabase
        .from('towers')
        .select('*')
        .eq('tower_number', towerNumber)
        .eq('farm_id', farmId)
        .single();

      if (towerError || !tower) {
        return {
          success: false,
          message: `❌ Tower "${towerNumber}" not found in your farm.`,
          error: 'Tower not found'
        };
      }

      // Check if tower is empty
      if (tower.status !== 'empty') {
        return {
          success: false,
          message: `❌ Tower ${towerNumber} is not empty (current status: ${tower.status}). Please harvest or clean it first.`,
          error: 'Tower not empty'
        };
      }

      // Update batch with tower and planting date
      const { error: updateError } = await this.supabase
        .from('plant_batches')
        .update({
          tower_id: tower.id,
          planting_date: new Date().toISOString(),
          status: 'planted'
        })
        .eq('id', batchId);

      if (updateError) {
        console.error('[SlashCommand] Error updating batch:', updateError);
        return {
          success: false,
          message: `❌ Failed to plant batch: ${updateError.message}`,
          error: updateError.message
        };
      }

      // Update tower status
      await this.supabase
        .from('towers')
        .update({ status: 'growing' })
        .eq('id', tower.id);

      const cropName = batch.seeds?.crops?.crop_name || 'Unknown crop';
      const variety = batch.seeds?.vendor_seed_name || '';
      const fullName = variety ? `${cropName} (${variety})` : cropName;

      return {
        success: true,
        message: `✅ **Successfully planted!**

📦 Batch: ${fullName}
🗼 Tower: ${towerNumber}
📅 Planted: ${new Date().toLocaleDateString()}

The tower status has been updated to "growing". Monitor pH, EC, and growth progress regularly.`,
        data: { batchId, towerNumber, plantedDate: new Date().toISOString() }
      };

    } catch (error: any) {
      console.error('[SlashCommand] Error in /plant:', error);
      return {
        success: false,
        message: `❌ An error occurred: ${error.message}`,
        error: error.message
      };
    }
  }

  // /seed <quantity> <crop_name> in tray <tray_number>
  private async handleSeedCommand(args: string[], farmId: string): Promise<SlashCommandResult> {
    try {
      // Parse: <quantity> <crop_name> in tray <tray_number>
      if (args.length < 5) {
        return {
          success: false,
          message: `❌ Invalid syntax. Use: \`/seed <quantity> <crop_name> in tray <tray_number>\`

Example: /seed 100 romaine in tray 1`,
          error: 'Invalid syntax'
        };
      }

      const quantity = parseInt(args[0]);
      const trayIndex = args.findIndex(arg => arg.toLowerCase() === 'tray');
      const cropName = args.slice(1, trayIndex - 1).join(' ').toLowerCase();
      const trayNumber = args[trayIndex + 1];

      if (isNaN(quantity) || quantity <= 0) {
        return {
          success: false,
          message: `❌ Invalid quantity: "${args[0]}". Please provide a positive number.`,
          error: 'Invalid quantity'
        };
      }

      // Find matching seed by crop name
      const { data: seeds, error: seedError } = await this.supabase
        .from('seeds')
        .select('*, crops(crop_name)')
        .eq('farm_id', farmId)
        .ilike('crops.crop_name', `%${cropName}%`);

      if (seedError || !seeds || seeds.length === 0) {
        return {
          success: false,
          message: `❌ No seeds found matching "${cropName}". Check your seed inventory.`,
          error: 'Seeds not found'
        };
      }

      const seed = seeds[0];

      // Create plant batch
      const { data: newBatch, error: batchError } = await this.supabase
        .from('plant_batches')
        .insert({
          farm_id: farmId,
          seed_id: seed.id,
          plants_seeded: quantity,
          tray_number: trayNumber,
          seed_date: new Date().toISOString(),
          status: 'seeded'
        })
        .select('*, seeds(vendor_seed_name, crops(crop_name))')
        .single();

      if (batchError) {
        console.error('[SlashCommand] Error creating batch:', batchError);
        return {
          success: false,
          message: `❌ Failed to create batch: ${batchError.message}`,
          error: batchError.message
        };
      }

      const fullCropName = newBatch.seeds?.crops?.crop_name || cropName;
      const variety = newBatch.seeds?.vendor_seed_name || '';
      const displayName = variety ? `${fullCropName} (${variety})` : fullCropName;

      return {
        success: true,
        message: `✅ **Seeds planted successfully!**

🌱 Crop: ${displayName}
📦 Quantity: ${quantity} seeds
🔢 Tray: ${trayNumber}
📅 Seeded: ${new Date().toLocaleDateString()}
🆔 Batch ID: ${newBatch.id.slice(0, 8)}...

Monitor for germination in 3-7 days. Keep tray moist and in proper lighting.`,
        data: { batchId: newBatch.id, quantity, trayNumber, cropName: displayName }
      };

    } catch (error: any) {
      console.error('[SlashCommand] Error in /seed:', error);
      return {
        success: false,
        message: `❌ An error occurred: ${error.message}`,
        error: error.message
      };
    }
  }

  // /record ph|ec|temperature <value> for tower <tower_number>
  private async handleRecordCommand(args: string[], farmId: string): Promise<SlashCommandResult> {
    try {
      if (args.length < 5) {
        return {
          success: false,
          message: `❌ Invalid syntax. Use:
\`/record ph <value> for tower <tower_number>\`
\`/record ec <value> for tower <tower_number>\`
\`/record temperature <value> for tower <tower_number>\`

Example: /record ph 6.2 for tower 1.05`,
          error: 'Invalid syntax'
        };
      }

      const readingType = args[0].toLowerCase();
      const value = parseFloat(args[1]);
      const towerIndex = args.findIndex(arg => arg.toLowerCase() === 'tower');
      const towerNumber = args[towerIndex + 1];

      if (isNaN(value)) {
        return {
          success: false,
          message: `❌ Invalid value: "${args[1]}". Please provide a number.`,
          error: 'Invalid value'
        };
      }

      // Validate tower
      const { data: tower, error: towerError } = await this.supabase
        .from('towers')
        .select('*')
        .eq('tower_number', towerNumber)
        .eq('farm_id', farmId)
        .single();

      if (towerError || !tower) {
        return {
          success: false,
          message: `❌ Tower "${towerNumber}" not found in your farm.`,
          error: 'Tower not found'
        };
      }

      // Create nutrient reading
      const readingData: any = {
        farm_id: farmId,
        tower_id: tower.id,
        reading_date: new Date().toISOString()
      };

      let displayMetric = '';
      let warningMessage = '';

      switch (readingType) {
        case 'ph':
          readingData.ph_level = value;
          displayMetric = `pH: ${value}`;
          if (value < 5.5 || value > 6.5) {
            warningMessage = `\n\n⚠️ **Warning:** pH ${value} is outside optimal range (5.5-6.5). Adjust immediately to prevent nutrient lockout.`;
          }
          break;
        case 'ec':
          readingData.ec_level = value;
          displayMetric = `EC: ${value} mS/cm`;
          break;
        case 'temperature':
        case 'temp':
          readingData.water_temp = value;
          displayMetric = `Temperature: ${value}°F`;
          if (value < 65 || value > 75) {
            warningMessage = `\n\n⚠️ **Warning:** Water temperature ${value}°F is outside optimal range (65-75°F). This may affect nutrient uptake.`;
          }
          break;
        default:
          return {
            success: false,
            message: `❌ Unknown reading type: "${readingType}". Use: ph, ec, or temperature`,
            error: 'Invalid reading type'
          };
      }

      const { error: insertError } = await this.supabase
        .from('nutrient_readings')
        .insert(readingData);

      if (insertError) {
        console.error('[SlashCommand] Error recording reading:', insertError);
        return {
          success: false,
          message: `❌ Failed to record reading: ${insertError.message}`,
          error: insertError.message
        };
      }

      return {
        success: true,
        message: `✅ **Reading recorded successfully!**

🗼 Tower: ${towerNumber}
📊 ${displayMetric}
📅 Recorded: ${new Date().toLocaleString()}${warningMessage}`,
        data: { towerNumber, readingType, value, timestamp: new Date().toISOString() }
      };

    } catch (error: any) {
      console.error('[SlashCommand] Error in /record:', error);
      return {
        success: false,
        message: `❌ An error occurred: ${error.message}`,
        error: error.message
      };
    }
  }

  // /spray <product> on tower <tower_number> <amount> <unit>
  private async handleSprayCommand(args: string[], farmId: string): Promise<SlashCommandResult> {
    try {
      // Parse: <product> on tower <tower_number> <amount> <unit>
      const towerIndex = args.findIndex(arg => arg.toLowerCase() === 'tower');

      if (towerIndex === -1 || args.length < towerIndex + 3) {
        return {
          success: false,
          message: `❌ Invalid syntax. Use: \`/spray <product> on tower <tower_number> <amount> <unit>\`

Example: /spray regalia on tower 1.05 2 oz`,
          error: 'Invalid syntax'
        };
      }

      const productName = args.slice(0, towerIndex - 1).join(' ');
      const towerNumber = args[towerIndex + 1];
      const amount = parseFloat(args[towerIndex + 2]);
      const unit = args[towerIndex + 3];

      if (isNaN(amount)) {
        return {
          success: false,
          message: `❌ Invalid amount: "${args[towerIndex + 2]}". Please provide a number.`,
          error: 'Invalid amount'
        };
      }

      // Validate tower
      const { data: tower, error: towerError } = await this.supabase
        .from('towers')
        .select('*')
        .eq('tower_number', towerNumber)
        .eq('farm_id', farmId)
        .single();

      if (towerError || !tower) {
        return {
          success: false,
          message: `❌ Tower "${towerNumber}" not found in your farm.`,
          error: 'Tower not found'
        };
      }

      // Record spray application
      const { error: insertError } = await this.supabase
        .from('core_spray_applications')
        .insert({
          farm_id: farmId,
          tower_id: tower.id,
          application_date: new Date().toISOString(),
          product_name: productName,
          application_rate: `${amount} ${unit}`,
          spray_type: 'fungicide', // Default, can be enhanced
          target_area: `Tower ${towerNumber}`
        });

      if (insertError) {
        console.error('[SlashCommand] Error recording spray:', insertError);
        return {
          success: false,
          message: `❌ Failed to record spray application: ${insertError.message}`,
          error: insertError.message
        };
      }

      return {
        success: true,
        message: `✅ **Spray application recorded!**

🚿 Product: ${productName}
🗼 Tower: ${towerNumber}
💧 Amount: ${amount} ${unit}
📅 Applied: ${new Date().toLocaleDateString()}

**Important:** Follow product label for re-entry interval and harvest restrictions.`,
        data: { productName, towerNumber, amount, unit, date: new Date().toISOString() }
      };

    } catch (error: any) {
      console.error('[SlashCommand] Error in /spray:', error);
      return {
        success: false,
        message: `❌ An error occurred: ${error.message}`,
        error: error.message
      };
    }
  }

  // /harvest tower <tower_number>
  private async handleHarvestCommand(args: string[], farmId: string): Promise<SlashCommandResult> {
    try {
      // Parse: tower <tower_number>
      const towerIndex = args.findIndex(arg => arg.toLowerCase() === 'tower');

      if (towerIndex === -1 || !args[towerIndex + 1]) {
        return {
          success: false,
          message: `❌ Invalid syntax. Use: \`/harvest tower <tower_number>\`

Example: /harvest tower 1.05`,
          error: 'Invalid syntax'
        };
      }

      const towerNumber = args[towerIndex + 1];

      // Validate tower and get batch
      const { data: tower, error: towerError } = await this.supabase
        .from('towers')
        .select('*, plant_batches(*)')
        .eq('tower_number', towerNumber)
        .eq('farm_id', farmId)
        .single();

      if (towerError || !tower) {
        return {
          success: false,
          message: `❌ Tower "${towerNumber}" not found in your farm.`,
          error: 'Tower not found'
        };
      }

      if (tower.status === 'empty') {
        return {
          success: false,
          message: `❌ Tower ${towerNumber} is already empty. Nothing to harvest.`,
          error: 'Tower empty'
        };
      }

      // Update batch to harvested
      if (tower.plant_batches) {
        await this.supabase
          .from('plant_batches')
          .update({
            status: 'harvested',
            harvest_date: new Date().toISOString()
          })
          .eq('tower_id', tower.id);
      }

      // Update tower to empty
      await this.supabase
        .from('towers')
        .update({ status: 'empty' })
        .eq('id', tower.id);

      return {
        success: true,
        message: `✅ **Harvest recorded successfully!**

🗼 Tower: ${towerNumber}
📅 Harvested: ${new Date().toLocaleDateString()}
🔄 Status: Tower is now empty and ready for next batch

**Next steps:**
1. Clean and sanitize tower
2. Check pH and EC of nutrient solution
3. Ready to plant new batch!`,
        data: { towerNumber, harvestDate: new Date().toISOString() }
      };

    } catch (error: any) {
      console.error('[SlashCommand] Error in /harvest:', error);
      return {
        success: false,
        message: `❌ An error occurred: ${error.message}`,
        error: error.message
      };
    }
  }
}
