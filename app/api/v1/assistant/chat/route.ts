import type { NextRequest } from "next/server";
import { verifyAndScope } from "../../_lib/auth";
import { ApiError } from "../../_lib/errors";
import { ok, wrap } from "../../_lib/response";
import { chatBodySchema } from "@/lib/api-schemas/assistant";
import { getOrchestrator } from "@/lib/ai/orchestrator";
import {
  addMessageToThread,
  createThread,
  getThread,
  updateThreadResponseId,
} from "@/lib/ai/threads";
import {
  checkRateLimits,
  getUserQuotaInfo,
  recordMessage,
} from "@/lib/ai/rate-limiter";
import { getSinglishMode } from "@/lib/services/user-prefs";

// POST /api/v1/assistant/chat
//
// Mobile-facing canonical chat endpoint. Wraps the same orchestrator +
// threads + rate-limiter modules that /api/ai/chat (the legacy web endpoint)
// uses, but returns the canonical v1 success/error shape and includes the
// quota in `meta.quota`. Non-streaming v1 — matches existing web behavior.
// SSE is the v1.1 upgrade path.
export async function POST(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { message, threadId } = chatBodySchema.parse(await req.json());

    let thread = threadId ? await getThread(threadId) : null;
    if (!thread) thread = await createThread(message);

    const rateLimit = checkRateLimits(ctx.userId, thread.id);
    if (!rateLimit.allowed) {
      throw new ApiError(
        "RATE_LIMITED",
        rateLimit.error ?? "Rate limit exceeded",
        { quota: getUserQuotaInfo(ctx.userId) }
      );
    }

    await addMessageToThread(thread.id, "user", message);
    recordMessage(ctx.userId, thread.id);

    const singlishMode = await getSinglishMode(ctx);

    let orchestrator;
    try {
      orchestrator = getOrchestrator();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI init failed";
      const code = msg.includes("OPENAI_API_KEY") ? "INTERNAL" : "INTERNAL";
      throw new ApiError(code, "AI service is not available right now");
    }

    const result = await orchestrator.chat(
      message,
      thread.orchestratorConversationId,
      singlishMode
    );

    if (result.responseId) {
      await updateThreadResponseId(
        thread.id,
        result.responseId,
        result.conversationId
      );
    }
    await addMessageToThread(
      thread.id,
      "assistant",
      result.response,
      result.toolsUsed
    );

    const quota = getUserQuotaInfo(ctx.userId);
    return ok({
      threadId: thread.id,
      response: result.response,
      toolsUsed: result.toolsUsed,
      quota: {
        used: quota.used,
        limit: quota.limit,
        resetAt: quota.resetAt.toISOString(),
      },
    });
  });
}
