/**
 * Embeddings Client with Provider Adapter Pattern
 *
 * Supports multiple embedding providers:
 * - Voyage AI (default): voyage-3-lite (512 dimensions)
 * - OpenAI: text-embedding-3-small (1536 dimensions)
 *
 * Usage:
 *   const client = getEmbeddingsClient();
 *   const embedding = await client.embed("Hello world");
 *   const embeddings = await client.embedBatch(["Hello", "World"]);
 */

// =============================================================================
// Types
// =============================================================================

export interface EmbeddingResult {
  embedding: number[];
  tokenCount?: number;
}

export interface EmbeddingProvider {
  name: string;
  dimensions: number;
  embed(text: string): Promise<EmbeddingResult>;
  embedBatch(texts: string[]): Promise<EmbeddingResult[]>;
}

export type ProviderType = "voyage" | "openai";

// =============================================================================
// Voyage AI Provider
// =============================================================================

class VoyageAIProvider implements EmbeddingProvider {
  readonly name = "voyage-ai";
  readonly dimensions = 512; // voyage-3-lite outputs 512 dimensions
  private apiKey: string;
  private model: string;
  private baseUrl = "https://api.voyageai.com/v1";

  constructor(apiKey: string, model: string = "voyage-3-lite") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
        input_type: "document", // Use "query" for search queries
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Voyage AI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return data.data.map((item: { embedding: number[]; index: number }) => ({
      embedding: item.embedding,
      tokenCount: undefined, // Voyage AI doesn't return token counts per embedding
    }));
  }

  // Separate method for query embeddings (optimized for search)
  async embedQuery(text: string): Promise<EmbeddingResult> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: [text],
        input_type: "query",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Voyage AI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      embedding: data.data[0].embedding,
      tokenCount: undefined,
    };
  }
}

// =============================================================================
// OpenAI Provider
// =============================================================================

class OpenAIProvider implements EmbeddingProvider {
  readonly name = "openai";
  readonly dimensions = 1536; // text-embedding-3-small outputs 1536 dimensions
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "text-embedding-3-small") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Sort by index to ensure order matches input
    const sorted = data.data.sort(
      (a: { index: number }, b: { index: number }) => a.index - b.index
    );

    return sorted.map(
      (item: { embedding: number[]; index: number }, idx: number) => ({
        embedding: item.embedding,
        tokenCount: data.usage?.prompt_tokens
          ? Math.floor(data.usage.prompt_tokens / texts.length)
          : undefined,
      })
    );
  }
}

// =============================================================================
// Client Factory
// =============================================================================

export interface EmbeddingsClientConfig {
  provider?: ProviderType;
  apiKey?: string;
  model?: string;
}

export class EmbeddingsClient {
  private provider: EmbeddingProvider;

  constructor(config: EmbeddingsClientConfig = {}) {
    const providerType = config.provider ?? this.detectProvider();

    if (providerType === "voyage") {
      const apiKey = config.apiKey ?? process.env.VOYAGE_API_KEY;
      if (!apiKey) {
        throw new Error(
          "Voyage AI API key not found. Set VOYAGE_API_KEY environment variable or pass apiKey in config."
        );
      }
      this.provider = new VoyageAIProvider(apiKey, config.model);
    } else {
      const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "OpenAI API key not found. Set OPENAI_API_KEY environment variable or pass apiKey in config."
        );
      }
      this.provider = new OpenAIProvider(apiKey, config.model);
    }
  }

  private detectProvider(): ProviderType {
    // Prefer Voyage AI if key is available, otherwise fall back to OpenAI
    if (process.env.VOYAGE_API_KEY) {
      return "voyage";
    }
    if (process.env.OPENAI_API_KEY) {
      return "openai";
    }
    throw new Error(
      "No embedding API key found. Set either VOYAGE_API_KEY or OPENAI_API_KEY."
    );
  }

  get name(): string {
    return this.provider.name;
  }

  get dimensions(): number {
    return this.provider.dimensions;
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    const result = await this.provider.embed(text);
    return result.embedding;
  }

  /**
   * Generate embeddings for multiple texts (batched for efficiency)
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    // Process in batches of 100 (API limits)
    const batchSize = 100;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await this.provider.embedBatch(batch);
      results.push(...batchResults.map((r) => r.embedding));
    }

    return results;
  }

  /**
   * Generate embedding optimized for search queries
   * (Only different for Voyage AI, same as embed() for OpenAI)
   */
  async embedQuery(text: string): Promise<number[]> {
    if (this.provider instanceof VoyageAIProvider) {
      const result = await (this.provider as VoyageAIProvider).embedQuery(text);
      return result.embedding;
    }
    return this.embed(text);
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let embeddingsClient: EmbeddingsClient | null = null;

export function getEmbeddingsClient(
  config?: EmbeddingsClientConfig
): EmbeddingsClient {
  if (!embeddingsClient || config) {
    embeddingsClient = new EmbeddingsClient(config);
  }
  return embeddingsClient;
}

export function resetEmbeddingsClient(): void {
  embeddingsClient = null;
}
