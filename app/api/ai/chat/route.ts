import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrchestrator } from "@/lib/ai/orchestrator";
import {
  checkRateLimits,
  recordMessage,
  getUserQuotaInfo,
} from "@/lib/ai/rate-limiter";
import {
  createThread,
  getThread,
  addMessageToThread,
  updateThreadResponseId,
} from "@/lib/ai/threads";
import { getSinglishMode } from "@/lib/actions/singlish-mode";

// =============================================================================
// Types
// =============================================================================

interface ChatRequest {
  message: string;
  threadId?: string;
}

interface ChatResponse {
  success: boolean;
  response?: string;
  threadId?: string;
  toolsUsed?: string[];
  quota?: {
    used: number;
    limit: number;
    resetAt: string;
  };
  error?: string;
  errorCode?: string;
}

// =============================================================================
// Error Helpers
// =============================================================================

function createErrorResponse(
  message: string,
  code: string,
  status: number
): NextResponse<ChatResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      errorCode: code,
    },
    { status }
  );
}

function formatUserFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // Tool execution errors
    if (msg.includes("unauthorized")) {
      return "I couldn't access your financial data. Please try refreshing the page.";
    }
    if (msg.includes("database") || msg.includes("connection")) {
      return "I'm having trouble fetching your data right now. Please try again in a moment.";
    }
    if (msg.includes("timeout")) {
      return "The request took too long. Please try a simpler question or try again.";
    }

    // OpenAI errors
    if (msg.includes("rate limit") || msg.includes("429")) {
      return "I'm receiving too many requests right now. Please wait a moment and try again.";
    }
    if (msg.includes("api key") || msg.includes("authentication")) {
      return "There's a configuration issue. Please contact support.";
    }
  }

  return "Something went wrong. Please try again or rephrase your question.";
}

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
  console.log("[AI Chat] POST request received");
  try {
    // Authenticate user
    const { userId } = await auth();
    console.log("[AI Chat] User ID:", userId ? userId.slice(0, 8) + "..." : "none");
    if (!userId) {
      return createErrorResponse("Please sign in to use the assistant.", "UNAUTHORIZED", 401);
    }

    // Parse request body
    let body: ChatRequest;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse("Invalid request format.", "INVALID_REQUEST", 400);
    }

    const { message, threadId } = body;

    // Validate message
    if (!message || typeof message !== "string") {
      return createErrorResponse("Message is required.", "MISSING_MESSAGE", 400);
    }

    if (message.length > 2000) {
      return createErrorResponse(
        "Message is too long. Please keep it under 2000 characters.",
        "MESSAGE_TOO_LONG",
        400
      );
    }

    // Get or create thread
    let thread = threadId ? await getThread(threadId) : null;
    if (!thread) {
      thread = await createThread(message);
    }

    // Check rate limits
    const rateLimitResult = checkRateLimits(userId, thread.id);
    if (!rateLimitResult.allowed) {
      const quotaInfo = getUserQuotaInfo(userId);
      return NextResponse.json(
        {
          success: false,
          error: rateLimitResult.error,
          errorCode: "RATE_LIMITED",
          quota: {
            used: quotaInfo.used,
            limit: quotaInfo.limit,
            resetAt: quotaInfo.resetAt.toISOString(),
          },
        },
        { status: 429 }
      );
    }

    // Add user message to thread
    await addMessageToThread(thread.id, "user", message);

    // Record the message for rate limiting
    recordMessage(userId, thread.id);

    // Get user's Singlish mode preference
    const singlishMode = await getSinglishMode();

    // Get orchestrator and process message
    console.log("[AI Chat] Getting orchestrator...");
    let orchestrator;
    try {
      orchestrator = getOrchestrator();
    } catch (initError) {
      console.error("[AI Chat] Failed to initialize orchestrator:", initError);
      const errorMessage = initError instanceof Error ? initError.message : "Failed to initialize AI";

      // Check for common initialization issues
      if (errorMessage.includes("OPENAI_API_KEY")) {
        return createErrorResponse(
          "AI service is not configured. Please contact support.",
          "SERVICE_NOT_CONFIGURED",
          503
        );
      }

      return createErrorResponse(
        "AI service is temporarily unavailable. Please try again later.",
        "SERVICE_UNAVAILABLE",
        503
      );
    }

    try {
      // Use the orchestrator's conversation ID for multi-turn context
      console.log("[AI Chat] Calling orchestrator.chat with message:", message.slice(0, 50));
      console.log("[AI Chat] Using orchestrator conversation ID:", thread.orchestratorConversationId || "new");
      console.log("[AI Chat] Singlish mode:", singlishMode);
      const result = await orchestrator.chat(message, thread.orchestratorConversationId, singlishMode);
      console.log("[AI Chat] Orchestrator response received, tools used:", result.toolsUsed);

      // Store both the response ID and conversation ID for continuity
      if (result.responseId) {
        await updateThreadResponseId(thread.id, result.responseId, result.conversationId);
      }

      // Add assistant message to thread
      await addMessageToThread(
        thread.id,
        "assistant",
        result.response,
        result.toolsUsed
      );

      // Get quota info for response
      const quotaInfo = getUserQuotaInfo(userId);

      return NextResponse.json({
        success: true,
        response: result.response,
        threadId: thread.id,
        toolsUsed: result.toolsUsed,
        quota: {
          used: quotaInfo.used,
          limit: quotaInfo.limit,
          resetAt: quotaInfo.resetAt.toISOString(),
        },
      });
    } catch (orchError) {
      console.error("[AI Chat] Orchestrator error:", orchError);

      // Return user-friendly error
      const userMessage = formatUserFriendlyError(orchError);

      // Still add a system message to thread about the error
      await addMessageToThread(
        thread.id,
        "assistant",
        `I encountered an issue: ${userMessage}`
      );

      return NextResponse.json({
        success: false,
        response: userMessage,
        threadId: thread.id,
        error: userMessage,
        errorCode: "PROCESSING_ERROR",
      });
    }
  } catch (error) {
    console.error("[AI Chat] Unexpected error:", error);
    return createErrorResponse(
      "An unexpected error occurred. Please try again.",
      "INTERNAL_ERROR",
      500
    );
  }
}
