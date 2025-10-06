-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table for training manual chunks with embeddings
CREATE TABLE IF NOT EXISTS training_manual_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID, -- Optional farm_id for farm-specific manuals (NULL for global)
  manual_name TEXT NOT NULL, -- e.g., "Part1 Design", "Part2 Operations", etc.
  section_title TEXT, -- Chapter or section title
  chunk_index INTEGER NOT NULL, -- Order of chunks within the document
  content TEXT NOT NULL, -- The actual text chunk
  page_number INTEGER, -- Page number in the PDF
  embedding vector(1536), -- OpenAI ada-002 produces 1536 dimensions
  metadata JSONB, -- Additional metadata (file path, date processed, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on embedding column for fast similarity search
CREATE INDEX IF NOT EXISTS training_manual_embeddings_embedding_idx
  ON training_manual_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create index on farm_id for filtering
CREATE INDEX IF NOT EXISTS training_manual_embeddings_farm_id_idx
  ON training_manual_embeddings(farm_id);

-- Create index on manual_name for filtering
CREATE INDEX IF NOT EXISTS training_manual_embeddings_manual_name_idx
  ON training_manual_embeddings(manual_name);

-- Function to search training manual
CREATE OR REPLACE FUNCTION search_training_manual(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_farm_id UUID DEFAULT NULL,
  filter_manual_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  manual_name TEXT,
  section_title TEXT,
  content TEXT,
  page_number INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    training_manual_embeddings.id,
    training_manual_embeddings.manual_name,
    training_manual_embeddings.section_title,
    training_manual_embeddings.content,
    training_manual_embeddings.page_number,
    1 - (training_manual_embeddings.embedding <=> query_embedding) AS similarity
  FROM training_manual_embeddings
  WHERE
    (filter_farm_id IS NULL OR training_manual_embeddings.farm_id = filter_farm_id)
    AND (filter_manual_name IS NULL OR training_manual_embeddings.manual_name = filter_manual_name)
    AND 1 - (training_manual_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY training_manual_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add RLS (Row Level Security) policies
ALTER TABLE training_manual_embeddings ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read global manuals
CREATE POLICY "Users can read global training manuals"
  ON training_manual_embeddings
  FOR SELECT
  USING (farm_id IS NULL OR true); -- All manuals are global for now

-- Policy: Service role can do everything
CREATE POLICY "Service role full access"
  ON training_manual_embeddings
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE training_manual_embeddings IS 'Stores chunked training manual content with vector embeddings for semantic search';
COMMENT ON COLUMN training_manual_embeddings.embedding IS 'Vector embedding using OpenAI text-embedding-ada-002 (1536 dimensions)';
COMMENT ON FUNCTION search_training_manual IS 'Searches training manual using cosine similarity on embeddings';
