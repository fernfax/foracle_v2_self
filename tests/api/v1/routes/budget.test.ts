import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-context", () => ({
  getCurrentUserAndFamily: vi.fn(),
}));
vi.mock("@/lib/services/budget", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/budget")>(
    "@/lib/services/budget"
  );
  return { ...actual, getBudgetForMonth: vi.fn() };
});

import { GET } from "@/app/api/v1/budget/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import { getBudgetForMonth } from "@/lib/services/budget";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };

const sampleResult = {
  year: 2026,
  month: 5,
  summary: {
    totalBudget: 3000,
    totalSpent: 1200,
    remaining: 1800,
    percentUsed: 40,
    dailyBudget: 100,
    expectedSpentByToday: 1500,
    pacingStatus: "under" as const,
    daysInMonth: 31,
    currentDay: 15,
  },
  categories: [
    {
      categoryId: "cat-1",
      categoryName: "Food",
      icon: null,
      monthlyBudget: 600,
      spent: 240,
      remaining: 360,
      percentUsed: 40,
    },
  ],
};

function req(query: string): NextRequest {
  return new NextRequest(
    new URL(`/api/v1/budget${query ? `?${query}` : ""}`, "http://test")
  );
}

beforeEach(() => {
  vi.mocked(getCurrentUserAndFamily).mockResolvedValue(mockCtx);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/budget", () => {
  it("returns 200 with summary + categories", async () => {
    vi.mocked(getBudgetForMonth).mockResolvedValueOnce(sampleResult);
    const res = await GET(req("year=2026&month=5"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.summary.totalBudget).toBe(3000);
    expect(body.data.categories).toHaveLength(1);
    expect(getBudgetForMonth).toHaveBeenCalledWith(mockCtx, 2026, 5);
  });

  it("returns 422 when year missing", async () => {
    const res = await GET(req("month=5"));
    expect(res.status).toBe(422);
    expect(getBudgetForMonth).not.toHaveBeenCalled();
  });

  it("returns 422 when month out of range", async () => {
    const res = await GET(req("year=2026&month=13"));
    expect(res.status).toBe(422);
  });

  it("returns 422 when year non-numeric", async () => {
    const res = await GET(req("year=abc&month=5"));
    expect(res.status).toBe(422);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUserAndFamily).mockRejectedValueOnce(
      new Error("Unauthorized")
    );
    const res = await GET(req("year=2026&month=5"));
    expect(res.status).toBe(401);
  });
});
