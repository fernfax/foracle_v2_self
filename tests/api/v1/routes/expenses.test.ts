import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-context", () => ({
  getCurrentUserAndFamily: vi.fn(),
}));
vi.mock("@/lib/services/expenses", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/expenses")>(
    "@/lib/services/expenses"
  );
  return {
    ...actual,
    listExpenses: vi.fn(),
    createExpense: vi.fn(),
    getExpenseById: vi.fn(),
    updateExpense: vi.fn(),
    softDeleteExpense: vi.fn(),
    hardDeleteExpense: vi.fn(),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  GET as LIST_GET,
  POST as LIST_POST,
} from "@/app/api/v1/expenses/route";
import {
  DELETE as ID_DELETE,
  GET as ID_GET,
  PATCH as ID_PATCH,
} from "@/app/api/v1/expenses/[id]/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  ExpenseNotFoundError,
  createExpense,
  getExpenseById,
  hardDeleteExpense,
  listExpenses,
  softDeleteExpense,
  updateExpense,
} from "@/lib/services/expenses";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };

const sampleRow = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "u1",
  familyId: "f1" as string | null,
  linkedPolicyId: null as string | null,
  linkedPropertyId: null as string | null,
  linkedVehicleId: null as string | null,
  linkedGoalId: null as string | null,
  name: "Rent",
  category: "Housing",
  expenseCategory: "current-recurring" as string | null,
  amount: "2500.00",
  frequency: "monthly",
  customMonths: null as string | null,
  startDate: "2026-01-01" as string | null,
  endDate: null as string | null,
  description: null as string | null,
  isActive: true as boolean | null,
  trackedInBudget: true as boolean | null,
  createdAt: new Date("2026-05-15T12:00:00Z"),
  updatedAt: new Date("2026-05-15T12:00:00Z"),
};

const idCtx = {
  params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
};

function listReq(query?: string): NextRequest {
  return new NextRequest(
    new URL(`/api/v1/expenses${query ? `?${query}` : ""}`, "http://test")
  );
}

function jsonReq(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(
    new URL(url, "http://test"),
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

describe("GET /api/v1/expenses", () => {
  it("returns 200 with serialized rows", async () => {
    vi.mocked(listExpenses).mockResolvedValueOnce([sampleRow]);
    const res = await LIST_GET(listReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].createdAt).toBe("2026-05-15T12:00:00.000Z");
  });

  it("forwards isActive filter to service", async () => {
    vi.mocked(listExpenses).mockResolvedValueOnce([]);
    await LIST_GET(listReq("isActive=true"));
    expect(listExpenses).toHaveBeenCalledWith(mockCtx, { isActive: true });
  });

  it("forwards isActive=false correctly (not coerced to truthy)", async () => {
    vi.mocked(listExpenses).mockResolvedValueOnce([]);
    await LIST_GET(listReq("isActive=false"));
    expect(listExpenses).toHaveBeenCalledWith(mockCtx, { isActive: false });
  });

  it("forwards category filter", async () => {
    vi.mocked(listExpenses).mockResolvedValueOnce([]);
    await LIST_GET(listReq("category=Housing"));
    expect(listExpenses).toHaveBeenCalledWith(mockCtx, { category: "Housing" });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUserAndFamily).mockRejectedValueOnce(
      new Error("Unauthorized")
    );
    const res = await LIST_GET(listReq());
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/expenses", () => {
  const validBody = {
    name: "Rent",
    category: "Housing",
    amount: "2500.00",
    frequency: "monthly",
  };

  it("returns 201 on create", async () => {
    vi.mocked(createExpense).mockResolvedValueOnce({
      status: "created",
      row: sampleRow,
    });
    const res = await LIST_POST(
      jsonReq("/api/v1/expenses", "POST", validBody)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.idempotentReplay).toBe(false);
  });

  it("returns 200 with idempotentReplay on conflict", async () => {
    vi.mocked(createExpense).mockResolvedValueOnce({
      status: "conflict",
      row: sampleRow,
    });
    const res = await LIST_POST(
      jsonReq("/api/v1/expenses", "POST", { ...validBody, id: sampleRow.id })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.idempotentReplay).toBe(true);
  });

  it("maps cross-user collision to 409", async () => {
    const err = new Error("collision") as Error & { code?: string };
    err.code = "CONFLICT";
    vi.mocked(createExpense).mockRejectedValueOnce(err);
    const res = await LIST_POST(
      jsonReq("/api/v1/expenses", "POST", { ...validBody, id: sampleRow.id })
    );
    expect(res.status).toBe(409);
  });

  it("returns 422 on invalid frequency", async () => {
    const res = await LIST_POST(
      jsonReq("/api/v1/expenses", "POST", {
        ...validBody,
        frequency: "fortnightly",
      })
    );
    expect(res.status).toBe(422);
  });

  it("returns 422 on missing required fields", async () => {
    const res = await LIST_POST(
      jsonReq("/api/v1/expenses", "POST", { amount: "100" })
    );
    expect(res.status).toBe(422);
  });
});

describe("GET /api/v1/expenses/[id]", () => {
  it("returns 200 when found", async () => {
    vi.mocked(getExpenseById).mockResolvedValueOnce(sampleRow);
    const res = await ID_GET(jsonReq("/api/v1/expenses/x", "GET"), idCtx);
    expect(res.status).toBe(200);
  });

  it("returns 404 when service returns null", async () => {
    vi.mocked(getExpenseById).mockResolvedValueOnce(null);
    const res = await ID_GET(jsonReq("/api/v1/expenses/x", "GET"), idCtx);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/expenses/[id]", () => {
  it("returns 200 on update", async () => {
    vi.mocked(updateExpense).mockResolvedValueOnce({
      ...sampleRow,
      name: "Renamed",
    });
    const res = await ID_PATCH(
      jsonReq("/api/v1/expenses/x", "PATCH", { name: "Renamed" }),
      idCtx
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Renamed");
  });

  it("returns 404 when service throws ExpenseNotFoundError", async () => {
    vi.mocked(updateExpense).mockRejectedValueOnce(new ExpenseNotFoundError());
    const res = await ID_PATCH(
      jsonReq("/api/v1/expenses/x", "PATCH", { name: "Renamed" }),
      idCtx
    );
    expect(res.status).toBe(404);
  });

  it("returns 422 on empty body", async () => {
    const res = await ID_PATCH(
      jsonReq("/api/v1/expenses/x", "PATCH", {}),
      idCtx
    );
    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/v1/expenses/[id]", () => {
  it("soft-deletes by default", async () => {
    vi.mocked(softDeleteExpense).mockResolvedValueOnce({
      ...sampleRow,
      isActive: false,
    });
    const res = await ID_DELETE(jsonReq("/api/v1/expenses/x", "DELETE"), idCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
    expect(body.data.mode).toBe("soft");
    expect(softDeleteExpense).toHaveBeenCalled();
    expect(hardDeleteExpense).not.toHaveBeenCalled();
  });

  it("hard-deletes when ?hard=true", async () => {
    vi.mocked(hardDeleteExpense).mockResolvedValueOnce(undefined);
    const res = await ID_DELETE(
      jsonReq("/api/v1/expenses/x?hard=true", "DELETE"),
      idCtx
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.mode).toBe("hard");
    expect(hardDeleteExpense).toHaveBeenCalled();
    expect(softDeleteExpense).not.toHaveBeenCalled();
  });

  it("returns 404 when service throws", async () => {
    vi.mocked(softDeleteExpense).mockRejectedValueOnce(
      new ExpenseNotFoundError()
    );
    const res = await ID_DELETE(jsonReq("/api/v1/expenses/x", "DELETE"), idCtx);
    expect(res.status).toBe(404);
  });
});
