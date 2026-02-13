/**
 * Vector Search Module
 *
 * Provides semantic search capabilities using pgvector with Postgres.
 * Supports multiple embedding providers (Voyage AI, OpenAI).
 *
 * ## Quick Start
 *
 * ```typescript
 * import { searchKnowledgeBase, ingestToKnowledgeBase } from "@/lib/vectors";
 *
 * // Ingest a document
 * await ingestToKnowledgeBase({
 *   docId: "cpf-guide",
 *   content: "CPF is Singapore's mandatory savings scheme...",
 *   metadata: { source: "official" }
 * });
 *
 * // Search
 * const results = await searchKnowledgeBase("What is CPF?");
 * ```
 *
 * ## Multi-tenant User Data
 *
 * ```typescript
 * import { searchUserChunks, ingestToUserStore } from "@/lib/vectors";
 *
 * // User's private documents
 * await ingestToUserStore(userId, {
 *   docId: "my-notes",
 *   content: "Personal financial notes..."
 * });
 *
 * // Search only user's data
 * const results = await searchUserChunks(userId, "financial goals");
 * ```
 */

// Embeddings
export {
  EmbeddingsClient,
  getEmbeddingsClient,
  resetEmbeddingsClient,
  type EmbeddingProvider,
  type EmbeddingResult,
  type EmbeddingsClientConfig,
  type ProviderType,
} from "./embeddings";

// Chunking
export {
  TextChunker,
  chunkText,
  chunkDocuments,
  type Chunk,
  type ChunkMetadata,
  type ChunkerConfig,
} from "./chunker";

// Retrieval
export {
  searchKnowledgeBase,
  searchUserChunks,
  searchAll,
  buildContextFromResults,
  type SearchResult,
  type SearchOptions,
} from "./retrieval";

// Ingestion
export {
  ingestToKnowledgeBase,
  ingestBatchToKnowledgeBase,
  ingestToUserStore,
  ingestBatchToUserStore,
  deleteFromKnowledgeBase,
  deleteFromUserStore,
  listKnowledgeBaseDocs,
  listUserStoreDocs,
  type DocumentInput,
  type IngestOptions,
  type IngestResult,
} from "./ingest";
