import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-context", () => ({
  getCurrentUserAndFamily: vi.fn(),
}));
vi.mock("@/lib/services/incomes", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/incomes")>(
    "@/lib/services/incomes"
  );
  return {
    ...actual,
    listIncomes: vi.fn(),
    createIncome: vi.fn(),
    getIncomeById: vi.fn(),
    updateIncome: vi.fn(),
    toggleIncomeActive: vi.fn(),
    deleteIncome: vi.fn(),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { GET as LIST_GET, POST as LIST_POST } from "@/app/api/v1/incomes/route";
import {
  DELETE as ID_DELETE,
  GET as ID_GET,
  PATCH as ID_PATCH,
} from "@/app/api/v1/incomes/[id]/route";
import { POST as TOGGLE_POST } from "@/app/api/v1/incomes/[id]/toggle-active/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  IncomeNotFoundError,
  createIncome,
  deleteIncome,
  getIncomeById,
  listIncomes,
  toggleIncomeActive,
  updateIncome,
} from "@/lib/services/incomes";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };

const sampleRow = {
  id: "inc-1",
  userId: "u1",
  familyId: "f1",
  familyMemberId: null as string | null,
  name: "Salary",
  category: "Employment",
  incomeCategory: "current",
  amount: "5000.00",
  startDate: "2026-01-01",
  endDate: null as string | null,
  subjectToCpf: true as boolean | null,
  accountForBonus: false as boolean | null,
  bonusGroups: null as string | null,
  employeeCpfContribution: "1000.00" as string | null,
  employerCpfContribution: "850.00" as string | null,
  netTakeHome: "4000.00" as string | null,
  cpfOrdinaryAccount: null as string | null,
  cpfSpecialAccount: null as string | null,
  cpfMedisaveAccount: null as string | null,
  description: null as string | null,
  pastIncomeHistory: null as string | null,
  futureMilestones: null as string | null,
  accountForFutureChange: false as boolean | null,
  isActive: true as boolean | null,
  createdAt: new Date("2026-05-15T12:00:00Z"),
  updatedAt: new Date("2026-05-15T12:00:00Z"),
};

const idCtx = { params: Promise.resolve({ id: "inc-1" }) };

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

describe("GET /api/v1/incomes", () => {
  it("returns 200 with serialized rows + familyMember", async () => {
    vi.mocked(listIncomes).mockResolvedValueOnce([
      { ...sampleRow, familyMember: { id: "fm-1", name: "Spouse", relationship: "spouse", dateOfBirth: null, isContributing: true } },
    ]);
    const res = await LIST_GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].familyMember.name).toBe("Spouse");
    expect(body.data[0].createdAt).toBe("2026-05-15T12:00:00.000Z");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUserAndFamily).mockRejectedValueOnce(
      new Error("Unauthorized")
    );
    const res = await LIST_GET();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/incomes", () => {
  const validBody = {
    name: "Salary",
    category: "Employment",
    amount: "5000.00",
    startDate: "2026-01-01",
    subjectToCpf: true,
  };

  it("returns 201 on create", async () => {
    vi.mocked(createIncome).mockResolvedValueOnce(sampleRow);
    const res = await LIST_POST(jsonReq("/api/v1/incomes", "POST", validBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe("inc-1");
    expect(createIncome).toHaveBeenCalledWith(
      mockCtx,
      expect.objectContaining({ name: "Salary", subjectToCpf: true })
    );
  });

  it("returns 422 on invalid amount", async () => {
    const res = await LIST_POST(
      jsonReq("/api/v1/incomes", "POST", { ...validBody, amount: "abc" })
    );
    expect(res.status).toBe(422);
  });

  it("returns 422 when subjectToCpf missing", async () => {
    const { subjectToCpf, ...withoutCpf } = validBody;
    const res = await LIST_POST(jsonReq("/api/v1/incomes", "POST", withoutCpf));
    expect(res.status).toBe(422);
    void subjectToCpf;
  });

  it("returns 422 on invalid incomeCategory enum", async () => {
    const res = await LIST_POST(
      jsonReq("/api/v1/incomes", "POST", {
        ...validBody,
        incomeCategory: "current-recurring",
      })
    );
    expect(res.status).toBe(422);
  });
});

describe("GET /api/v1/incomes/[id]", () => {
  it("returns 200 when found", async () => {
    vi.mocked(getIncomeById).mockResolvedValueOnce(sampleRow);
    const res = await ID_GET(jsonReq("/api/v1/incomes/inc-1", "GET"), idCtx);
    expect(res.status).toBe(200);
  });

  it("returns 404 when service returns null", async () => {
    vi.mocked(getIncomeById).mockResolvedValueOnce(null);
    const res = await ID_GET(jsonReq("/api/v1/incomes/inc-1", "GET"), idCtx);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/incomes/[id]", () => {
  it("returns 200 on update", async () => {
    vi.mocked(updateIncome).mockResolvedValueOnce({
      ...sampleRow,
      amount: "6000.00",
    });
    const res = await ID_PATCH(
      jsonReq("/api/v1/incomes/inc-1", "PATCH", { amount: "6000.00" }),
      idCtx
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.amount).toBe("6000.00");
  });

  it("returns 404 on IncomeNotFoundError", async () => {
    vi.mocked(updateIncome).mockRejectedValueOnce(new IncomeNotFoundError());
    const res = await ID_PATCH(
      jsonReq("/api/v1/incomes/inc-1", "PATCH", { amount: "6000.00" }),
      idCtx
    );
    expect(res.status).toBe(404);
  });

  it("returns 422 on empty body", async () => {
    const res = await ID_PATCH(jsonReq("/api/v1/incomes/inc-1", "PATCH", {}), idCtx);
    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/v1/incomes/[id]", () => {
  it("returns 200 on success", async () => {
    vi.mocked(deleteIncome).mockResolvedValueOnce(undefined);
    const res = await ID_DELETE(jsonReq("/api/v1/incomes/inc-1", "DELETE"), idCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it("returns 404 on IncomeNotFoundError", async () => {
    vi.mocked(deleteIncome).mockRejectedValueOnce(new IncomeNotFoundError());
    const res = await ID_DELETE(jsonReq("/api/v1/incomes/inc-1", "DELETE"), idCtx);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/v1/incomes/[id]/toggle-active", () => {
  it("returns 200 with flipped isActive", async () => {
    vi.mocked(toggleIncomeActive).mockResolvedValueOnce({
      ...sampleRow,
      isActive: false,
    });
    const res = await TOGGLE_POST(
      jsonReq("/api/v1/incomes/inc-1/toggle-active", "POST"),
      idCtx
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.isActive).toBe(false);
  });

  it("returns 404 on IncomeNotFoundError", async () => {
    vi.mocked(toggleIncomeActive).mockRejectedValueOnce(
      new IncomeNotFoundError()
    );
    const res = await TOGGLE_POST(
      jsonReq("/api/v1/incomes/inc-1/toggle-active", "POST"),
      idCtx
    );
    expect(res.status).toBe(404);
  });
});
