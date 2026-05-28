import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Mocks must be declared before importing the route handlers.
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
    listDailyExpenses: vi.fn(),
    createDailyExpense: vi.fn(),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { GET, POST } from "@/app/api/v1/daily-expenses/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  createDailyExpense,
  listDailyExpenses,
} from "@/lib/services/daily-expenses";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };

const sampleRow = {
  id: "11111111-1111-4111-8111-111111111111",
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

beforeEach(() => {
  vi.mocked(getCurrentUserAndFamily).mockResolvedValue(mockCtx);
});

afterEach(() => {
  vi.clearAllMocks();
});

function req(url: string, init?: RequestInit): NextRequest {
  // duplex: "half" is required by Node's fetch API when sending a request
  // body; without it, NextRequest exposes an empty body to the handler.
  // Cast through unknown to bypass Next's stricter signal type.
  return new NextRequest(
    new URL(url, "http://test"),
    { duplex: "half", ...init } as unknown as ConstructorParameters<typeof NextRequest>[1]
  );
}

describe("GET /api/v1/daily-expenses", () => {
  it("returns 200 with serialized rows", async () => {
    vi.mocked(listDailyExpenses).mockResolvedValueOnce([sampleRow]);
    const res = await GET(req("/api/v1/daily-expenses?year=2026&month=5"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].createdAt).toBe("2026-05-15T12:00:00.000Z");
  });

  it("resolves year/month to a date range and passes ctx through", async () => {
    vi.mocked(listDailyExpenses).mockResolvedValueOnce([]);
    await GET(req("/api/v1/daily-expenses?year=2026&month=5"));
    expect(listDailyExpenses).toHaveBeenCalledWith(mockCtx, {
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });
  });

  it("accepts startDate/endDate as an alternative to year/month", async () => {
    vi.mocked(listDailyExpenses).mockResolvedValueOnce([]);
    await GET(
      req("/api/v1/daily-expenses?startDate=2026-01-01&endDate=2026-03-31")
    );
    expect(listDailyExpenses).toHaveBeenCalledWith(mockCtx, {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUserAndFamily).mockRejectedValueOnce(
      new Error("Unauthorized")
    );
    const res = await GET(req("/api/v1/daily-expenses?year=2026&month=5"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 422 on invalid query", async () => {
    const res = await GET(req("/api/v1/daily-expenses?year=abc"));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("does not call the service when query validation fails", async () => {
    await GET(req("/api/v1/daily-expenses?year=abc"));
    expect(listDailyExpenses).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/daily-expenses", () => {
  const validBody = {
    categoryName: "Food",
    amount: "9.50",
    date: "2026-05-15",
  };

  it("returns 201 on create", async () => {
    vi.mocked(createDailyExpense).mockResolvedValueOnce({
      status: "created",
      row: sampleRow,
    });
    const res = await POST(
      req("/api/v1/daily-expenses", {
        method: "POST",
        body: JSON.stringify(validBody),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(body.data.idempotentReplay).toBe(false);
  });

  it("returns 200 with idempotentReplay flag on conflict", async () => {
    vi.mocked(createDailyExpense).mockResolvedValueOnce({
      status: "conflict",
      row: sampleRow,
    });
    const res = await POST(
      req("/api/v1/daily-expenses", {
        method: "POST",
        body: JSON.stringify({ ...validBody, id: sampleRow.id }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.idempotentReplay).toBe(true);
  });

  it("maps id-collision-across-users to 409", async () => {
    const err = new Error("id collision with another user's row") as Error & {
      code?: string;
    };
    err.code = "CONFLICT";
    vi.mocked(createDailyExpense).mockRejectedValueOnce(err);
    const res = await POST(
      req("/api/v1/daily-expenses", {
        method: "POST",
        body: JSON.stringify({
          ...validBody,
          id: "22222222-2222-4222-8222-222222222222",
        }),
      })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("CONFLICT");
  });

  it("returns 422 on invalid amount", async () => {
    const res = await POST(
      req("/api/v1/daily-expenses", {
        method: "POST",
        body: JSON.stringify({ ...validBody, amount: "not-a-number" }),
      })
    );
    expect(res.status).toBe(422);
  });

  it("returns 422 when required fields missing", async () => {
    const res = await POST(
      req("/api/v1/daily-expenses", {
        method: "POST",
        body: JSON.stringify({ amount: "9.50" }),
      })
    );
    expect(res.status).toBe(422);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUserAndFamily).mockRejectedValueOnce(
      new Error("Unauthorized")
    );
    const res = await POST(
      req("/api/v1/daily-expenses", {
        method: "POST",
        body: JSON.stringify(validBody),
      })
    );
    expect(res.status).toBe(401);
  });
});
