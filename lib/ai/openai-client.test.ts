import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// =============================================================================
// Mock OpenAI SDK (must be before imports due to hoisting)
// =============================================================================

// Mock create function - defined outside vi.mock to be accessible in tests
const mockCreate = vi.fn();

// Define error classes inside the mock factory
vi.mock("openai", () => {
  // Error classes defined inside the factory
  class APIError extends Error {
    status: number;
    code: string;
    constructor(message: string, status: number, code: string) {
      super(message);
      this.status = status;
      this.code = code;
      this.name = "APIError";
    }
  }

  class APIConnectionError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "APIConnectionError";
    }
  }

  class RateLimitError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "RateLimitError";
    }
  }

  class AuthenticationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "AuthenticationError";
    }
  }

  // Return the mock module
  return {
    default: class MockOpenAI {
      responses = {
        create: (...args: unknown[]) => mockCreate(...args),
      };

      constructor() {
        // Constructor doesn't need to do anything for tests
      }
    },
    APIError,
    APIConnectionError,
    RateLimitError,
    AuthenticationError,
  };
});

// Import after mock setup
import {
  ForacleAIClient,
  OpenAIClientError,
  resetAIClient,
  type Tool,
} from "./openai-client";

// =============================================================================
// Helper Types and Factories
// =============================================================================

// Mock response factory
const createMockResponse = (overrides: Partial<{
  id: string;
  status: string;
  output: Array<{
    type: string;
    content?: Array<{ type: string; text?: string }>;
    call_id?: string;
    name?: string;
    arguments?: string;
  }>;
  usage: { input_tokens: number; output_tokens: number; total_tokens: number } | null;
}> = {}) => ({
  id: overrides.id ?? "resp_123",
  status: overrides.status ?? "completed",
  output: overrides.output ?? [],
  usage: overrides.usage === undefined
    ? { input_tokens: 10, output_tokens: 20, total_tokens: 30 }
    : overrides.usage,
});

// Error factories for tests (these create errors compatible with the mocked OpenAI module)
const createAPIError = (message: string, status: number, code: string) => {
  const error = new Error(message) as Error & { status: number; code: string };
  error.name = "APIError";
  error.status = status;
  error.code = code;
  return error;
};

const createConnectionError = (message: string) => {
  const error = new Error(message);
  error.name = "APIConnectionError";
  return error;
};

const createAuthError = (message: string) => {
  const error = new Error(message);
  error.name = "AuthenticationError";
  return error;
};

// =============================================================================
// Test Suite
// =============================================================================

describe("ForacleAIClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAIClient();
    // Set API key for tests
    process.env.OPENAI_API_KEY = "test-api-key";
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  // ---------------------------------------------------------------------------
  // Initialization Tests
  // ---------------------------------------------------------------------------

  describe("initialization", () => {
    it("should throw error when API key is missing", () => {
      delete process.env.OPENAI_API_KEY;

      expect(() => new ForacleAIClient()).toThrow(OpenAIClientError);
      expect(() => new ForacleAIClient()).toThrow("OPENAI_API_KEY is required");
    });

    it("should accept API key from config", () => {
      delete process.env.OPENAI_API_KEY;

      const client = new ForacleAIClient({ apiKey: "config-api-key" });
      expect(client).toBeInstanceOf(ForacleAIClient);
    });

    it("should use environment API key when config not provided", () => {
      const client = new ForacleAIClient();
      expect(client).toBeInstanceOf(ForacleAIClient);
    });
  });

  // ---------------------------------------------------------------------------
  // Text Response Tests
  // ---------------------------------------------------------------------------

  describe("text responses", () => {
    it("should parse simple text response", async () => {
      mockCreate.mockResolvedValueOnce(
        createMockResponse({
          id: "resp_text_123",
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: "Hello, how can I help you?" }],
            },
          ],
        })
      );

      const client = new ForacleAIClient();
      const response = await client.createResponse({ input: "Hello" });

      expect(response.id).toBe("resp_text_123");
      expect(response.text).toBe("Hello, how can I help you?");
      expect(response.toolCalls).toHaveLength(0);
      expect(response.finishReason).toBe("stop");
    });

    it("should concatenate multiple text outputs", async () => {
      mockCreate.mockResolvedValueOnce(
        createMockResponse({
          output: [
            {
              type: "message",
              content: [
                { type: "output_text", text: "Part 1. " },
                { type: "output_text", text: "Part 2." },
              ],
            },
          ],
        })
      );

      const client = new ForacleAIClient();
      const response = await client.createResponse({ input: "Test" });

      expect(response.text).toBe("Part 1. Part 2.");
    });

    it("should return null text when no text output", async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse({ output: [] }));

      const client = new ForacleAIClient();
      const response = await client.createResponse({ input: "Test" });

      expect(response.text).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Tool Call Parsing Tests
  // ---------------------------------------------------------------------------

  describe("tool call parsing", () => {
    it("should parse single tool call with JSON arguments", async () => {
      mockCreate.mockResolvedValueOnce(
        createMockResponse({
          output: [
            {
              type: "function_call",
              call_id: "call_abc123",
              name: "getBudgetSummary",
              arguments: JSON.stringify({ year: 2025, month: 2 }),
            },
          ],
        })
      );

      const client = new ForacleAIClient();
      const response = await client.createResponse({ input: "What's my budget?" });

      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls[0]).toEqual({
        id: "call_abc123",
        name: "getBudgetSummary",
        arguments: { year: 2025, month: 2 },
      });
      expect(response.finishReason).toBe("tool_calls");
    });

    it("should parse multiple tool calls", async () => {
      mockCreate.mockResolvedValueOnce(
        createMockResponse({
          output: [
            {
              type: "function_call",
              call_id: "call_1",
              name: "getBudgetSummary",
              arguments: JSON.stringify({ year: 2025, month: 2 }),
            },
            {
              type: "function_call",
              call_id: "call_2",
              name: "getIncomes",
              arguments: JSON.stringify({}),
            },
          ],
        })
      );

      const client = new ForacleAIClient();
      const response = await client.createResponse({ input: "Compare my budget to income" });

      expect(response.toolCalls).toHaveLength(2);
      expect(response.toolCalls[0].name).toBe("getBudgetSummary");
      expect(response.toolCalls[1].name).toBe("getIncomes");
    });

    it("should handle malformed JSON arguments gracefully", async () => {
      mockCreate.mockResolvedValueOnce(
        createMockResponse({
          output: [
            {
              type: "function_call",
              call_id: "call_bad",
              name: "someFunction",
              arguments: "not valid json {",
            },
          ],
        })
      );

      const client = new ForacleAIClient();
      const response = await client.createResponse({ input: "Test" });

      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls[0].name).toBe("someFunction");
      expect(response.toolCalls[0].arguments).toEqual({ _raw: "not valid json {" });
    });

    it("should parse mixed text and tool calls", async () => {
      mockCreate.mockResolvedValueOnce(
        createMockResponse({
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: "Let me check that for you." }],
            },
            {
              type: "function_call",
              call_id: "call_mix",
              name: "getBudgetVsActual",
              arguments: JSON.stringify({ year: 2025, month: 2 }),
            },
          ],
        })
      );

      const client = new ForacleAIClient();
      const response = await client.createResponse({ input: "Am I on budget?" });

      expect(response.text).toBe("Let me check that for you.");
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls[0].name).toBe("getBudgetVsActual");
    });

    it("should handle complex nested arguments", async () => {
      const complexArgs = {
        filters: {
          categories: ["Food", "Transportation"],
          dateRange: { start: "2025-01-01", end: "2025-02-28" },
        },
        options: { includeSubcategories: true },
      };

      mockCreate.mockResolvedValueOnce(
        createMockResponse({
          output: [
            {
              type: "function_call",
              call_id: "call_complex",
              name: "getFilteredExpenses",
              arguments: JSON.stringify(complexArgs),
            },
          ],
        })
      );

      const client = new ForacleAIClient();
      const response = await client.createResponse({ input: "Filter my expenses" });

      expect(response.toolCalls[0].arguments).toEqual(complexArgs);
    });
  });

  // ---------------------------------------------------------------------------
  // Tool Definition Tests
  // ---------------------------------------------------------------------------

  describe("tool definitions", () => {
    it("should pass tools to API correctly", async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse());

      const tools: Tool[] = [
        {
          type: "function",
          function: {
            name: "getBudgetSummary",
            description: "Get budget summary for a month",
            parameters: {
              type: "object",
              properties: {
                year: { type: "number" },
                month: { type: "number" },
              },
              required: ["year", "month"],
            },
          },
        },
      ];

      const client = new ForacleAIClient();
      await client.createResponse({
        input: "What's my budget?",
        tools,
        tool_choice: "auto",
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: expect.arrayContaining([
            expect.objectContaining({
              type: "function",
              name: "getBudgetSummary",
            }),
          ]),
          tool_choice: "auto",
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Previous Response ID (Multi-turn) Tests
  // ---------------------------------------------------------------------------

  describe("multi-turn conversations", () => {
    it("should pass previous_response_id for conversation continuity", async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse({ id: "resp_turn2" }));

      const client = new ForacleAIClient();
      await client.createResponse({
        input: "What about last month?",
        previous_response_id: "resp_turn1",
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          previous_response_id: "resp_turn1",
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Retry Behavior Tests
  // ---------------------------------------------------------------------------

  describe("retry behavior", () => {
    it("should retry on 500 server error", async () => {
      mockCreate
        .mockRejectedValueOnce(createAPIError("Server error", 500, "server_error"))
        .mockResolvedValueOnce(createMockResponse({ id: "resp_retry_success" }));

      const client = new ForacleAIClient({ maxRetries: 1 });
      const response = await client.createResponse({ input: "Test" });

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(response.id).toBe("resp_retry_success");
    });

    it("should retry on connection error", async () => {
      mockCreate
        .mockRejectedValueOnce(createConnectionError("Connection failed"))
        .mockResolvedValueOnce(createMockResponse({ id: "resp_conn_success" }));

      const client = new ForacleAIClient({ maxRetries: 1 });
      const response = await client.createResponse({ input: "Test" });

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(response.id).toBe("resp_conn_success");
    });

    it("should not retry on authentication error", async () => {
      mockCreate.mockRejectedValueOnce(createAuthError("Invalid API key"));

      const client = new ForacleAIClient({ maxRetries: 2 });

      await expect(client.createResponse({ input: "Test" })).rejects.toThrow(
        OpenAIClientError
      );
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it("should exhaust retries and throw", async () => {
      mockCreate.mockRejectedValue(createAPIError("Server error", 500, "server_error"));

      const client = new ForacleAIClient({ maxRetries: 1 });

      await expect(client.createResponse({ input: "Test" })).rejects.toThrow(
        OpenAIClientError
      );
      expect(mockCreate).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  // ---------------------------------------------------------------------------
  // Usage Tracking Tests
  // ---------------------------------------------------------------------------

  describe("usage tracking", () => {
    it("should return token usage from response", async () => {
      mockCreate.mockResolvedValueOnce({
        id: "resp_usage",
        status: "completed",
        output: [],
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
      });

      const client = new ForacleAIClient();
      const response = await client.createResponse({ input: "Test" });

      expect(response.usage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      });
    });

    it("should handle missing usage data", async () => {
      mockCreate.mockResolvedValueOnce({
        id: "resp_no_usage",
        status: "completed",
        output: [],
        usage: null,
      });

      const client = new ForacleAIClient();
      const response = await client.createResponse({ input: "Test" });

      expect(response.usage).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Response Status Tests
  // ---------------------------------------------------------------------------

  describe("response status handling", () => {
    it("should set finish reason to 'length' for incomplete responses", async () => {
      mockCreate.mockResolvedValueOnce({
        id: "resp_incomplete",
        status: "incomplete",
        output: [],
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
      });

      const client = new ForacleAIClient();
      const response = await client.createResponse({ input: "Test" });

      expect(response.finishReason).toBe("length");
    });

    it("should set finish reason to 'error' for failed responses", async () => {
      mockCreate.mockResolvedValueOnce({
        id: "resp_failed",
        status: "failed",
        output: [],
        usage: { input_tokens: 10, output_tokens: 0, total_tokens: 10 },
      });

      const client = new ForacleAIClient();
      const response = await client.createResponse({ input: "Test" });

      expect(response.finishReason).toBe("error");
    });
  });

  // ---------------------------------------------------------------------------
  // Model Configuration Tests
  // ---------------------------------------------------------------------------

  describe("model configuration", () => {
    it("should use default model when not specified", async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse());

      const client = new ForacleAIClient();
      await client.createResponse({ input: "Test" });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: "gpt-4o" })
      );
    });

    it("should use custom model from config", async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse());

      const client = new ForacleAIClient({ defaultModel: "gpt-4o-mini" });
      await client.createResponse({ input: "Test" });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: "gpt-4o-mini" })
      );
    });

    it("should use model from request params over default", async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse());

      const client = new ForacleAIClient({ defaultModel: "gpt-4o" });
      await client.createResponse({ input: "Test", model: "gpt-4o-mini" });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: "gpt-4o-mini" })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Instructions Tests
  // ---------------------------------------------------------------------------

  describe("system instructions", () => {
    it("should pass instructions to API", async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse());

      const client = new ForacleAIClient();
      await client.createResponse({
        input: "What's my budget?",
        instructions: "You are a helpful financial assistant.",
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          instructions: "You are a helpful financial assistant.",
        })
      );
    });
  });
});
