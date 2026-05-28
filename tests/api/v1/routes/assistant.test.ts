import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-context", () => ({
  getCurrentUserAndFamily: vi.fn(),
}));
vi.mock("@/lib/ai/orchestrator", () => ({
  getOrchestrator: vi.fn(),
}));
vi.mock("@/lib/ai/threads", () => ({
  createThread: vi.fn(),
  getThread: vi.fn(),
  getUserThreads: vi.fn(),
  addMessageToThread: vi.fn(),
  updateThreadResponseId: vi.fn(),
  getThreadMessages: vi.fn(),
  deleteThread: vi.fn(),
  renameThread: vi.fn(),
}));
vi.mock("@/lib/ai/rate-limiter", () => ({
  checkRateLimits: vi.fn(),
  recordMessage: vi.fn(),
  getUserQuotaInfo: vi.fn(),
}));
vi.mock("@/lib/services/user-prefs", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/user-prefs")>(
    "@/lib/services/user-prefs"
  );
  return { ...actual, getSinglishMode: vi.fn() };
});

import { POST as CHAT_POST } from "@/app/api/v1/assistant/chat/route";
import {
  GET as THREADS_LIST_GET,
  POST as THREADS_LIST_POST,
} from "@/app/api/v1/assistant/threads/route";
import {
  DELETE as THREAD_DELETE,
  GET as THREAD_GET,
  PATCH as THREAD_PATCH,
} from "@/app/api/v1/assistant/threads/[id]/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import { getOrchestrator } from "@/lib/ai/orchestrator";
import {
  addMessageToThread,
  createThread,
  deleteThread,
  getThread,
  getThreadMessages,
  getUserThreads,
  renameThread,
  updateThreadResponseId,
} from "@/lib/ai/threads";
import {
  checkRateLimits,
  getUserQuotaInfo,
  recordMessage,
} from "@/lib/ai/rate-limiter";
import { getSinglishMode } from "@/lib/services/user-prefs";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };

const sampleThread = {
  id: "thread_abc",
  userId: "u1",
  title: "Test",
  messages: [],
  createdAt: new Date("2026-05-15T12:00:00Z"),
  updatedAt: new Date("2026-05-15T12:00:00Z"),
};

const quota = {
  used: 5,
  limit: 50,
  resetAt: new Date("2026-05-16T00:00:00Z"),
};

function jsonReq(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://test"), {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    duplex: "half",
  } as unknown as ConstructorParameters<typeof NextRequest>[1]);
}

beforeEach(() => {
  // Hard reset between tests — clears the mockResolvedValueOnce queue too,
  // which can otherwise leak between tests under vitest v4.
  vi.resetAllMocks();
  vi.mocked(getCurrentUserAndFamily).mockResolvedValue(mockCtx);
  vi.mocked(getUserQuotaInfo).mockReturnValue(quota);
  vi.mocked(getSinglishMode).mockResolvedValue(false);
});

describe("POST /api/v1/assistant/chat", () => {
  it("returns 200 with response + threadId + quota on happy path", async () => {
    vi.mocked(getThread).mockResolvedValueOnce(null);
    vi.mocked(createThread).mockResolvedValueOnce(sampleThread);
    vi.mocked(checkRateLimits).mockReturnValueOnce({
      allowed: true,
      remaining: 45,
      resetAt: new Date("2026-05-16T00:00:00Z"),
    });
    vi.mocked(addMessageToThread).mockResolvedValue({
      id: "msg_1",
      role: "user",
      content: "hi",
      createdAt: new Date(),
    });
    vi.mocked(getOrchestrator).mockReturnValueOnce({
      chat: vi.fn().mockResolvedValueOnce({
        response: "hi back",
        toolsUsed: ["get_balance_summary"],
        responseId: "resp_1",
        conversationId: "conv_1",
      }),
    } as unknown as ReturnType<typeof getOrchestrator>);

    const res = await CHAT_POST(
      jsonReq("/api/v1/assistant/chat", "POST", { message: "hi" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.response).toBe("hi back");
    expect(body.data.threadId).toBe("thread_abc");
    expect(body.data.toolsUsed).toEqual(["get_balance_summary"]);
    expect(body.data.quota.used).toBe(5);
    expect(updateThreadResponseId).toHaveBeenCalled();
    expect(recordMessage).toHaveBeenCalledWith("u1", "thread_abc");
  });

  it("reuses an existing thread when threadId provided", async () => {
    vi.mocked(getThread).mockResolvedValueOnce(sampleThread);
    vi.mocked(checkRateLimits).mockReturnValueOnce({
      allowed: true,
      remaining: 45,
      resetAt: new Date("2026-05-16T00:00:00Z"),
    });
    vi.mocked(addMessageToThread).mockResolvedValue({
      id: "msg_1",
      role: "user",
      content: "hi",
      createdAt: new Date(),
    });
    vi.mocked(getOrchestrator).mockReturnValueOnce({
      chat: vi.fn().mockResolvedValueOnce({
        response: "ok",
        toolsUsed: [],
        responseId: "resp_2",
        conversationId: "conv_2",
      }),
    } as unknown as ReturnType<typeof getOrchestrator>);

    await CHAT_POST(
      jsonReq("/api/v1/assistant/chat", "POST", {
        message: "hi",
        threadId: "thread_abc",
      })
    );
    expect(createThread).not.toHaveBeenCalled();
    expect(getThread).toHaveBeenCalledWith("thread_abc");
  });

  it("returns 429 with quota when rate-limited", async () => {
    vi.mocked(getThread).mockResolvedValueOnce(null);
    vi.mocked(createThread).mockResolvedValueOnce(sampleThread);
    vi.mocked(checkRateLimits).mockReturnValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: new Date("2026-05-16T00:00:00Z"),
      error: "Daily limit reached",
    });

    const res = await CHAT_POST(
      jsonReq("/api/v1/assistant/chat", "POST", { message: "hi" })
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.details).toBeDefined();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUserAndFamily).mockRejectedValueOnce(
      new Error("Unauthorized")
    );
    const res = await CHAT_POST(
      jsonReq("/api/v1/assistant/chat", "POST", { message: "hi" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 422 on missing message", async () => {
    const res = await CHAT_POST(jsonReq("/api/v1/assistant/chat", "POST", {}));
    expect(res.status).toBe(422);
  });

  it("returns 422 when message > 2000 chars", async () => {
    const res = await CHAT_POST(
      jsonReq("/api/v1/assistant/chat", "POST", {
        message: "x".repeat(2001),
      })
    );
    expect(res.status).toBe(422);
  });

  it("returns 500 when orchestrator init fails", async () => {
    vi.mocked(getThread).mockResolvedValueOnce(null);
    vi.mocked(createThread).mockResolvedValueOnce(sampleThread);
    vi.mocked(checkRateLimits).mockReturnValueOnce({
      allowed: true,
      remaining: 45,
      resetAt: new Date("2026-05-16T00:00:00Z"),
    });
    vi.mocked(addMessageToThread).mockResolvedValue({
      id: "msg_1",
      role: "user",
      content: "hi",
      createdAt: new Date(),
    });
    vi.mocked(getOrchestrator).mockImplementationOnce(() => {
      throw new Error("OPENAI_API_KEY is not set");
    });

    const res = await CHAT_POST(
      jsonReq("/api/v1/assistant/chat", "POST", { message: "hi" })
    );
    expect(res.status).toBe(500);
  });
});

describe("Threads list + create routes", () => {
  it("GET /threads returns array + quota", async () => {
    vi.mocked(getUserThreads).mockResolvedValueOnce([
      {
        id: "thread_1",
        title: "Test",
        lastMessage: "...",
        messageCount: 2,
        updatedAt: new Date(),
      },
    ]);
    const res = await THREADS_LIST_GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.threads).toHaveLength(1);
    expect(body.data.quota).toBeDefined();
  });

  it("POST /threads creates empty thread", async () => {
    vi.mocked(createThread).mockResolvedValueOnce(sampleThread);
    const res = await THREADS_LIST_POST();
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe("thread_abc");
  });

  it("Threads list returns 401 when unauth", async () => {
    vi.mocked(getCurrentUserAndFamily).mockRejectedValueOnce(
      new Error("Unauthorized")
    );
    const res = await THREADS_LIST_GET();
    expect(res.status).toBe(401);
  });
});

describe("Thread by-id routes", () => {
  const idCtx = { params: Promise.resolve({ id: "thread_abc" }) };

  it("GET /[id] returns thread + messages, 200", async () => {
    vi.mocked(getThread).mockResolvedValueOnce(sampleThread);
    vi.mocked(getThreadMessages).mockResolvedValueOnce([
      {
        id: "msg_1",
        role: "user",
        content: "hi",
        createdAt: new Date(),
      },
      {
        id: "msg_2",
        role: "assistant",
        content: "hi back",
        toolsUsed: ["get_balance_summary"],
        createdAt: new Date(),
      },
    ]);
    const res = await THREAD_GET(
      jsonReq("/api/v1/assistant/threads/thread_abc", "GET"),
      idCtx
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.messages).toHaveLength(2);
    expect(body.data.messages[1].toolsUsed).toEqual(["get_balance_summary"]);
  });

  it("GET /[id] returns 404 when missing", async () => {
    vi.mocked(getThread).mockResolvedValueOnce(null);
    const res = await THREAD_GET(
      jsonReq("/api/v1/assistant/threads/thread_x", "GET"),
      idCtx
    );
    expect(res.status).toBe(404);
  });

  it("PATCH /[id] returns 200 on rename", async () => {
    vi.mocked(renameThread).mockResolvedValueOnce(true);
    const res = await THREAD_PATCH(
      jsonReq("/api/v1/assistant/threads/thread_abc", "PATCH", {
        title: "Renamed",
      }),
      idCtx
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.title).toBe("Renamed");
  });

  it("PATCH /[id] returns 404 when missing", async () => {
    vi.mocked(renameThread).mockResolvedValueOnce(false);
    const res = await THREAD_PATCH(
      jsonReq("/api/v1/assistant/threads/thread_x", "PATCH", {
        title: "Renamed",
      }),
      idCtx
    );
    expect(res.status).toBe(404);
  });

  it("PATCH /[id] returns 422 on empty title", async () => {
    const res = await THREAD_PATCH(
      jsonReq("/api/v1/assistant/threads/thread_abc", "PATCH", { title: "" }),
      idCtx
    );
    expect(res.status).toBe(422);
  });

  it("DELETE /[id] returns 200 on success", async () => {
    vi.mocked(deleteThread).mockResolvedValueOnce(true);
    const res = await THREAD_DELETE(
      jsonReq("/api/v1/assistant/threads/thread_abc", "DELETE"),
      idCtx
    );
    expect(res.status).toBe(200);
  });

  it("DELETE /[id] returns 404 when missing", async () => {
    vi.mocked(deleteThread).mockResolvedValueOnce(false);
    const res = await THREAD_DELETE(
      jsonReq("/api/v1/assistant/threads/thread_x", "DELETE"),
      idCtx
    );
    expect(res.status).toBe(404);
  });
});
