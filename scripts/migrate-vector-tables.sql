-- Migration: Vector Search Tables with pgvector
-- This migration creates the knowledge base tables for semantic search

-- Enable pgvector extension (required for vector operations)
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- KB Chunks Table (Global Shared Knowledge)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "kb_chunks" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"doc_id" varchar(255) NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Btree indexes for filtering
CREATE INDEX IF NOT EXISTS "kb_chunks_doc_id_idx" ON "kb_chunks" USING btree ("doc_id");
CREATE INDEX IF NOT EXISTS "kb_chunks_created_at_idx" ON "kb_chunks" USING btree ("created_at");

-- HNSW index for fast approximate nearest neighbor search
-- Using cosine distance (vector_cosine_ops) which works well for normalized embeddings
-- m=16 and ef_construction=64 are good defaults for accuracy/performance balance
CREATE INDEX IF NOT EXISTS "kb_chunks_embedding_idx" ON "kb_chunks"
USING hnsw ("embedding" vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- =============================================================================
-- User Chunks Table (Private Per-User Knowledge)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "user_chunks" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"doc_id" varchar(255) NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_chunks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);

-- Btree indexes for filtering
CREATE INDEX IF NOT EXISTS "user_chunks_user_id_idx" ON "user_chunks" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "user_chunks_doc_id_idx" ON "user_chunks" USING btree ("doc_id");
CREATE INDEX IF NOT EXISTS "user_chunks_user_doc_idx" ON "user_chunks" USING btree ("user_id", "doc_id");
CREATE INDEX IF NOT EXISTS "user_chunks_created_at_idx" ON "user_chunks" USING btree ("created_at");

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS "user_chunks_embedding_idx" ON "user_chunks"
USING hnsw ("embedding" vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
