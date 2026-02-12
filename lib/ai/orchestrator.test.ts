import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AIOrchestrator, resetOrchestrator } from "./orchestrator";
import { resetToolRegistry } from "./tools";
import type { ForacleAIClient, AIResponse } from "./openai-client";

// =============================================================================
// Mock Setup
// =============================================================================

// Mock the tool executors
vi.mock("./tools/executors", () => ({
  executeTool: vi.fn(),
  getAuditLog: vi.fn(() => []),
  clearAuditLog: vi.fn(),
}));

// Mock auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: "test-user-123" })),
}));

// Import the mocked executeTool
import { executeTool } from "./tools/executors";
const mockExecuteTool = vi.mocked(executeTool);

// =============================================================================
// Test Helpers
// =============================================================================

function createMockClient(responses: AIResponse[]): ForacleAIClient {
  let callIndex = 0;
  return {
    createResponse: vi.fn(async () => {
      const response = responses[callIndex] || responses[responses.length - 1];
      callIndex++;
      return response;
    }),
  } as unknown as ForacleAIClient;
}

function createTextResponse(text: string, id = "resp_1"): AIResponse {
  return {
    id,
    text,
    toolCalls: [],
    finishReason: "stop",
    usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
  };
}

function createToolCallResponse(
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>,
  id = "resp_tool"
): AIResponse {
  return {
    id,
    text: null,
    toolCalls,
    finishReason: "tool_calls",
    usage: { inputTokens: 15, outputTokens: 25, totalTokens: 40 },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("AIOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetOrchestrator();
    resetToolRegistry();
  });

  afterEach(() => {
    resetOrchestrator();
  });

  // ---------------------------------------------------------------------------
  // Basic Conversation
  // ---------------------------------------------------------------------------

  describe("basic conversation", () => {
    it("should return text response without tool calls", async () => {
      const mockClient = createMockClient([
        createTextResponse("Your budget is looking good this month!"),
      ]);

      const orchestrator = new AIOrchestrator({ client: mockClient });
      const result = await orchestrator.chat("How am I doing?");

      expect(result.response).toBe("Your budget is looking good this month!");
      expect(result.toolsUsed).toHaveLength(0);
      expect(result.conversationId).toBeDefined();
    });

    it("should create new conversation if no ID provided", async () => {
      const mockClient = createMockClient([createTextResponse("Hello!")]);

      const orchestrator = new AIOrchestrator({ client: mockClient });
      const result1 = await orchestrator.chat("Hi");
      const result2 = await orchestrator.chat("Hello again");

      expect(result1.conversationId).not.toBe(result2.conversationId);
    });

    it("should continue existing conversation with same ID", async () => {
      const mockClient = createMockClient([
        createTextResponse("First response"),
        createTextResponse("Second response"),
      ]);

      const orchestrator = new AIOrchestrator({ client: mockClient });
      const result1 = await orchestrator.chat("First message");
      const result2 = await orchestrator.chat("Second message", result1.conversationId);

      expect(result2.conversationId).toBe(result1.conversationId);

      // Check that previous_response_id was passed
      expect(mockClient.createResponse).toHaveBeenCalledTimes(2);
      const secondCall = (mockClient.createResponse as ReturnType<typeof vi.fn>).mock.calls[1][0];
      expect(secondCall.previous_response_id).toBe(result1.responseId);
    });
  });

  // ---------------------------------------------------------------------------
  // Tool Call Loop
  // ---------------------------------------------------------------------------

  describe("tool call loop", () => {
    it("should execute single tool call and return final response", async () => {
      mockExecuteTool.mockResolvedValueOnce({
        success: true,
        data: {
          month: "2025-02",
          totalBudget: 5000,
          totalSpent: 2500,
          remaining: 2500,
          percentUsed: 50,
          dailyBudgetTarget: 100,
          pacingStatus: "on-track",
          daysInMonth: 28,
          currentDay: 15,
        },
        toolName: "get_remaining_budget",
        durationMs: 50,
      });

      const mockClient = createMockClient([
        createToolCallResponse([
          {
            id: "call_1",
            name: "get_remaining_budget",
            arguments: { month: "2025-02" },
          },
        ]),
        createTextResponse(
          "Based on your data, you've spent $2,500 out of $5,000 this month."
        ),
      ]);

      const orchestrator = new AIOrchestrator({ client: mockClient });
      const result = await orchestrator.chat("What's my budget summary?");

      expect(mockExecuteTool).toHaveBeenCalledWith("get_remaining_budget", {
        month: "2025-02",
      });
      expect(result.toolsUsed).toContain("get_remaining_budget");
      expect(result.response).toContain("$2,500");
    });

    it("should execute multiple tool calls in single response", async () => {
      mockExecuteTool
        .mockResolvedValueOnce({
          success: true,
          data: { month: "2025-02", totalBudget: 5000, totalSpent: 2500, remaining: 2500, percentUsed: 50, dailyBudgetTarget: 100, pacingStatus: "on-track", daysInMonth: 28, currentDay: 15 },
          toolName: "get_remaining_budget",
          durationMs: 50,
        })
        .mockResolvedValueOnce({
          success: true,
          data: { month: "2025-02", totalRemaining: 2500, categories: [] },
          toolName: "get_remaining_budget",
          durationMs: 45,
        });

      const mockClient = createMockClient([
        createToolCallResponse([
          { id: "call_1", name: "get_remaining_budget", arguments: { month: "2025-02" } },
          { id: "call_2", name: "get_remaining_budget", arguments: { month: "2025-02" } },
        ]),
        createTextResponse("Here's your complete budget overview..."),
      ]);

      const orchestrator = new AIOrchestrator({ client: mockClient });
      const result = await orchestrator.chat("Give me a full budget breakdown");

      expect(mockExecuteTool).toHaveBeenCalledTimes(2);
      expect(result.toolsUsed).toContain("get_remaining_budget");
      expect(result.toolsUsed).toContain("get_remaining_budget");
    });

    it("should handle chained tool calls across multiple rounds", async () => {
      mockExecuteTool
        .mockResolvedValueOnce({
          success: true,
          data: { month: "2025-02", totalBudget: 5000, totalSpent: 2500, remaining: 2500, percentUsed: 50, dailyBudgetTarget: 100, pacingStatus: "on-track", daysInMonth: 28, currentDay: 15 },
          toolName: "get_remaining_budget",
          durationMs: 50,
        })
        .mockResolvedValueOnce({
          success: true,
          data: { month: "2025-02", tripCost: 3000, availableFunds: 2500, canAfford: false, shortfall: 500, monthlySavingsNeeded: 500, monthsToSave: 1, recommendation: "Save more" },
          toolName: "compute_trip_budget",
          durationMs: 60,
        });

      const mockClient = createMockClient([
        // First response: calls get_remaining_budget
        createToolCallResponse([
          { id: "call_1", name: "get_remaining_budget", arguments: { month: "2025-02" } },
        ], "resp_1"),
        // Second response: calls compute_trip_budget based on first result
        createToolCallResponse([
          { id: "call_2", name: "compute_trip_budget", arguments: { month: "2025-02", tripCost: 3000 } },
        ], "resp_2"),
        // Final response
        createTextResponse("Based on the analysis, you're $500 short for the trip.", "resp_3"),
      ]);

      const orchestrator = new AIOrchestrator({ client: mockClient });
      const result = await orchestrator.chat("Can I afford a $3000 trip this month?");

      expect(mockExecuteTool).toHaveBeenCalledTimes(2);
      expect(result.toolsUsed).toContain("get_remaining_budget");
      expect(result.toolsUsed).toContain("compute_trip_budget");
    });

    it("should respect maxToolCalls limit", async () => {
      // Always return a tool call response
      mockExecuteTool.mockResolvedValue({
        success: true,
        data: { mock: "data" },
        toolName: "get_remaining_budget",
        durationMs: 30,
      });

      const mockClient = createMockClient([
        createToolCallResponse([{ id: "call_1", name: "get_remaining_budget", arguments: { month: "2025-01" } }]),
        createToolCallResponse([{ id: "call_2", name: "get_remaining_budget", arguments: { month: "2025-02" } }]),
        createToolCallResponse([{ id: "call_3", name: "get_remaining_budget", arguments: { month: "2025-03" } }]),
        createToolCallResponse([{ id: "call_4", name: "get_remaining_budget", arguments: { month: "2025-04" } }]),
        createTextResponse("Final response"),
      ]);

      const orchestrator = new AIOrchestrator({
        client: mockClient,
        maxToolCalls: 2,
      });

      await orchestrator.chat("Run lots of tools");

      // Should stop after 2 tool call rounds
      expect(mockExecuteTool).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Data Used Section
  // ---------------------------------------------------------------------------

  describe("data used section", () => {
    it("should append Data used section when tools are called", async () => {
      mockExecuteTool.mockResolvedValueOnce({
        success: true,
        data: { month: "2025-02", totalBudget: 5000, totalSpent: 2500, remaining: 2500, percentUsed: 50, dailyBudgetTarget: 100, pacingStatus: "on-track", daysInMonth: 28, currentDay: 15 },
        toolName: "get_remaining_budget",
        durationMs: 50,
      });

      const mockClient = createMockClient([
        createToolCallResponse([
          { id: "call_1", name: "get_remaining_budget", arguments: { month: "2025-02" } },
        ]),
        createTextResponse("Your budget summary looks good."),
      ]);

      const orchestrator = new AIOrchestrator({ client: mockClient });
      const result = await orchestrator.chat("Budget summary please");

      expect(result.response).toContain("**Data used:**");
      expect(result.response).toContain("get_remaining_budget");
    });

    it("should not duplicate Data used section if already present", async () => {
      mockExecuteTool.mockResolvedValueOnce({
        success: true,
        data: { month: "2025-02", totalBudget: 5000, totalSpent: 2500, remaining: 2500, percentUsed: 50, dailyBudgetTarget: 100, pacingStatus: "on-track", daysInMonth: 28, currentDay: 15 },
        toolName: "get_remaining_budget",
        durationMs: 50,
      });

      const mockClient = createMockClient([
        createToolCallResponse([
          { id: "call_1", name: "get_remaining_budget", arguments: { month: "2025-02" } },
        ]),
        // Response already includes Data used section
        createTextResponse("Here's your summary.\n\n**Data used:** `get_remaining_budget`"),
      ]);

      const orchestrator = new AIOrchestrator({ client: mockClient });
      const result = await orchestrator.chat("Budget summary please");

      // Should only have one Data used section
      const matches = result.response.match(/Data used:/g);
      expect(matches).toHaveLength(1);
    });

    it("should not add Data used section when no tools are called", async () => {
      const mockClient = createMockClient([
        createTextResponse("I can help you with your budget."),
      ]);

      const orchestrator = new AIOrchestrator({ client: mockClient });
      const result = await orchestrator.chat("Hello");

      expect(result.response).not.toContain("Data used");
    });
  });

  // ---------------------------------------------------------------------------
  // Error Handling
  // ---------------------------------------------------------------------------

  describe("error handling", () => {
    it("should handle tool execution failure gracefully", async () => {
      mockExecuteTool.mockResolvedValueOnce({
        success: false,
        error: "Database connection failed",
        toolName: "get_remaining_budget",
        durationMs: 100,
      });

      const mockClient = createMockClient([
        createToolCallResponse([
          { id: "call_1", name: "get_remaining_budget", arguments: { month: "2025-02" } },
        ]),
        createTextResponse("I encountered an issue fetching your data."),
      ]);

      const orchestrator = new AIOrchestrator({ client: mockClient });
      const result = await orchestrator.chat("Show my summary");

      // Should still return a response
      expect(result.response).toBeDefined();
      expect(result.toolsUsed).toContain("get_remaining_budget");
    });

    it("should return fallback message when OpenAI returns no text", async () => {
      const mockClient = createMockClient([
        { id: "resp_1", text: null, toolCalls: [], finishReason: "stop", usage: null },
      ]);

      const orchestrator = new AIOrchestrator({ client: mockClient });
      const result = await orchestrator.chat("Hello");

      expect(result.response).toContain("couldn't generate a response");
    });
  });

  // ---------------------------------------------------------------------------
  // Conversation Management
  // ---------------------------------------------------------------------------

  describe("conversation management", () => {
    it("should store messages in conversation", async () => {
      const mockClient = createMockClient([
        createTextResponse("Response 1"),
        createTextResponse("Response 2"),
      ]);

      const orchestrator = new AIOrchestrator({ client: mockClient });
      const result1 = await orchestrator.chat("Message 1");
      await orchestrator.chat("Message 2", result1.conversationId);

      const conversation = orchestrator.getConversation(result1.conversationId);
      expect(conversation).toBeDefined();
      expect(conversation?.messages.length).toBe(4); // 2 user + 2 assistant
    });

    it("should return formatted history", async () => {
      const mockClient = createMockClient([
        createTextResponse("Hello! How can I help?"),
      ]);

      const orchestrator = new AIOrchestrator({ client: mockClient });
      const result = await orchestrator.chat("Hi there");

      const history = orchestrator.getFormattedHistory(result.conversationId);
      expect(history).toContain("You: Hi there");
      expect(history).toContain("Assistant: Hello! How can I help?");
    });

    it("should clear conversation", async () => {
      const mockClient = createMockClient([createTextResponse("Hi")]);

      const orchestrator = new AIOrchestrator({ client: mockClient });
      const result = await orchestrator.chat("Hello");

      orchestrator.clearConversation(result.conversationId);
      const conversation = orchestrator.getConversation(result.conversationId);

      expect(conversation).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // System Prompt
  // ---------------------------------------------------------------------------

  describe("system prompt", () => {
    it("should use custom system prompt when provided", async () => {
      const customPrompt = "You are a test assistant.";
      const mockClient = createMockClient([createTextResponse("Test response")]);

      const orchestrator = new AIOrchestrator({
        client: mockClient,
        systemPrompt: customPrompt,
      });

      await orchestrator.chat("Hello");

      expect(mockClient.createResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          instructions: customPrompt,
        })
      );
    });

    it("should use default system prompt when not provided", async () => {
      const mockClient = createMockClient([createTextResponse("Response")]);

      const orchestrator = new AIOrchestrator({ client: mockClient });
      await orchestrator.chat("Hello");

      expect(mockClient.createResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          instructions: expect.stringContaining("Foracle Assistant"),
        })
      );
    });
  });
});
