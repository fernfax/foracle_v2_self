import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-context", () => ({
  getCurrentUserAndFamily: vi.fn(),
}));
vi.mock("@/lib/services/policies", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/policies")>(
    "@/lib/services/policies"
  );
  return {
    ...actual,
    listPolicies: vi.fn(),
    createPolicy: vi.fn(),
    getPolicyById: vi.fn(),
    updatePolicy: vi.fn(),
    deletePolicy: vi.fn(),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { GET as LIST_GET, POST as LIST_POST } from "@/app/api/v1/policies/route";
import {
  DELETE as ID_DELETE,
  GET as ID_GET,
  PATCH as ID_PATCH,
} from "@/app/api/v1/policies/[id]/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  PolicyNotFoundError,
  createPolicy,
  deletePolicy,
  getPolicyById,
  listPolicies,
  updatePolicy,
} from "@/lib/services/policies";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };

const sampleRow = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "u1",
  familyId: "f1" as string | null,
  familyMemberId: null as string | null,
  linkedExpenseId: null as string | null,
  provider: "AIA",
  policyNumber: "POL-001" as string | null,
  policyType: "life",
  status: "active" as string | null,
  startDate: "2026-01-01",
  maturityDate: null as string | null,
  coverageUntilAge: null as number | null,
  premiumAmount: "120.00",
  premiumFrequency: "monthly",
  customMonths: null as string | null,
  totalPremiumDuration: null as number | null,
  coverageOptions: null as string | null,
  description: null as string | null,
  isActive: true as boolean | null,
  createdAt: new Date("2026-05-15T12:00:00Z"),
  updatedAt: new Date("2026-05-15T12:00:00Z"),
};

const idCtx = { params: Promise.resolve({ id: sampleRow.id }) };

function listReq(query?: string): NextRequest {
  return new NextRequest(
    new URL(`/api/v1/policies${query ? `?${query}` : ""}`, "http://test")
  );
}

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

describe("GET /api/v1/policies", () => {
  it("returns 200 with rows", async () => {
    vi.mocked(listPolicies).mockResolvedValueOnce([sampleRow]);
    const res = await LIST_GET(listReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(listPolicies).toHaveBeenCalledWith(mockCtx, {});
  });

  it("forwards status + isActive + policyType + familyMemberId filters", async () => {
    vi.mocked(listPolicies).mockResolvedValueOnce([]);
    await LIST_GET(
      listReq("status=active&isActive=true&policyType=life&familyMemberId=fm-1")
    );
    expect(listPolicies).toHaveBeenCalledWith(mockCtx, {
      status: "active",
      isActive: true,
      policyType: "life",
      familyMemberId: "fm-1",
    });
  });

  it("returns 422 on invalid status", async () => {
    const res = await LIST_GET(listReq("status=invalid"));
    expect(res.status).toBe(422);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUserAndFamily).mockRejectedValueOnce(
      new Error("Unauthorized")
    );
    const res = await LIST_GET(listReq());
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/policies", () => {
  const validBody = {
    provider: "AIA",
    policyType: "life",
    startDate: "2026-01-01",
    premiumAmount: "120.00",
    premiumFrequency: "monthly",
  };

  it("returns 201 on create", async () => {
    vi.mocked(createPolicy).mockResolvedValueOnce({
      status: "created",
      row: sampleRow,
    });
    const res = await LIST_POST(jsonReq("/api/v1/policies", "POST", validBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.idempotentReplay).toBe(false);
  });

  it("returns 200 with idempotentReplay on conflict", async () => {
    vi.mocked(createPolicy).mockResolvedValueOnce({
      status: "conflict",
      row: sampleRow,
    });
    const res = await LIST_POST(
      jsonReq("/api/v1/policies", "POST", { ...validBody, id: sampleRow.id })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.idempotentReplay).toBe(true);
  });

  it("maps cross-user collision to 409", async () => {
    const err = new Error("collision") as Error & { code?: string };
    err.code = "CONFLICT";
    vi.mocked(createPolicy).mockRejectedValueOnce(err);
    const res = await LIST_POST(
      jsonReq("/api/v1/policies", "POST", { ...validBody, id: sampleRow.id })
    );
    expect(res.status).toBe(409);
  });

  it("returns 422 on missing required fields", async () => {
    const res = await LIST_POST(
      jsonReq("/api/v1/policies", "POST", { provider: "AIA" })
    );
    expect(res.status).toBe(422);
  });

  it("returns 422 on invalid status", async () => {
    const res = await LIST_POST(
      jsonReq("/api/v1/policies", "POST", { ...validBody, status: "weird" })
    );
    expect(res.status).toBe(422);
  });
});

describe("GET /api/v1/policies/[id]", () => {
  it("returns 200 when found", async () => {
    vi.mocked(getPolicyById).mockResolvedValueOnce(sampleRow);
    const res = await ID_GET(jsonReq("/api/v1/policies/x", "GET"), idCtx);
    expect(res.status).toBe(200);
  });

  it("returns 404 when service returns null", async () => {
    vi.mocked(getPolicyById).mockResolvedValueOnce(null);
    const res = await ID_GET(jsonReq("/api/v1/policies/x", "GET"), idCtx);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/policies/[id]", () => {
  it("returns 200 on update", async () => {
    vi.mocked(updatePolicy).mockResolvedValueOnce({
      ...sampleRow,
      provider: "Manulife",
    });
    const res = await ID_PATCH(
      jsonReq("/api/v1/policies/x", "PATCH", { provider: "Manulife" }),
      idCtx
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.provider).toBe("Manulife");
  });

  it("returns 404 on PolicyNotFoundError", async () => {
    vi.mocked(updatePolicy).mockRejectedValueOnce(new PolicyNotFoundError());
    const res = await ID_PATCH(
      jsonReq("/api/v1/policies/x", "PATCH", { provider: "Manulife" }),
      idCtx
    );
    expect(res.status).toBe(404);
  });

  it("returns 422 on empty body", async () => {
    const res = await ID_PATCH(jsonReq("/api/v1/policies/x", "PATCH", {}), idCtx);
    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/v1/policies/[id]", () => {
  it("returns 200 on success", async () => {
    vi.mocked(deletePolicy).mockResolvedValueOnce(undefined);
    const res = await ID_DELETE(jsonReq("/api/v1/policies/x", "DELETE"), idCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it("returns 404 on PolicyNotFoundError", async () => {
    vi.mocked(deletePolicy).mockRejectedValueOnce(new PolicyNotFoundError());
    const res = await ID_DELETE(jsonReq("/api/v1/policies/x", "DELETE"), idCtx);
    expect(res.status).toBe(404);
  });
});
