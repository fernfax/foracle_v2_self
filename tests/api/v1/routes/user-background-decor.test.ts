import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Mocked route test (no DB) — matches the convention in user-prefs.test.ts.
// Covers the only /api/v1 route that had zero test coverage (QA audit gap).
vi.mock("@/lib/auth-context", () => ({
  getCurrentUserAndFamily: vi.fn(),
}));
vi.mock("@/lib/services/user-prefs", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/user-prefs")>(
    "@/lib/services/user-prefs"
  );
  return {
    ...actual,
    getBackgroundDecor: vi.fn(),
    setBackgroundDecor: vi.fn(),
  };
});

import {
  GET as DECOR_GET,
  PUT as DECOR_PUT,
} from "@/app/api/v1/user/background-decor/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import { getBackgroundDecor, setBackgroundDecor } from "@/lib/services/user-prefs";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };

function jsonReq(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://test"), {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    duplex: "half",
  } as unknown as ConstructorParameters<typeof NextRequest>[1]);
}

beforeEach(() => {
  vi.mocked(getCurrentUserAndFamily).mockResolvedValue(mockCtx);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/user/background-decor", () => {
  it("returns the current decor", async () => {
    vi.mocked(getBackgroundDecor).mockResolvedValueOnce("peranakan");
    const res = await DECOR_GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.decor).toBe("peranakan");
    expect(getBackgroundDecor).toHaveBeenCalledWith(mockCtx);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getCurrentUserAndFamily).mockRejectedValueOnce(new Error("Unauthorized"));
    const res = await DECOR_GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("PUT /api/v1/user/background-decor", () => {
  it("sets and returns the new decor", async () => {
    vi.mocked(setBackgroundDecor).mockResolvedValueOnce("none");
    const res = await DECOR_PUT(
      jsonReq("/api/v1/user/background-decor", "PUT", { decor: "none" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.decor).toBe("none");
    expect(setBackgroundDecor).toHaveBeenCalledWith(mockCtx, "none");
  });

  it("accepts each valid decor value", async () => {
    for (const decor of ["radial", "peranakan", "none"] as const) {
      vi.mocked(setBackgroundDecor).mockResolvedValueOnce(decor);
      const res = await DECOR_PUT(
        jsonReq("/api/v1/user/background-decor", "PUT", { decor })
      );
      expect(res.status).toBe(200);
    }
  });

  it("returns 422 for an invalid decor value", async () => {
    const res = await DECOR_PUT(
      jsonReq("/api/v1/user/background-decor", "PUT", { decor: "rainbow" })
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(setBackgroundDecor).not.toHaveBeenCalled();
  });

  it("returns 422 when decor is missing", async () => {
    const res = await DECOR_PUT(
      jsonReq("/api/v1/user/background-decor", "PUT", {})
    );
    expect(res.status).toBe(422);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getCurrentUserAndFamily).mockRejectedValueOnce(new Error("Unauthorized"));
    const res = await DECOR_PUT(
      jsonReq("/api/v1/user/background-decor", "PUT", { decor: "none" })
    );
    expect(res.status).toBe(401);
  });
});
