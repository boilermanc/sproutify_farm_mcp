#!/usr/bin/env tsx
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Configuration
const CHUNK_SIZE = 1000; // characters per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks
const MANUALS_DIR = 'C:\\Users\\clint\\OneDrive - Sweetwater Urban Farms\\Sweetwater Group\\ACR\\Tower Farm Manuals';

const MANUAL_FILES = [
  'Part1 Design Digital 2024v2.pdf',
  'Part2 Install Digital 2024v2.pdf',
  'Part3 Operate Digital 2024v2.pdf'
];

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Dynamic import for CommonJS module
const { pdf: pdfParse } = await import('pdf-parse');

interface TextChunk {
  content: string;
  manualName: string;
  chunkIndex: number;
  pageNumber?: number;
}

/**
 * Extract text from PDF
 */
async function extractTextFromPDF(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

/**
 * Split text into overlapping chunks
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    const chunk = text.slice(start, end);

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('. ');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > chunkSize * 0.5) {
        chunks.push(chunk.slice(0, breakPoint + 1).trim());
        start += breakPoint + 1 - overlap;
      } else {
        chunks.push(chunk.trim());
        start += chunkSize - overlap;
      }
    } else {
      chunks.push(chunk.trim());
      break;
    }
  }

  return chunks.filter(c => c.length > 50); // Filter out very small chunks
}

/**
 * Generate embedding for text using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text
  });
  return response.data[0].embedding;
}

/**
 * Process a single PDF file
 */
async function processManual(fileName: string, farmId: string | null = null): Promise<void> {
  const filePath = path.join(MANUALS_DIR, fileName);

  console.log(`\n📄 Processing: ${fileName}`);
  console.log(`   Path: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`   ❌ File not found: ${filePath}`);
    return;
  }

  // Extract text
  console.log(`   📖 Extracting text...`);
  const text = await extractTextFromPDF(filePath);
  console.log(`   ✓ Extracted ${text.length} characters`);

  // Chunk text
  console.log(`   ✂️  Chunking text...`);
  const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
  console.log(`   ✓ Created ${chunks.length} chunks`);

  // Determine manual name from filename
  const manualName = fileName.replace('.pdf', '').replace(' Digital 2024v2', '');

  // Process each chunk
  console.log(`   🔢 Generating embeddings and storing...`);
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < chunks.length; i++) {
    try {
      const chunk = chunks[i];

      // Generate embedding
      const embedding = await generateEmbedding(chunk);

      // Store in database
      const { error } = await supabase
        .from('training_manual_embeddings')
        .insert({
          farm_id: farmId,
          manual_name: manualName,
          chunk_index: i,
          content: chunk,
          embedding: embedding,
          metadata: {
            file_path: filePath,
            processed_at: new Date().toISOString(),
            chunk_size: CHUNK_SIZE,
            chunk_overlap: CHUNK_OVERLAP
          }
        });

      if (error) {
        console.error(`   ❌ Error storing chunk ${i}:`, error.message);
        errorCount++;
      } else {
        successCount++;
        if ((i + 1) % 10 === 0) {
          console.log(`   Progress: ${i + 1}/${chunks.length} chunks processed`);
        }
      }

      // Rate limiting - OpenAI has limits
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.error(`   ❌ Error processing chunk ${i}:`, error.message);
      errorCount++;
    }
  }

  console.log(`   ✅ Complete: ${successCount} chunks stored, ${errorCount} errors`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Training Manual Processing\n');
  console.log('Configuration:');
  console.log(`  - Chunk Size: ${CHUNK_SIZE} characters`);
  console.log(`  - Chunk Overlap: ${CHUNK_OVERLAP} characters`);
  console.log(`  - Manuals Directory: ${MANUALS_DIR}`);
  console.log(`  - Files to process: ${MANUAL_FILES.length}`);

  // Check OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('\n❌ OPENAI_API_KEY not found in environment variables');
    console.error('   Please add OPENAI_API_KEY to your .env file');
    process.exit(1);
  }

  // Clear existing data (optional - comment out if you want to keep existing)
  console.log('\n🗑️  Clearing existing training manual data...');
  const { error: deleteError } = await supabase
    .from('training_manual_embeddings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError && deleteError.code !== 'PGRST116') { // PGRST116 = no rows deleted
    console.error('   ⚠️  Warning: Could not clear existing data:', deleteError.message);
  } else {
    console.log('   ✓ Existing data cleared');
  }

  // Process each manual
  for (const fileName of MANUAL_FILES) {
    try {
      await processManual(fileName, null); // null = global manual accessible to all farms
    } catch (error: any) {
      console.error(`\n❌ Failed to process ${fileName}:`, error.message);
    }
  }

  console.log('\n✨ Processing complete!');
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
