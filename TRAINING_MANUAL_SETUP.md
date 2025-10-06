# Tower Farm Training Manual Integration

This guide explains how to set up and use the training manual search feature with your MCP server.

## Overview

The training manual integration allows Sage to search through your Tower Farm manuals and answer questions about tower farm design, construction, operations, maintenance, and best practices using semantic search with OpenAI embeddings.

## Setup Steps

### 1. Add OpenAI API Key

Add your OpenAI API key to `.env`:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

### 2. Run Database Migration

Execute the SQL migration to create the necessary tables and functions in Supabase:

```bash
# Copy the contents of migrations/create_training_manual_embeddings.sql
# and run it in your Supabase SQL editor
```

Or use the Supabase CLI:
```bash
supabase db push
```

### 3. Process the PDFs

Run the processing script to extract text, chunk it, and generate embeddings:

```bash
tsx scripts/process-training-manuals.ts
```

**Important:**
- This will take some time (several minutes per PDF)
- OpenAI API costs approximately $0.0001 per 1K tokens
- Estimated cost for 3 manuals: ~$2-5 depending on manual size
- The script has rate limiting built-in (100ms delay between requests)

### 4. Restart the MCP Server

After processing, restart your MCP server to use the new functionality:

```bash
npm run build
npm run start:server
```

## How It Works

### 1. PDF Processing (`scripts/process-training-manuals.ts`)

- Extracts text from PDFs using `pdf-parse`
- Chunks text into ~1000 character segments with 200 character overlap
- Generates embeddings using OpenAI's `text-embedding-ada-002` model
- Stores chunks and embeddings in Supabase

### 2. Search Function (`search_training_manual`)

When a question is asked:
1. Question is converted to an embedding (OpenAI)
2. Cosine similarity search finds most relevant chunks (Supabase pgvector)
3. Top 3-5 results are returned with relevance scores
4. SimpleSage formats the results for the user

### 3. Integration with SimpleSage

SimpleSage automatically detects training manual questions based on keywords like:
- "tower farm", "design", "construction", "build", "setup"
- "maintenance", "troubleshoot", "repair", "install"
- "system", "equipment", "manual", "guide"
- General questions about operations and best practices

## Usage Examples

Ask questions like:

- "How do I design a tower farm?"
- "What's the best practice for tower maintenance?"
- "How should I troubleshoot pH issues?"
- "What equipment do I need for construction?"
- "How do tower farm systems work?"

## Files Created

```
sproutify_farm_mcp/
├── migrations/
│   └── create_training_manual_embeddings.sql   # Database schema
├── scripts/
│   └── process-training-manuals.ts             # PDF processing script
├── src/
│   ├── server.ts                               # Added search_training_manual tool
│   └── services/
│       └── simpleSage.ts                       # Added manual question detection
└── TRAINING_MANUAL_SETUP.md                    # This file
```

## Database Schema

### Table: `training_manual_embeddings`

| Column         | Type         | Description                           |
|----------------|--------------|---------------------------------------|
| id             | UUID         | Primary key                           |
| farm_id        | UUID         | Farm ID (nullable for global manuals) |
| manual_name    | TEXT         | Name of the manual                    |
| section_title  | TEXT         | Chapter/section title                 |
| chunk_index    | INTEGER      | Order of chunks                       |
| content        | TEXT         | The actual text chunk                 |
| page_number    | INTEGER      | Page number in PDF                    |
| embedding      | vector(1536) | OpenAI embedding                      |
| metadata       | JSONB        | Additional info                       |
| created_at     | TIMESTAMP    | Creation timestamp                    |

### Function: `search_training_manual`

Searches manuals using cosine similarity on embeddings:

```sql
SELECT * FROM search_training_manual(
  query_embedding := [vector],
  match_threshold := 0.7,
  match_count := 5,
  filter_farm_id := NULL,
  filter_manual_name := NULL
);
```

## Cost Estimates

### One-time Processing Costs (OpenAI)
- Text extraction: Free (pdf-parse)
- Embedding generation: ~$0.0001 per 1K tokens
- Estimated total for 3 PDFs (~500 pages): **$2-5**

### Per-Query Costs (OpenAI)
- Each search query: ~$0.00002 (1 embedding)
- Extremely cheap for production use

### Storage (Supabase)
- ~500 KB per manual (text + embeddings)
- 3 manuals: ~1.5 MB total
- Negligible storage cost

## Troubleshooting

### "OPENAI_API_KEY not found"
Add your API key to `.env` file

### "File not found" during processing
Check that PDF paths in `process-training-manuals.ts` are correct

### "No relevant information found"
- Manuals may not have been processed yet
- Try more specific questions
- Lower the `match_threshold` in the code (currently 0.7)

### Slow response times
- Normal for first query (cold start)
- OpenAI embedding API typically responds in < 1 second
- Supabase vector search is very fast (< 100ms)

## Updating Manuals

To update or add new manuals:

1. Update `MANUAL_FILES` array in `scripts/process-training-manuals.ts`
2. Run: `tsx scripts/process-training-manuals.ts`
3. Script will clear old data and reprocess all manuals

## Advanced Configuration

### Adjust Chunk Size

In `scripts/process-training-manuals.ts`:

```typescript
const CHUNK_SIZE = 1000; // Increase for more context
const CHUNK_OVERLAP = 200; // Increase to reduce gaps
```

### Adjust Similarity Threshold

In `src/server.ts` (both handlers):

```typescript
match_threshold: 0.7,  // Lower = more results (less precise)
match_count: 5,        // Number of results to return
```

### Filter by Manual

Search specific manuals only:

```typescript
filter_manual_name: 'Part1 Design'
```

## Next Steps

- ✅ Manuals are integrated and searchable
- Consider adding more manuals (nutrients, pests, etc.)
- Monitor OpenAI API usage in production
- Collect user feedback on answer quality
- Fine-tune similarity thresholds based on results

## Support

For issues or questions:
- Check Supabase logs for database errors
- Check MCP server logs for search errors
- Review OpenAI API dashboard for quota/errors
