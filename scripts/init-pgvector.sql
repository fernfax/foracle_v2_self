-- Initialize pgvector extension
-- This runs automatically when the Postgres container starts for the first time

CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
