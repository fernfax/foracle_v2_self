import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-context", () => ({
  getCurrentUserAndFamily: vi.fn(),
}));
vi.mock("@/lib/services/push-tokens", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/push-tokens")>(
    "@/lib/services/push-tokens"
  );
  return {
    ...actual,
    registerPushToken: vi.fn(),
    listActivePushTokens: vi.fn(),
    revokePushToken: vi.fn(),
  };
});

import {
  GET as LIST_GET,
  POST as LIST_POST,
} from "@/app/api/v1/user/push-tokens/route";
import { DELETE as ID_DELETE } from "@/app/api/v1/user/push-tokens/[id]/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  PushTokenNotFoundError,
  listActivePushTokens,
  registerPushToken,
  revokePushToken,
} from "@/lib/services/push-tokens";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };
const ID = "11111111-1111-4111-8111-111111111111";

const sampleRow = {
  id: ID,
  userId: "u1",
  familyId: "f1" as string | null,
  token: "ExponentPushToken[abc123]",
  platform: "ios",
  createdAt: new Date("2026-05-15T12:00:00Z"),
  revokedAt: null as Date | null,
};

const idCtx = { params: Promise.resolve({ id: ID }) };

function jsonReq(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://test"), {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    duplex: "half",
  } as unknown as ConstructorParameters<typeof NextRequest>[1]);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getCurrentUserAndFamily).mockResolvedValue(mockCtx);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/user/push-tokens", () => {
  it("returns 200 with active tokens", async () => {
    vi.mocked(listActivePushTokens).mockResolvedValueOnce([sampleRow]);
    const res = await LIST_GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].token).toBe("ExponentPushToken[abc123]");
  });

  it("returns 401 unauthenticated", async () => {
    vi.mocked(getCurrentUserAndFamily).mockRejectedValueOnce(new Error("Unauthorized"));
    const res = await LIST_GET();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/user/push-tokens", () => {
  it("returns 201 on registered", async () => {
    vi.mocked(registerPushToken).mockResolvedValueOnce({
      status: "registered",
      row: sampleRow,
    });
    const res = await LIST_POST(
      jsonReq("/api/v1/user/push-tokens", "POST", {
        token: "ExponentPushToken[abc123]",
        platform: "ios",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.status).toBe("registered");
  });

  it("returns 200 on reactivated", async () => {
    vi.mocked(registerPushToken).mockResolvedValueOnce({
      status: "reactivated",
      row: sampleRow,
    });
    const res = await LIST_POST(
      jsonReq("/api/v1/user/push-tokens", "POST", {
        token: "ExponentPushToken[abc123]",
        platform: "ios",
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("reactivated");
  });

  it("returns 200 on noop (already active)", async () => {
    vi.mocked(registerPushToken).mockResolvedValueOnce({
      status: "noop",
      row: sampleRow,
    });
    const res = await LIST_POST(
      jsonReq("/api/v1/user/push-tokens", "POST", {
        token: "ExponentPushToken[abc123]",
        platform: "ios",
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("noop");
  });

  it("returns 422 on invalid platform", async () => {
    const res = await LIST_POST(
      jsonReq("/api/v1/user/push-tokens", "POST", {
        token: "tk",
        platform: "windows",
      })
    );
    expect(res.status).toBe(422);
  });

  it("returns 422 on missing token", async () => {
    const res = await LIST_POST(
      jsonReq("/api/v1/user/push-tokens", "POST", { platform: "ios" })
    );
    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/v1/user/push-tokens/[id]", () => {
  it("returns 200 on success", async () => {
    vi.mocked(revokePushToken).mockResolvedValueOnce({
      ...sampleRow,
      revokedAt: new Date("2026-05-15T13:00:00Z"),
    });
    const res = await ID_DELETE(
      jsonReq(`/api/v1/user/push-tokens/${ID}`, "DELETE"),
      idCtx
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.revoked).toBe(true);
    expect(body.data.row.revokedAt).toBe("2026-05-15T13:00:00.000Z");
  });

  it("returns 404 on PushTokenNotFoundError", async () => {
    vi.mocked(revokePushToken).mockRejectedValueOnce(new PushTokenNotFoundError());
    const res = await ID_DELETE(
      jsonReq(`/api/v1/user/push-tokens/${ID}`, "DELETE"),
      idCtx
    );
    expect(res.status).toBe(404);
  });
});
