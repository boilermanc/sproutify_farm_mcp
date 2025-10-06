import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { SimpleSage } from './services/simpleSage.js';
import { SlashCommandHandler } from './services/slashCommands.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.HTTP_PORT || 3001;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

const slashCommandHandler = new SlashCommandHandler(supabase);

// MCP tool handler
async function getMCPData(toolName: string, params: any = {}) {
  const farmId = params.farmId;

  switch (toolName) {
    case 'get_plant_batches': {
      const { data } = await supabase
        .from('plant_batches')
        .select('*, seeds(*, crops(*)), towers(*)')
        .eq('farm_id', farmId)
        .limit(params.limit || 20);
      return JSON.stringify(data || []);
    }

    case 'get_towers': {
      const { data } = await supabase
        .from('towers')
        .select('*')
        .eq('farm_id', farmId);
      return JSON.stringify(data || []);
    }

    case 'get_tower_plants': {
      const { data, error } = await supabase
        .from('tower_plants')
        .select(`
          *,
          towers!inner(tower_number, farm_id),
          seeds(
            vendor_seed_name,
            crops(crop_name)
          )
        `)
        .eq('towers.farm_id', farmId)
        .in('status', ['growing', 'ready_harvest']);

      console.log('[getMCPData] get_tower_plants:', { farmId, count: data?.length, error });
      if (data && data.length > 0) {
        console.log('[getMCPData] Sample tower plant:', JSON.stringify(data[0], null, 2));
      }

      return JSON.stringify(data || []);
    }

    case 'get_seed_inventory': {
      const { data } = await supabase
        .from('seed_inventory')
        .select('*, seeds(*, crops(*))')
        .eq('farm_id', farmId);
      return JSON.stringify(data || []);
    }

    case 'get_crops': {
      const { data } = await supabase
        .from('crops')
        .select('*')
        .eq('farm_id', farmId);
      return JSON.stringify(data || []);
    }

    case 'get_vendors': {
      const { data } = await supabase
        .from('vendors')
        .select('*')
        .eq('farm_id', farmId);
      return JSON.stringify(data || []);
    }

    case 'get_nutrient_readings': {
      const { data } = await supabase
        .from('nutrient_readings')
        .select('*, towers(*)')
        .eq('farm_id', farmId)
        .order('reading_date', { ascending: false })
        .limit(params.limit || 10);
      return JSON.stringify(data || []);
    }

    case 'get_water_tests': {
      const { data } = await supabase
        .from('water_tests')
        .select('*')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false })
        .limit(params.limit || 10);
      return JSON.stringify(data || []);
    }

    case 'get_water_labs': {
      const { data } = await supabase
        .from('water_testing_labs')
        .select('*')
        .eq('farm_id', farmId);
      return JSON.stringify(data || []);
    }

    case 'get_spray_logs': {
      const { data } = await supabase
        .from('spray_logs')
        .select('*, towers(*)')
        .eq('farm_id', farmId)
        .order('application_date', { ascending: false })
        .limit(params.limit || 10);
      return JSON.stringify(data || []);
    }

    case 'get_tasks': {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('farm_id', farmId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(params.limit || 10);
      return JSON.stringify(data || []);
    }

    case 'get_seeding_plans': {
      const { data } = await supabase
        .from('seeding_plans')
        .select('*, crops(*)')
        .eq('farm_id', farmId)
        .order('planned_date', { ascending: true })
        .limit(params.limit || 10);
      return JSON.stringify(data || []);
    }

    case 'get_spacing_plans': {
      const { data } = await supabase
        .from('spacing_plans')
        .select('*, plant_batches(*, seeds(*, crops(*)))')
        .eq('farm_id', farmId)
        .order('planned_date', { ascending: true })
        .limit(params.limit || 10);
      return JSON.stringify(data || []);
    }

    case 'get_planting_plans': {
      const { data } = await supabase
        .from('planting_plans')
        .select('*, plant_batches(*, seeds(*, crops(*))), towers(*)')
        .eq('farm_id', farmId)
        .order('planned_date', { ascending: true })
        .limit(params.limit || 10);
      return JSON.stringify(data || []);
    }

    case 'search_training_manual': {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: params.query
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;

      const { data } = await supabase.rpc('search_training_manual', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: params.limit || 3
      });
      return JSON.stringify(data || []);
    }

    default:
      return JSON.stringify([]);
  }
}

// Main endpoint
app.post('/sage', async (req, res) => {
  try {
    const { message, farmId, farmName, userEmail } = req.body;
    console.log(`[SAGE] Received message: "${message}" for farmId: ${farmId}`);

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!farmId) {
      return res.status(400).json({ error: 'farmId is required' });
    }

    // Check for slash commands first
    const slashResult = await slashCommandHandler.handleCommand(message, farmId, farmName || 'Your Farm');
    if (slashResult) {
      console.log(`[SAGE] Slash command processed: ${slashResult.success ? 'SUCCESS' : 'FAILED'}`);
      return res.json({ response: slashResult.message });
    }

    // Initialize SimpleSage with Supabase for report generation
    const sage = new SimpleSage(supabase);

    // Wrap getMCPData to include farmId
    const getMCPDataWithFarm = async (toolName: string, params: any = {}) => {
      return getMCPData(toolName, { ...params, farmId });
    };

    const response = await sage.processMessage(
      message,
      {
        farmName: farmName || 'Your Farm',
        farmId,
        userEmail: userEmail || 'user@farm.com'
      },
      getMCPDataWithFarm
    );

    res.json({ response });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Sage HTTP Server running on http://localhost:${PORT}`);
  console.log(`📡 POST to /sage with { message, farmId, farmName }`);
});
