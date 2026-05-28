import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-context", () => ({
  getCurrentUserAndFamily: vi.fn(),
}));
vi.mock("@/lib/services/user-prefs", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/user-prefs")>(
    "@/lib/services/user-prefs"
  );
  return {
    ...actual,
    getSinglishMode: vi.fn(),
    setSinglishMode: vi.fn(),
    getTourStatus: vi.fn(),
    markTourCompleted: vi.fn(),
    resetTourStatus: vi.fn(),
  };
});

import {
  GET as SINGLISH_GET,
  PUT as SINGLISH_PUT,
} from "@/app/api/v1/user/singlish-mode/route";
import { GET as TOUR_GET } from "@/app/api/v1/user/tour/route";
import { POST as TOUR_MARK_POST } from "@/app/api/v1/user/tour/[name]/route";
import { POST as TOUR_RESET_POST } from "@/app/api/v1/user/tour/[name]/reset/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  getSinglishMode,
  getTourStatus,
  markTourCompleted,
  resetTourStatus,
  setSinglishMode,
} from "@/lib/services/user-prefs";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };
const EMPTY_TOUR = {
  overall: null,
  dashboard: null,
  incomes: null,
  expenses: null,
};

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

describe("Singlish mode routes", () => {
  it("GET returns enabled flag", async () => {
    vi.mocked(getSinglishMode).mockResolvedValueOnce(true);
    const res = await SINGLISH_GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.enabled).toBe(true);
  });

  it("PUT sets and returns the new value", async () => {
    vi.mocked(setSinglishMode).mockResolvedValueOnce(true);
    const res = await SINGLISH_PUT(
      jsonReq("/api/v1/user/singlish-mode", "PUT", { enabled: true })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.enabled).toBe(true);
    expect(setSinglishMode).toHaveBeenCalledWith(mockCtx, true);
  });

  it("PUT returns 422 on missing enabled", async () => {
    const res = await SINGLISH_PUT(
      jsonReq("/api/v1/user/singlish-mode", "PUT", {})
    );
    expect(res.status).toBe(422);
  });
});

describe("Tour routes", () => {
  it("GET returns full tour status", async () => {
    vi.mocked(getTourStatus).mockResolvedValueOnce({
      ...EMPTY_TOUR,
      overall: "2026-05-15T12:00:00Z",
    });
    const res = await TOUR_GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.overall).toBe("2026-05-15T12:00:00Z");
  });

  it("POST /[name] marks the specific tour completed", async () => {
    vi.mocked(markTourCompleted).mockResolvedValueOnce({
      ...EMPTY_TOUR,
      dashboard: "2026-05-15T12:00:00Z",
    });
    const res = await TOUR_MARK_POST(
      jsonReq("/api/v1/user/tour/dashboard", "POST"),
      { params: Promise.resolve({ name: "dashboard" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.dashboard).toBe("2026-05-15T12:00:00Z");
    expect(markTourCompleted).toHaveBeenCalledWith(mockCtx, "dashboard");
  });

  it("POST /[name] returns 422 on invalid tour name", async () => {
    const res = await TOUR_MARK_POST(
      jsonReq("/api/v1/user/tour/something", "POST"),
      { params: Promise.resolve({ name: "something" }) }
    );
    expect(res.status).toBe(422);
    expect(markTourCompleted).not.toHaveBeenCalled();
  });

  it("POST /[name]/reset resets the specific tour", async () => {
    vi.mocked(resetTourStatus).mockResolvedValueOnce(EMPTY_TOUR);
    const res = await TOUR_RESET_POST(
      jsonReq("/api/v1/user/tour/expenses/reset", "POST"),
      { params: Promise.resolve({ name: "expenses" }) }
    );
    expect(res.status).toBe(200);
    expect(resetTourStatus).toHaveBeenCalledWith(mockCtx, "expenses");
  });
});
