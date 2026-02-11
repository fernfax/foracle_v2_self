import OpenAI from "openai";

// =============================================================================
// Types
// =============================================================================

export interface Tool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface CreateResponseParams {
  input: string | Array<{ role: "user" | "assistant" | "system"; content: string }>;
  tools?: Tool[];
  tool_choice?: "auto" | "none" | "required" | { type: "function"; function: { name: string } };
  previous_response_id?: string;
  model?: string;
  instructions?: string;
}

export interface AIResponse {
  id: string;
  text: string | null;
  toolCalls: ToolCall[];
  finishReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null;
}

export interface OpenAIClientConfig {
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
  defaultModel?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_MODEL = "gpt-4o";

// Transient error codes that should trigger a retry
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// =============================================================================
// Logger (safe - no sensitive data)
// =============================================================================

type LogLevel = "debug" | "info" | "warn" | "error";

const log = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const safeMessage = `[${timestamp}] [OpenAI] [${level.toUpperCase()}] ${message}`;

  if (meta) {
    // Log only safe metadata, never payloads or API keys
    console[level](safeMessage, meta);
  } else {
    console[level](safeMessage);
  }
};

// =============================================================================
// Error Classes
// =============================================================================

export class OpenAIClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "OpenAIClientError";
  }
}

// =============================================================================
// OpenAI Client Wrapper
// =============================================================================

export class ForacleAIClient {
  private client: OpenAI;
  private timeout: number;
  private maxRetries: number;
  private defaultModel: string;

  constructor(config: OpenAIClientConfig = {}) {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new OpenAIClientError(
        "OPENAI_API_KEY is required. Set it in environment variables or pass via config.",
        "MISSING_API_KEY"
      );
    }

    this.client = new OpenAI({
      apiKey,
      timeout: config.timeout || DEFAULT_TIMEOUT_MS,
      maxRetries: 0, // We handle retries ourselves for better control
    });

    this.timeout = config.timeout || DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.defaultModel = config.defaultModel || DEFAULT_MODEL;
  }

  /**
   * Create a response using OpenAI's Responses API
   * Supports tools, multi-turn conversations via previous_response_id
   */
  async createResponse(params: CreateResponseParams): Promise<AIResponse> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          log("info", `Retry attempt ${attempt}/${this.maxRetries}`, {
            elapsed_ms: Date.now() - startTime,
          });
          // Exponential backoff: 1s, 2s, etc.
          await this.sleep(1000 * attempt);
        }

        const response = await this.executeRequest(params);

        log("info", "Response received", {
          response_id: response.id,
          has_text: !!response.text,
          tool_calls_count: response.toolCalls.length,
          finish_reason: response.finishReason,
          duration_ms: Date.now() - startTime,
        });

        return response;
      } catch (error) {
        lastError = error as Error;

        if (!this.isRetryable(error)) {
          log("error", "Non-retryable error", {
            error_code: (error as OpenAIClientError).code,
            attempt,
          });
          throw error;
        }

        log("warn", "Retryable error encountered", {
          error_message: (error as Error).message,
          attempt,
          will_retry: attempt < this.maxRetries,
        });
      }
    }

    // All retries exhausted
    throw lastError || new OpenAIClientError(
      "Request failed after all retries",
      "MAX_RETRIES_EXCEEDED",
      undefined,
      false
    );
  }

  /**
   * Execute the actual API request
   */
  private async executeRequest(params: CreateResponseParams): Promise<AIResponse> {
    const model = params.model || this.defaultModel;

    log("debug", "Sending request", {
      model,
      has_tools: !!params.tools?.length,
      tools_count: params.tools?.length || 0,
      has_previous_response: !!params.previous_response_id,
      input_type: typeof params.input === "string" ? "string" : "messages",
    });

    try {
      // Use the Responses API
      // Build tools in SDK-compatible format
      const tools = params.tools?.map((tool) => ({
        type: "function" as const,
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters as Record<string, unknown>,
        strict: false,
      }));

      // Build request params
      const requestParams: Parameters<typeof this.client.responses.create>[0] = {
        model,
        input: params.input,
        instructions: params.instructions,
        tools,
        previous_response_id: params.previous_response_id,
      };

      // Add tool_choice if specified (cast to any to work around SDK type strictness)
      if (params.tool_choice) {
        if (typeof params.tool_choice === "string") {
          // "auto", "none", "required"
          (requestParams as Record<string, unknown>).tool_choice = params.tool_choice;
        } else if (params.tool_choice.type === "function") {
          (requestParams as Record<string, unknown>).tool_choice = {
            type: "function",
            name: params.tool_choice.function.name,
          };
        }
      }

      const response = await this.client.responses.create(requestParams);

      // Handle the response (non-streaming)
      return this.parseResponse(response as OpenAI.Responses.Response);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * Parse the OpenAI response into our standardized format
   */
  private parseResponse(response: OpenAI.Responses.Response): AIResponse {
    let text: string | null = null;
    const toolCalls: ToolCall[] = [];

    // Extract text and tool calls from output items
    for (const item of response.output || []) {
      if (item.type === "message") {
        // Extract text content from message
        for (const content of item.content || []) {
          if (content.type === "output_text") {
            text = (text || "") + content.text;
          }
        }
      } else if (item.type === "function_call") {
        try {
          toolCalls.push({
            id: item.call_id,
            name: item.name,
            arguments: JSON.parse(item.arguments),
          });
        } catch {
          log("warn", "Failed to parse tool call arguments", {
            tool_name: item.name,
            call_id: item.call_id,
          });
          // Include with raw string as fallback
          toolCalls.push({
            id: item.call_id,
            name: item.name,
            arguments: { _raw: item.arguments },
          });
        }
      }
    }

    // Determine finish reason from status
    let finishReason = "unknown";
    if (response.status === "completed") {
      finishReason = toolCalls.length > 0 ? "tool_calls" : "stop";
    } else if (response.status === "incomplete") {
      finishReason = "length";
    } else if (response.status === "failed") {
      finishReason = "error";
    }

    return {
      id: response.id,
      text,
      toolCalls,
      finishReason,
      usage: response.usage
        ? {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : null,
    };
  }

  /**
   * Wrap errors with appropriate error class
   * Uses error name checking for compatibility with both real SDK and test mocks
   */
  private wrapError(error: unknown): OpenAIClientError {
    if (!(error instanceof Error)) {
      return new OpenAIClientError(String(error), "UNKNOWN_ERROR", undefined, false);
    }

    const errorName = error.name;
    const errorWithStatus = error as Error & { status?: number; code?: string };

    // API errors (including rate limits, server errors, etc.)
    if (errorName === "APIError") {
      const status = errorWithStatus.status || 0;
      const retryable = RETRYABLE_STATUS_CODES.includes(status);
      return new OpenAIClientError(
        error.message,
        errorWithStatus.code || "API_ERROR",
        status,
        retryable
      );
    }

    // Connection errors are retryable
    if (errorName === "APIConnectionError") {
      return new OpenAIClientError(
        "Connection failed to OpenAI API",
        "CONNECTION_ERROR",
        undefined,
        true
      );
    }

    // Rate limit errors are retryable
    if (errorName === "RateLimitError") {
      return new OpenAIClientError(
        "Rate limit exceeded",
        "RATE_LIMIT",
        429,
        true
      );
    }

    // Authentication errors are not retryable
    if (errorName === "AuthenticationError") {
      return new OpenAIClientError(
        "Authentication failed - check your API key",
        "AUTH_ERROR",
        401,
        false
      );
    }

    // Unknown error
    return new OpenAIClientError(error.message, "UNKNOWN_ERROR", undefined, false);
  }

  /**
   * Check if an error is retryable
   */
  private isRetryable(error: unknown): boolean {
    if (error instanceof OpenAIClientError) {
      return error.retryable;
    }
    return false;
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =============================================================================
// Singleton instance
// =============================================================================

let clientInstance: ForacleAIClient | null = null;

/**
 * Get the singleton OpenAI client instance
 * Lazily initialized on first use
 */
export function getAIClient(config?: OpenAIClientConfig): ForacleAIClient {
  if (!clientInstance || config) {
    clientInstance = new ForacleAIClient(config);
  }
  return clientInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetAIClient(): void {
  clientInstance = null;
}
