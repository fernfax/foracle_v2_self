import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-context", () => ({
  getCurrentUserAndFamily: vi.fn(),
}));
vi.mock("@/lib/services/onboarding", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/onboarding")>(
    "@/lib/services/onboarding"
  );
  return {
    ...actual,
    checkOnboardingStatus: vi.fn(),
    completeOnboarding: vi.fn(),
    getOnboardingData: vi.fn(),
    createOnboardingExpenses: vi.fn(),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { GET as STATUS_GET } from "@/app/api/v1/onboarding/status/route";
import { POST as COMPLETE_POST } from "@/app/api/v1/onboarding/complete/route";
import { GET as DATA_GET } from "@/app/api/v1/onboarding/data/route";
import { POST as EXPENSES_POST } from "@/app/api/v1/onboarding/expenses/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  checkOnboardingStatus,
  completeOnboarding,
  createOnboardingExpenses,
  getOnboardingData,
} from "@/lib/services/onboarding";

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

describe("Onboarding routes", () => {
  it("GET /status returns flag", async () => {
    vi.mocked(checkOnboardingStatus).mockResolvedValueOnce(true);
    const res = await STATUS_GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.onboardingCompleted).toBe(true);
  });

  it("POST /complete flips flag", async () => {
    vi.mocked(completeOnboarding).mockResolvedValueOnce(undefined);
    const res = await COMPLETE_POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.onboardingCompleted).toBe(true);
    expect(completeOnboarding).toHaveBeenCalledWith(mockCtx);
  });

  it("GET /data returns familyMembers + incomes + currentHoldings", async () => {
    vi.mocked(getOnboardingData).mockResolvedValueOnce({
      familyMembers: [],
      incomes: [],
      currentHoldings: [],
    });
    const res = await DATA_GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty("familyMembers");
    expect(body.data).toHaveProperty("incomes");
    expect(body.data).toHaveProperty("currentHoldings");
  });

  it("POST /expenses 200 happy", async () => {
    vi.mocked(createOnboardingExpenses).mockResolvedValueOnce(undefined);
    const res = await EXPENSES_POST(
      jsonReq("/api/v1/onboarding/expenses", "POST", {
        categories: ["Housing", "Food"],
        percentageOfIncome: 50,
        monthlyIncome: 5000,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.created).toBe(true);
  });

  it("POST /expenses 422 on percentage > 100", async () => {
    const res = await EXPENSES_POST(
      jsonReq("/api/v1/onboarding/expenses", "POST", {
        categories: ["Housing"],
        percentageOfIncome: 150,
        monthlyIncome: 5000,
      })
    );
    expect(res.status).toBe(422);
  });

  it("POST /expenses 422 on negative income", async () => {
    const res = await EXPENSES_POST(
      jsonReq("/api/v1/onboarding/expenses", "POST", {
        categories: ["Housing"],
        percentageOfIncome: 50,
        monthlyIncome: -100,
      })
    );
    expect(res.status).toBe(422);
  });

  it("POST /expenses 422 on bad amount string", async () => {
    const res = await EXPENSES_POST(
      jsonReq("/api/v1/onboarding/expenses", "POST", {
        categories: ["Housing"],
        percentageOfIncome: 50,
        monthlyIncome: 5000,
        categoryAmounts: { Housing: "not-a-number" },
      })
    );
    expect(res.status).toBe(422);
  });
});
