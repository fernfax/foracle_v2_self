import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-context", () => ({
  getCurrentUserAndFamily: vi.fn(),
}));
vi.mock("@/lib/services/investments", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/investments")>(
    "@/lib/services/investments"
  );
  return {
    ...actual,
    listInvestments: vi.fn(),
    createInvestment: vi.fn(),
    getInvestmentById: vi.fn(),
    updateInvestment: vi.fn(),
    deleteInvestment: vi.fn(),
    getInvestmentsSummary: vi.fn(),
  };
});

import {
  GET as LIST_GET,
  POST as LIST_POST,
} from "@/app/api/v1/assets/investments/route";
import {
  DELETE as ID_DELETE,
  GET as ID_GET,
  PATCH as ID_PATCH,
} from "@/app/api/v1/assets/investments/[id]/route";
import { GET as SUMMARY_GET } from "@/app/api/v1/assets/investments/summary/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  InvestmentNotFoundError,
  createInvestment,
  deleteInvestment,
  getInvestmentById,
  getInvestmentsSummary,
  listInvestments,
  updateInvestment,
} from "@/lib/services/investments";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };
const ID = "11111111-1111-4111-8111-111111111111";

const sampleRow = {
  id: ID,
  userId: "u1",
  familyId: "f1" as string | null,
  name: "VTI",
  type: "etf",
  currentCapital: "10000.00",
  projectedYield: "8.00",
  contributionAmount: "500.00",
  contributionFrequency: "monthly",
  customMonths: null as string | null,
  isActive: true as boolean | null,
  createdAt: new Date("2026-05-15T12:00:00Z"),
  updatedAt: new Date("2026-05-15T12:00:00Z"),
};

const idCtx = { params: Promise.resolve({ id: ID }) };

function listReq(query?: string): NextRequest {
  return new NextRequest(
    new URL(`/api/v1/assets/investments${query ? `?${query}` : ""}`, "http://test")
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

const validBody = {
  name: "VTI",
  type: "etf" as const,
  currentCapital: "10000.00",
  projectedYield: "8.00",
  contributionAmount: "500.00",
  contributionFrequency: "monthly" as const,
};

describe("Investments routes", () => {
  it("GET list with filters", async () => {
    vi.mocked(listInvestments).mockResolvedValueOnce([sampleRow]);
    await LIST_GET(listReq("isActive=true&type=etf"));
    expect(listInvestments).toHaveBeenCalledWith(mockCtx, {
      isActive: true,
      type: "etf",
    });
  });

  it("POST 201 + 200 idempotent + 409 + 422", async () => {
    vi.mocked(createInvestment).mockResolvedValueOnce({ status: "created", row: sampleRow });
    expect(
      (await LIST_POST(jsonReq("/api/v1/assets/investments", "POST", validBody))).status
    ).toBe(201);

    vi.mocked(createInvestment).mockResolvedValueOnce({ status: "conflict", row: sampleRow });
    expect(
      (await LIST_POST(
        jsonReq("/api/v1/assets/investments", "POST", { ...validBody, id: ID })
      )).status
    ).toBe(200);

    const err = new Error("c") as Error & { code?: string };
    err.code = "CONFLICT";
    vi.mocked(createInvestment).mockRejectedValueOnce(err);
    expect(
      (await LIST_POST(
        jsonReq("/api/v1/assets/investments", "POST", { ...validBody, id: ID })
      )).status
    ).toBe(409);

    expect(
      (await LIST_POST(
        jsonReq("/api/v1/assets/investments", "POST", { ...validBody, type: "junk" })
      )).status
    ).toBe(422);
  });

  it("GET/PATCH/DELETE by id", async () => {
    vi.mocked(getInvestmentById).mockResolvedValueOnce(sampleRow);
    expect((await ID_GET(jsonReq(`/api/v1/assets/investments/${ID}`, "GET"), idCtx)).status).toBe(200);
    vi.mocked(getInvestmentById).mockResolvedValueOnce(null);
    expect((await ID_GET(jsonReq(`/api/v1/assets/investments/${ID}`, "GET"), idCtx)).status).toBe(404);

    vi.mocked(updateInvestment).mockResolvedValueOnce(sampleRow);
    expect(
      (await ID_PATCH(
        jsonReq(`/api/v1/assets/investments/${ID}`, "PATCH", { name: "Renamed" }),
        idCtx
      )).status
    ).toBe(200);
    vi.mocked(updateInvestment).mockRejectedValueOnce(new InvestmentNotFoundError());
    expect(
      (await ID_PATCH(
        jsonReq(`/api/v1/assets/investments/${ID}`, "PATCH", { name: "x" }),
        idCtx
      )).status
    ).toBe(404);

    vi.mocked(deleteInvestment).mockResolvedValueOnce(undefined);
    expect((await ID_DELETE(jsonReq(`/api/v1/assets/investments/${ID}`, "DELETE"), idCtx)).status).toBe(200);
  });

  it("summary returns 200 with computed fields", async () => {
    vi.mocked(getInvestmentsSummary).mockResolvedValueOnce({
      totalPortfolioValue: 10000,
      averageYield: 8,
      totalMonthlyContribution: 500,
      activeCount: 1,
    });
    const res = await SUMMARY_GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.totalPortfolioValue).toBe(10000);
    expect(body.data.activeCount).toBe(1);
  });
});
