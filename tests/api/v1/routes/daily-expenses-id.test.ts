import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-context", () => ({
  getCurrentUserAndFamily: vi.fn(),
}));
vi.mock("@/lib/services/daily-expenses", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/services/daily-expenses")>(
      "@/lib/services/daily-expenses"
    );
  return {
    ...actual,
    getDailyExpenseById: vi.fn(),
    updateDailyExpense: vi.fn(),
    deleteDailyExpense: vi.fn(),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { DELETE, GET, PATCH } from "@/app/api/v1/daily-expenses/[id]/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  DailyExpenseNotFoundError,
  deleteDailyExpense,
  getDailyExpenseById,
  updateDailyExpense,
} from "@/lib/services/daily-expenses";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };

const sampleRow = {
  id: "row-1",
  userId: "u1",
  familyId: "f1",
  categoryId: null,
  categoryName: "Food",
  subcategoryId: null,
  subcategoryName: null,
  amount: "12.50",
  note: null,
  date: "2026-05-15",
  originalCurrency: null,
  originalAmount: null,
  exchangeRate: null,
  createdAt: new Date("2026-05-15T12:00:00Z"),
  updatedAt: new Date("2026-05-15T12:00:00Z"),
};

const ctxArg = { params: Promise.resolve({ id: "row-1" }) };

function req(method: string, body?: unknown): NextRequest {
  return new NextRequest(
    new URL("/api/v1/daily-expenses/row-1", "http://test"),
    {
      method,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      duplex: "half",
    } as unknown as ConstructorParameters<typeof NextRequest>[1]
  );
}

beforeEach(() => {
  vi.mocked(getCurrentUserAndFamily).mockResolvedValue(mockCtx);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/daily-expenses/[id]", () => {
  it("returns 200 with the row", async () => {
    vi.mocked(getDailyExpenseById).mockResolvedValueOnce(sampleRow);
    const res = await GET(req("GET"), {
      params: Promise.resolve({ id: "row-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("row-1");
  });

  it("returns 404 when service returns null", async () => {
    vi.mocked(getDailyExpenseById).mockResolvedValueOnce(null);
    const res = await GET(req("GET"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("PATCH /api/v1/daily-expenses/[id]", () => {
  it("returns 200 on successful update", async () => {
    vi.mocked(updateDailyExpense).mockResolvedValueOnce({
      ...sampleRow,
      amount: "20.00",
    });
    const res = await PATCH(req("PATCH", { amount: "20.00" }), ctxArg);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.amount).toBe("20.00");
  });

  it("returns 404 when service throws DailyExpenseNotFoundError", async () => {
    vi.mocked(updateDailyExpense).mockRejectedValueOnce(
      new DailyExpenseNotFoundError()
    );
    const res = await PATCH(req("PATCH", { amount: "20.00" }), ctxArg);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 422 on empty body", async () => {
    const res = await PATCH(req("PATCH", {}), ctxArg);
    expect(res.status).toBe(422);
    expect(updateDailyExpense).not.toHaveBeenCalled();
  });

  it("returns 422 on invalid date format", async () => {
    const res = await PATCH(req("PATCH", { date: "not-a-date" }), ctxArg);
    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/v1/daily-expenses/[id]", () => {
  it("returns 200 on success", async () => {
    vi.mocked(deleteDailyExpense).mockResolvedValueOnce(undefined);
    const res = await DELETE(req("DELETE"), ctxArg);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it("returns 404 when service throws DailyExpenseNotFoundError", async () => {
    vi.mocked(deleteDailyExpense).mockRejectedValueOnce(
      new DailyExpenseNotFoundError()
    );
    const res = await DELETE(req("DELETE"), ctxArg);
    expect(res.status).toBe(404);
  });
});
