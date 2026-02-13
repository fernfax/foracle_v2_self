/**
 * Text Chunking Utility
 *
 * Splits text into smaller chunks suitable for embedding.
 * Supports multiple strategies and configurable overlap.
 *
 * Usage:
 *   const chunker = new TextChunker({ maxChunkSize: 500, overlap: 50 });
 *   const chunks = chunker.chunk(text);
 */

// =============================================================================
// Types
// =============================================================================

export interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  startChar: number;
  endChar: number;
  [key: string]: unknown;
}

export interface Chunk {
  content: string;
  metadata: ChunkMetadata;
}

export interface ChunkerConfig {
  /**
   * Maximum characters per chunk (default: 500)
   * Keep under ~512 tokens for most embedding models
   */
  maxChunkSize?: number;

  /**
   * Characters to overlap between chunks (default: 50)
   * Helps maintain context across chunk boundaries
   */
  overlap?: number;

  /**
   * Chunking strategy (default: "paragraph")
   * - "paragraph": Split on paragraph boundaries, then by size
   * - "sentence": Split on sentence boundaries, then by size
   * - "fixed": Fixed-size chunks with overlap
   */
  strategy?: "paragraph" | "sentence" | "fixed";

  /**
   * Additional metadata to add to all chunks
   */
  baseMetadata?: Record<string, unknown>;
}

// =============================================================================
// Text Chunker Class
// =============================================================================

export class TextChunker {
  private maxChunkSize: number;
  private overlap: number;
  private strategy: "paragraph" | "sentence" | "fixed";
  private baseMetadata: Record<string, unknown>;

  constructor(config: ChunkerConfig = {}) {
    this.maxChunkSize = config.maxChunkSize ?? 500;
    this.overlap = config.overlap ?? 50;
    this.strategy = config.strategy ?? "paragraph";
    this.baseMetadata = config.baseMetadata ?? {};
  }

  /**
   * Split text into chunks
   */
  chunk(text: string): Chunk[] {
    const normalizedText = this.normalizeText(text);

    let rawChunks: string[];
    switch (this.strategy) {
      case "paragraph":
        rawChunks = this.chunkByParagraph(normalizedText);
        break;
      case "sentence":
        rawChunks = this.chunkBySentence(normalizedText);
        break;
      case "fixed":
        rawChunks = this.chunkFixed(normalizedText);
        break;
      default:
        rawChunks = this.chunkByParagraph(normalizedText);
    }

    // Build chunks with metadata
    const totalChunks = rawChunks.length;
    let currentPosition = 0;

    return rawChunks.map((content, index) => {
      const startChar = currentPosition;
      const endChar = startChar + content.length;

      // Move position forward (account for any whitespace we might have trimmed)
      const nextStart = normalizedText.indexOf(content, currentPosition);
      if (nextStart !== -1) {
        currentPosition = nextStart + content.length;
      } else {
        currentPosition = endChar;
      }

      return {
        content,
        metadata: {
          ...this.baseMetadata,
          chunkIndex: index,
          totalChunks,
          startChar,
          endChar,
        },
      };
    });
  }

  /**
   * Normalize text by cleaning whitespace
   */
  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, "\n") // Normalize line endings
      .replace(/\t/g, " ") // Replace tabs with spaces
      .replace(/ +/g, " ") // Collapse multiple spaces
      .trim();
  }

  /**
   * Split by paragraphs, then by size if needed
   */
  private chunkByParagraph(text: string): string[] {
    // Split on double newlines (paragraph boundaries)
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());
    return this.mergeAndSplit(paragraphs);
  }

  /**
   * Split by sentences, then by size if needed
   */
  private chunkBySentence(text: string): string[] {
    // Simple sentence splitting (handles common cases)
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim());
    return this.mergeAndSplit(sentences);
  }

  /**
   * Fixed-size chunks with overlap
   */
  private chunkFixed(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.maxChunkSize, text.length);
      let chunk = text.slice(start, end);

      // Try to break at word boundary if not at end
      if (end < text.length) {
        const lastSpace = chunk.lastIndexOf(" ");
        if (lastSpace > this.maxChunkSize * 0.5) {
          chunk = chunk.slice(0, lastSpace);
        }
      }

      chunks.push(chunk.trim());
      start = start + chunk.length - this.overlap;

      // Prevent infinite loop
      if (start <= chunks.length - 1 && chunks.length > 1) {
        start = end;
      }
    }

    return chunks.filter((c) => c.length > 0);
  }

  /**
   * Merge small segments and split large ones
   */
  private mergeAndSplit(segments: string[]): string[] {
    const chunks: string[] = [];
    let currentChunk = "";

    for (const segment of segments) {
      const trimmed = segment.trim();
      if (!trimmed) continue;

      // If segment alone is too large, split it
      if (trimmed.length > this.maxChunkSize) {
        // First, save any accumulated content
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = "";
        }
        // Split the large segment
        const splitParts = this.chunkFixed(trimmed);
        chunks.push(...splitParts);
        continue;
      }

      // Check if adding this segment would exceed max size
      const potentialChunk = currentChunk
        ? `${currentChunk}\n\n${trimmed}`
        : trimmed;

      if (potentialChunk.length <= this.maxChunkSize) {
        currentChunk = potentialChunk;
      } else {
        // Save current chunk and start new one
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = trimmed;
      }
    }

    // Don't forget the last chunk
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Quick chunk function with default settings
 */
export function chunkText(
  text: string,
  config?: ChunkerConfig
): Chunk[] {
  const chunker = new TextChunker(config);
  return chunker.chunk(text);
}

/**
 * Chunk multiple documents
 */
export function chunkDocuments(
  documents: Array<{ id: string; content: string; metadata?: Record<string, unknown> }>
): Array<{ docId: string; chunks: Chunk[] }> {
  return documents.map((doc) => {
    const chunker = new TextChunker({
      baseMetadata: { docId: doc.id, ...doc.metadata },
    });
    return {
      docId: doc.id,
      chunks: chunker.chunk(doc.content),
    };
  });
}
