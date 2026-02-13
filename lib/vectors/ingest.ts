/**
 * Document Ingestion Module
 *
 * Handles chunking, embedding, and storing documents in the vector database.
 *
 * Usage:
 *   // Ingest to global knowledge base
 *   await ingestToKnowledgeBase({
 *     docId: "cpf-guide",
 *     content: "CPF is...",
 *     metadata: { source: "official-docs" }
 *   });
 *
 *   // Ingest to user-private store
 *   await ingestToUserStore(userId, {
 *     docId: "my-notes",
 *     content: "Personal notes...",
 *   });
 */

import { db } from "@/db";
import { kbChunks, userChunks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getEmbeddingsClient } from "./embeddings";
import { TextChunker, type ChunkerConfig } from "./chunker";
import { nanoid } from "nanoid";

// =============================================================================
// Types
// =============================================================================

export interface DocumentInput {
  /** Unique identifier for the document */
  docId: string;
  /** Text content to ingest */
  content: string;
  /** Optional metadata to store with chunks */
  metadata?: Record<string, unknown>;
}

export interface IngestOptions {
  /** Chunking configuration */
  chunkerConfig?: ChunkerConfig;
  /** Replace existing chunks for this docId (default: true) */
  replaceExisting?: boolean;
  /** Skip embedding generation (for testing) */
  skipEmbeddings?: boolean;
}

export interface IngestResult {
  docId: string;
  chunksCreated: number;
  embeddingsGenerated: number;
}

// =============================================================================
// Knowledge Base Ingestion (Global)
// =============================================================================

/**
 * Ingest a document into the global knowledge base
 * Available to all users for semantic search
 */
export async function ingestToKnowledgeBase(
  document: DocumentInput,
  options: IngestOptions = {}
): Promise<IngestResult> {
  const { chunkerConfig, replaceExisting = true, skipEmbeddings = false } = options;

  // Delete existing chunks if replacing
  if (replaceExisting) {
    await db.delete(kbChunks).where(eq(kbChunks.docId, document.docId));
  }

  // Chunk the document
  const chunker = new TextChunker({
    ...chunkerConfig,
    baseMetadata: document.metadata,
  });
  const chunks = chunker.chunk(document.content);

  if (chunks.length === 0) {
    return { docId: document.docId, chunksCreated: 0, embeddingsGenerated: 0 };
  }

  // Generate embeddings
  let embeddings: number[][] = [];
  if (!skipEmbeddings) {
    const client = getEmbeddingsClient();
    embeddings = await client.embedBatch(chunks.map((c) => c.content));
  }

  // Insert chunks
  const records = chunks.map((chunk, idx) => ({
    id: nanoid(),
    docId: document.docId,
    chunkIndex: chunk.metadata.chunkIndex,
    content: chunk.content,
    embedding: skipEmbeddings ? null : embeddings[idx],
    metadata: chunk.metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await db.insert(kbChunks).values(records);

  return {
    docId: document.docId,
    chunksCreated: chunks.length,
    embeddingsGenerated: skipEmbeddings ? 0 : embeddings.length,
  };
}

/**
 * Batch ingest multiple documents to knowledge base
 */
export async function ingestBatchToKnowledgeBase(
  documents: DocumentInput[],
  options: IngestOptions = {}
): Promise<IngestResult[]> {
  const results: IngestResult[] = [];
  for (const doc of documents) {
    const result = await ingestToKnowledgeBase(doc, options);
    results.push(result);
  }
  return results;
}

// =============================================================================
// User Store Ingestion (Private)
// =============================================================================

/**
 * Ingest a document into a user's private store
 * Multi-tenant safe: chunks are tagged with userId
 */
export async function ingestToUserStore(
  userId: string,
  document: DocumentInput,
  options: IngestOptions = {}
): Promise<IngestResult> {
  if (!userId) {
    throw new Error("userId is required for user store ingestion");
  }

  const { chunkerConfig, replaceExisting = true, skipEmbeddings = false } = options;

  // Delete existing chunks for this user and docId if replacing
  if (replaceExisting) {
    await db
      .delete(userChunks)
      .where(and(eq(userChunks.userId, userId), eq(userChunks.docId, document.docId)));
  }

  // Chunk the document
  const chunker = new TextChunker({
    ...chunkerConfig,
    baseMetadata: { ...document.metadata, userId },
  });
  const chunks = chunker.chunk(document.content);

  if (chunks.length === 0) {
    return { docId: document.docId, chunksCreated: 0, embeddingsGenerated: 0 };
  }

  // Generate embeddings
  let embeddings: number[][] = [];
  if (!skipEmbeddings) {
    const client = getEmbeddingsClient();
    embeddings = await client.embedBatch(chunks.map((c) => c.content));
  }

  // Insert chunks with userId
  const records = chunks.map((chunk, idx) => ({
    id: nanoid(),
    userId,
    docId: document.docId,
    chunkIndex: chunk.metadata.chunkIndex,
    content: chunk.content,
    embedding: skipEmbeddings ? null : embeddings[idx],
    metadata: chunk.metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await db.insert(userChunks).values(records);

  return {
    docId: document.docId,
    chunksCreated: chunks.length,
    embeddingsGenerated: skipEmbeddings ? 0 : embeddings.length,
  };
}

/**
 * Batch ingest multiple documents to user store
 */
export async function ingestBatchToUserStore(
  userId: string,
  documents: DocumentInput[],
  options: IngestOptions = {}
): Promise<IngestResult[]> {
  const results: IngestResult[] = [];
  for (const doc of documents) {
    const result = await ingestToUserStore(userId, doc, options);
    results.push(result);
  }
  return results;
}

// =============================================================================
// Document Management
// =============================================================================

/**
 * Delete a document from the knowledge base
 */
export async function deleteFromKnowledgeBase(docId: string): Promise<void> {
  await db.delete(kbChunks).where(eq(kbChunks.docId, docId));
}

/**
 * Delete a document from a user's store
 * Multi-tenant safe: only deletes chunks belonging to the user
 */
export async function deleteFromUserStore(
  userId: string,
  docId: string
): Promise<void> {
  if (!userId) {
    throw new Error("userId is required for user store deletion");
  }

  await db
    .delete(userChunks)
    .where(and(eq(userChunks.userId, userId), eq(userChunks.docId, docId)));
}

/**
 * List all documents in the knowledge base
 */
export async function listKnowledgeBaseDocs(): Promise<
  Array<{ docId: string; chunkCount: number }>
> {
  const results = await db
    .select({
      docId: kbChunks.docId,
    })
    .from(kbChunks)
    .groupBy(kbChunks.docId);

  // Get chunk counts
  const docs = await Promise.all(
    [...new Set(results.map((r) => r.docId))].map(async (docId) => {
      const chunks = await db
        .select({ id: kbChunks.id })
        .from(kbChunks)
        .where(eq(kbChunks.docId, docId));
      return { docId, chunkCount: chunks.length };
    })
  );

  return docs;
}

/**
 * List all documents in a user's store
 * Multi-tenant safe: only lists documents belonging to the user
 */
export async function listUserStoreDocs(
  userId: string
): Promise<Array<{ docId: string; chunkCount: number }>> {
  if (!userId) {
    throw new Error("userId is required for listing user store documents");
  }

  const results = await db
    .select({
      docId: userChunks.docId,
    })
    .from(userChunks)
    .where(eq(userChunks.userId, userId))
    .groupBy(userChunks.docId);

  // Get chunk counts
  const docs = await Promise.all(
    [...new Set(results.map((r) => r.docId))].map(async (docId) => {
      const chunks = await db
        .select({ id: userChunks.id })
        .from(userChunks)
        .where(and(eq(userChunks.userId, userId), eq(userChunks.docId, docId)));
      return { docId, chunkCount: chunks.length };
    })
  );

  return docs;
}
