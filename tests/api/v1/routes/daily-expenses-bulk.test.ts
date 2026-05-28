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
    createDailyExpense: vi.fn(),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { POST } from "@/app/api/v1/daily-expenses/bulk/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import { createDailyExpense } from "@/lib/services/daily-expenses";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };

function row(idSuffix: string) {
  return {
    id: uid(idSuffix),
    userId: "u1",
    familyId: "f1",
    categoryId: null,
    categoryName: "Food",
    subcategoryId: null,
    subcategoryName: null,
    amount: "5.00",
    note: null,
    date: "2026-05-15",
    originalCurrency: null,
    originalAmount: null,
    exchangeRate: null,
    createdAt: new Date("2026-05-15T12:00:00Z"),
    updatedAt: new Date("2026-05-15T12:00:00Z"),
  };
}

// UUID generator scoped to tests — predictable, valid v4 shape.
function uid(suffix: string): string {
  const padded = suffix.padEnd(12, "0").slice(0, 12);
  return `aaaaaaaa-bbbb-4ccc-8ddd-${padded}`;
}

function op(idSuffix: string) {
  return {
    id: uid(idSuffix),
    categoryName: "Food",
    amount: "5.00",
    date: "2026-05-15",
  };
}

function req(body: unknown): NextRequest {
  return new NextRequest(
    new URL("/api/v1/daily-expenses/bulk", "http://test"),
    {
      method: "POST",
      body: JSON.stringify(body),
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

describe("POST /api/v1/daily-expenses/bulk", () => {
  it("returns per-op results in input order", async () => {
    vi.mocked(createDailyExpense)
      .mockResolvedValueOnce({ status: "created", row: row("a") })
      .mockResolvedValueOnce({ status: "conflict", row: row("b") });

    const res = await POST(req({ ops: [op("a"), op("b")] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.results).toHaveLength(2);
    expect(body.data.results[0]).toMatchObject({ id: uid("a"), status: "created" });
    expect(body.data.results[1]).toMatchObject({ id: uid("b"), status: "conflict" });
  });

  it("isolates a failing op without aborting the batch", async () => {
    const collision = new Error("collision") as Error & { code?: string };
    collision.code = "CONFLICT";
    vi.mocked(createDailyExpense)
      .mockResolvedValueOnce({ status: "created", row: row("a") })
      .mockRejectedValueOnce(collision)
      .mockResolvedValueOnce({ status: "created", row: row("c") });

    const res = await POST(req({ ops: [op("a"), op("b"), op("c")] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.results).toHaveLength(3);
    expect(body.data.results[0].status).toBe("created");
    expect(body.data.results[1]).toMatchObject({
      id: uid("b"),
      status: "failed",
      error: { code: "CONFLICT" },
    });
    expect(body.data.results[2].status).toBe("created");
  });

  it("rejects empty ops array with 422", async () => {
    const res = await POST(req({ ops: [] }));
    expect(res.status).toBe(422);
    expect(createDailyExpense).not.toHaveBeenCalled();
  });

  it("rejects oversized ops array (>100) with 422", async () => {
    const ops = Array.from({ length: 101 }, (_, i) => op(`op-${i}`));
    const res = await POST(req({ ops }));
    expect(res.status).toBe(422);
    expect(createDailyExpense).not.toHaveBeenCalled();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUserAndFamily).mockRejectedValueOnce(
      new Error("Unauthorized")
    );
    const res = await POST(req({ ops: [op("a")] }));
    expect(res.status).toBe(401);
  });
});
