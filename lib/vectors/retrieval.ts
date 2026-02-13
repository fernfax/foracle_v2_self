/**
 * Vector Retrieval Module
 *
 * Handles semantic search across knowledge base and user chunks.
 * Multi-tenant safe with user_id filtering for private data.
 *
 * Usage:
 *   const results = await searchKnowledgeBase("What is CPF?", { limit: 5 });
 *   const userResults = await searchUserChunks(userId, "my notes", { limit: 10 });
 */

import { db } from "@/db";
import { kbChunks, userChunks } from "@/db/schema";
import { sql, and, eq, desc } from "drizzle-orm";
import { getEmbeddingsClient } from "./embeddings";

// =============================================================================
// Types
// =============================================================================

export interface SearchResult {
  id: string;
  docId: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
}

export interface SearchOptions {
  /** Maximum number of results (default: 5) */
  limit?: number;
  /** Minimum similarity threshold 0-1 (default: 0.5) */
  minSimilarity?: number;
  /** Filter by document ID */
  docId?: string;
}

// =============================================================================
// Search Functions
// =============================================================================

/**
 * Search the global knowledge base (kb_chunks)
 * Available to all users
 */
export async function searchKnowledgeBase(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 5, minSimilarity = 0.5, docId } = options;

  const client = getEmbeddingsClient();
  const queryEmbedding = await client.embedQuery(query);

  // Build the similarity search query using cosine distance
  // pgvector uses <=> for cosine distance (1 - cosine_similarity)
  // So we compute 1 - distance to get similarity
  const similarityExpr = sql<number>`1 - (${kbChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`;

  const conditions = [];
  if (docId) {
    conditions.push(eq(kbChunks.docId, docId));
  }

  // Only search chunks that have embeddings
  conditions.push(sql`${kbChunks.embedding} IS NOT NULL`);

  const results = await db
    .select({
      id: kbChunks.id,
      docId: kbChunks.docId,
      chunkIndex: kbChunks.chunkIndex,
      content: kbChunks.content,
      metadata: kbChunks.metadata,
      similarity: similarityExpr,
    })
    .from(kbChunks)
    .where(and(...conditions))
    .orderBy(desc(similarityExpr))
    .limit(limit);

  // Filter by minimum similarity
  return results
    .filter((r) => r.similarity >= minSimilarity)
    .map((r) => ({
      id: r.id,
      docId: r.docId,
      chunkIndex: r.chunkIndex,
      content: r.content,
      metadata: r.metadata as Record<string, unknown> | null,
      similarity: r.similarity,
    }));
}

/**
 * Search user-private chunks (user_chunks)
 * Multi-tenant safe: only returns chunks belonging to the specified user
 */
export async function searchUserChunks(
  userId: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  if (!userId) {
    throw new Error("userId is required for user chunk search");
  }

  const { limit = 5, minSimilarity = 0.5, docId } = options;

  const client = getEmbeddingsClient();
  const queryEmbedding = await client.embedQuery(query);

  const similarityExpr = sql<number>`1 - (${userChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`;

  // CRITICAL: Always filter by user_id for multi-tenant safety
  const conditions = [eq(userChunks.userId, userId)];

  if (docId) {
    conditions.push(eq(userChunks.docId, docId));
  }

  // Only search chunks that have embeddings
  conditions.push(sql`${userChunks.embedding} IS NOT NULL`);

  const results = await db
    .select({
      id: userChunks.id,
      docId: userChunks.docId,
      chunkIndex: userChunks.chunkIndex,
      content: userChunks.content,
      metadata: userChunks.metadata,
      similarity: similarityExpr,
    })
    .from(userChunks)
    .where(and(...conditions))
    .orderBy(desc(similarityExpr))
    .limit(limit);

  return results
    .filter((r) => r.similarity >= minSimilarity)
    .map((r) => ({
      id: r.id,
      docId: r.docId,
      chunkIndex: r.chunkIndex,
      content: r.content,
      metadata: r.metadata as Record<string, unknown> | null,
      similarity: r.similarity,
    }));
}

/**
 * Combined search across both knowledge base and user chunks
 * Returns results from both sources, sorted by similarity
 */
export async function searchAll(
  userId: string,
  query: string,
  options: SearchOptions = {}
): Promise<Array<SearchResult & { source: "kb" | "user" }>> {
  const { limit = 10, minSimilarity = 0.7 } = options;

  // Search both sources in parallel
  const [kbResults, userResults] = await Promise.all([
    searchKnowledgeBase(query, { ...options, limit }),
    searchUserChunks(userId, query, { ...options, limit }),
  ]);

  // Combine and sort by similarity
  const combined = [
    ...kbResults.map((r) => ({ ...r, source: "kb" as const })),
    ...userResults.map((r) => ({ ...r, source: "user" as const })),
  ]
    .filter((r) => r.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return combined;
}

// =============================================================================
// Context Building for AI
// =============================================================================

/**
 * Build context string from search results for AI prompts
 * Formats results into a readable context block
 */
export function buildContextFromResults(
  results: SearchResult[],
  options: { maxLength?: number; includeMetadata?: boolean } = {}
): string {
  const { maxLength = 4000, includeMetadata = false } = options;

  if (results.length === 0) {
    return "";
  }

  const contextParts: string[] = [];
  let currentLength = 0;

  for (const result of results) {
    const header = `[Source: ${result.docId}, Chunk ${result.chunkIndex + 1}]`;
    const metadata = includeMetadata && result.metadata
      ? `\nMetadata: ${JSON.stringify(result.metadata)}`
      : "";
    const entry = `${header}${metadata}\n${result.content}`;

    if (currentLength + entry.length > maxLength) {
      break;
    }

    contextParts.push(entry);
    currentLength += entry.length + 2; // +2 for separator
  }

  return contextParts.join("\n\n---\n\n");
}
