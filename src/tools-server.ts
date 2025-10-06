import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { SimpleSage } from './services/simpleSage.js';
import { ConversationalDataEntry } from './services/conversationalDataEntry.js';
import { ReportGenerator } from './reports/generator.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.TOOLS_PORT || 3001;

app.use(cors());
app.use(express.json());

// Request logging
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

const sage = new SimpleSage(supabase);
const conversationalEntry = new ConversationalDataEntry(supabase);
const reportGenerator = new ReportGenerator(supabase);

// ==========================================
// TOOL 1: Search Training Manual
// ==========================================
app.post('/tools/search_manual', async (req, res) => {
  try {
    const { query, limit = 3 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    // Generate embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search training manual
    const { data, error } = await supabase.rpc('search_training_manual', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit
    });

    if (error) throw error;

    res.json({
      success: true,
      results: data || [],
      count: data?.length || 0
    });
  } catch (error: any) {
    console.error('[search_manual] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// TOOL 2: Get Farm Data
// ==========================================
app.post('/tools/get_farm_data', async (req, res) => {
  try {
    const { query_type, farm_id, filters = {} } = req.body;

    if (!query_type || !farm_id) {
      return res.status(400).json({
        success: false,
        error: 'query_type and farm_id are required'
      });
    }

    let data = null;
    let error = null;

    switch (query_type) {
      case 'towers':
        ({ data, error } = await supabase
          .from('towers')
          .select('*')
          .eq('farm_id', farm_id));
        break;

      case 'plant_batches':
        ({ data, error } = await supabase
          .from('plant_batches')
          .select('*, seeds(*, crops(*)), towers(*)')
          .eq('farm_id', farm_id)
          .limit(filters.limit || 20));
        break;

      case 'tower_plants':
        ({ data, error } = await supabase
          .from('tower_plants')
          .select(`
            *,
            towers!inner(tower_number, farm_id),
            seeds(vendor_seed_name, crops(crop_name))
          `)
          .eq('towers.farm_id', farm_id)
          .in('status', ['growing', 'ready_harvest']));
        break;

      case 'seed_inventory':
        ({ data, error } = await supabase
          .from('seed_inventory')
          .select('*, seeds(*, crops(*))')
          .eq('farm_id', farm_id));
        break;

      case 'crops':
        ({ data, error } = await supabase
          .from('crops')
          .select('*')
          .eq('farm_id', farm_id));
        break;

      case 'vendors':
        ({ data, error } = await supabase
          .from('vendors')
          .select('*')
          .eq('farm_id', farm_id));
        break;

      case 'nutrient_readings':
        ({ data, error } = await supabase
          .from('nutrient_readings')
          .select('*, towers(*)')
          .eq('farm_id', farm_id)
          .order('reading_date', { ascending: false })
          .limit(filters.limit || 10));
        break;

      case 'tasks':
        ({ data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('farm_id', farm_id)
          .eq('status', 'pending')
          .order('due_date', { ascending: true })
          .limit(filters.limit || 10));
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown query_type: ${query_type}`
        });
    }

    if (error) throw error;

    res.json({
      success: true,
      query_type,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error: any) {
    console.error('[get_farm_data] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// TOOL 3: Generate Report
// ==========================================
app.post('/tools/generate_report', async (req, res) => {
  try {
    const { report_type, farm_id, farm_name = 'Your Farm', user_email = 'user@farm.com' } = req.body;

    if (!report_type || !farm_id) {
      return res.status(400).json({
        success: false,
        error: 'report_type and farm_id are required'
      });
    }

    const context = { farmId: farm_id, farmName: farm_name, userEmail: user_email, reportType: report_type };
    let html: string | null = null;
    let reportName = '';

    switch (report_type.toLowerCase()) {
      case 'seed_inventory':
        reportName = 'Seed Inventory Report';
        html = await reportGenerator.generateSeedInventoryReport(context);
        break;
      case 'tower_status':
        reportName = 'Tower Status Report';
        html = await reportGenerator.generateTowerStatusReport(context);
        break;
      case 'harvest':
        reportName = 'Harvest Report';
        html = await reportGenerator.generateHarvestReport(context);
        break;
      case 'weekly_planning':
        reportName = 'Weekly Planning Report';
        html = await reportGenerator.generateWeeklyPlanningReport(context);
        break;
      case 'production_summary':
        reportName = 'Production Summary Report';
        html = await reportGenerator.generateProductionSummaryReport(context);
        break;
      case 'nutrient_readings':
        reportName = 'pH & EC Readings Report';
        html = await reportGenerator.generateNutrientReadingsReport(context);
        break;
      case 'water_test':
        reportName = 'Water Test Results Report';
        html = await reportGenerator.generateWaterTestReport(context);
        break;
      case 'spray_applications':
        reportName = 'Spray Applications Report';
        html = await reportGenerator.generateSprayApplicationsReport(context);
        break;
      case 'chemical_inventory':
        reportName = 'Chemical Inventory Report';
        html = await reportGenerator.generateChemicalInventoryReport(context);
        break;
      case 'vendor_list':
        reportName = 'Vendor List Report';
        html = await reportGenerator.generateVendorListReport(context);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown report_type: ${report_type}`
        });
    }

    if (!html) {
      throw new Error('Report generation failed');
    }

    // Save report to file
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${reportName.replace(/\s+/g, '-')}-${timestamp}.html`;
    const filePath = path.join(reportsDir, filename);

    fs.writeFileSync(filePath, html);

    res.json({
      success: true,
      report_type: reportName,
      file_path: filePath,
      filename: filename,
      message: `${reportName} generated successfully`
    });
  } catch (error: any) {
    console.error('[generate_report] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// TOOL 4: Record Data (Conversational)
// ==========================================
app.post('/tools/record_data', async (req, res) => {
  try {
    const { message, user_id, farm_id, farm_name = 'Your Farm' } = req.body;

    if (!message || !user_id || !farm_id) {
      return res.status(400).json({
        success: false,
        error: 'message, user_id, and farm_id are required'
      });
    }

    const response = await conversationalEntry.handleMessage(
      message,
      user_id,
      farm_id,
      farm_name
    );

    res.json({
      success: true,
      response: response || 'No response from conversational handler',
      is_conversation_active: !!conversationalEntry['conversationManager'].getConversation(user_id, farm_id)
    });
  } catch (error: any) {
    console.error('[record_data] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// TOOL 5: Ask Sage (Expert Knowledge)
// ==========================================
app.post('/tools/ask_sage', async (req, res) => {
  try {
    const { question, farm_name = 'Your Farm' } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'question is required'
      });
    }

    // Use SimpleSage for expert knowledge (pests, diseases, nutrients, crops, environment)
    const response = await sage.processMessage(question, { farmName: farm_name });

    res.json({
      success: true,
      question: question,
      answer: response
    });
  } catch (error: any) {
    console.error('[ask_sage] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// LEGACY: /sage endpoint (backwards compatibility)
// ==========================================
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

    // Use SimpleSage to process the message
    const response = await sage.processMessage(message, {
      farmName: farmName || 'Your Farm',
      farmId,
      userEmail: userEmail || 'user@farm.com'
    });

    res.json({ response });
  } catch (error: any) {
    console.error('[SAGE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Tool List & Health
// ==========================================
app.get('/tools', (req, res) => {
  res.json({
    available_tools: [
      {
        name: 'search_manual',
        endpoint: '/tools/search_manual',
        method: 'POST',
        description: 'Search training manual using vector similarity',
        parameters: {
          query: 'string (required) - Search query',
          limit: 'number (optional) - Max results (default: 3)'
        }
      },
      {
        name: 'get_farm_data',
        endpoint: '/tools/get_farm_data',
        method: 'POST',
        description: 'Query farm data from database',
        parameters: {
          query_type: 'string (required) - towers, plant_batches, tower_plants, seed_inventory, crops, vendors, nutrient_readings, tasks',
          farm_id: 'string (required) - Farm UUID',
          filters: 'object (optional) - Additional filters like { limit: 10 }'
        }
      },
      {
        name: 'generate_report',
        endpoint: '/tools/generate_report',
        method: 'POST',
        description: 'Generate printable HTML reports',
        parameters: {
          report_type: 'string (required) - seed_inventory, tower_status, harvest, weekly_planning, production_summary, nutrient_readings, water_test, spray_applications, chemical_inventory, vendor_list',
          farm_id: 'string (required) - Farm UUID',
          farm_name: 'string (optional)',
          user_email: 'string (optional)'
        }
      },
      {
        name: 'record_data',
        endpoint: '/tools/record_data',
        method: 'POST',
        description: 'Start or continue conversational data entry',
        parameters: {
          message: 'string (required) - User message',
          user_id: 'string (required) - User identifier (email)',
          farm_id: 'string (required) - Farm UUID',
          farm_name: 'string (optional)'
        }
      },
      {
        name: 'ask_sage',
        endpoint: '/tools/ask_sage',
        method: 'POST',
        description: 'Get expert advice on pests, diseases, nutrients, crops, environment',
        parameters: {
          question: 'string (required) - Question for Sage',
          farm_name: 'string (optional)'
        }
      }
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', tools_count: 5, legacy_endpoints: 1 });
});

app.listen(PORT, () => {
  console.log(`🔧 Sage Unified Server running on http://localhost:${PORT}`);
  console.log(`📋 Available tools: http://localhost:${PORT}/tools`);
  console.log(`\n5 Focused Tools:`);
  console.log(`  1. POST /tools/search_manual - Training manual search`);
  console.log(`  2. POST /tools/get_farm_data - Farm data queries`);
  console.log(`  3. POST /tools/generate_report - Report generation`);
  console.log(`  4. POST /tools/record_data - Conversational data entry`);
  console.log(`  5. POST /tools/ask_sage - Expert knowledge`);
  console.log(`\nLegacy Endpoint:`);
  console.log(`  • POST /sage - Backwards compatible monolithic endpoint`);
});
