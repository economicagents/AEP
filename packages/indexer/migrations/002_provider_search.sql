-- Hybrid lexical (tsvector) + optional embedding (pgvector) per dataset + agent.
-- Dimension is enforced in application (default 1536 for text-embedding-3-small).

CREATE TABLE IF NOT EXISTS provider_search (
  dataset_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  search_document TEXT NOT NULL,
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(search_document, ''))) STORED,
  embedding vector(1536),
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (dataset_id, agent_id)
);

CREATE INDEX IF NOT EXISTS provider_search_tsv_idx ON provider_search USING GIN (tsv);

-- Cosine distance; partial index skips NULL embeddings
CREATE INDEX IF NOT EXISTS provider_search_embedding_hnsw_idx ON provider_search
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE embedding IS NOT NULL;
