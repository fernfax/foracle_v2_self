import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-context", () => ({
  getCurrentUserAndFamily: vi.fn(),
}));
vi.mock("@/lib/services/property-assets", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/property-assets")>(
    "@/lib/services/property-assets"
  );
  return {
    ...actual,
    listPropertyAssets: vi.fn(),
    createPropertyAsset: vi.fn(),
    getPropertyAssetById: vi.fn(),
    updatePropertyAsset: vi.fn(),
    deletePropertyAsset: vi.fn(),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  GET as LIST_GET,
  POST as LIST_POST,
} from "@/app/api/v1/assets/properties/route";
import {
  DELETE as ID_DELETE,
  GET as ID_GET,
  PATCH as ID_PATCH,
} from "@/app/api/v1/assets/properties/[id]/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  PropertyAssetNotFoundError,
  createPropertyAsset,
  deletePropertyAsset,
  getPropertyAssetById,
  listPropertyAssets,
  updatePropertyAsset,
} from "@/lib/services/property-assets";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };
const ID = "11111111-1111-4111-8111-111111111111";

const sampleRow = {
  id: ID,
  userId: "u1",
  familyId: "f1" as string | null,
  linkedExpenseId: null as string | null,
  propertyName: "Condo",
  purchaseDate: "2026-01-01",
  originalPurchasePrice: "500000.00",
  loanAmountTaken: "400000.00" as string | null,
  outstandingLoan: "350000.00",
  monthlyLoanPayment: "2000.00",
  interestRate: "3.50",
  principalCpfWithdrawn: null as string | null,
  housingGrantTaken: null as string | null,
  accruedInterestToDate: null as string | null,
  paidByCpf: false as boolean | null,
  isActive: true as boolean | null,
  createdAt: new Date("2026-05-15T12:00:00Z"),
  updatedAt: new Date("2026-05-15T12:00:00Z"),
};

const idCtx = { params: Promise.resolve({ id: ID }) };

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
  propertyName: "Condo",
  purchaseDate: "2026-01-01",
  originalPurchasePrice: "500000.00",
  outstandingLoan: "350000.00",
  monthlyLoanPayment: "2000.00",
  interestRate: "3.50",
};

describe("GET /api/v1/assets/properties", () => {
  it("returns 200 with rows", async () => {
    vi.mocked(listPropertyAssets).mockResolvedValueOnce([sampleRow]);
    const res = await LIST_GET(
      new NextRequest(new URL("/api/v1/assets/properties", "http://test"))
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it("returns 401 unauthenticated", async () => {
    vi.mocked(getCurrentUserAndFamily).mockRejectedValueOnce(new Error("Unauthorized"));
    const res = await LIST_GET(
      new NextRequest(new URL("/api/v1/assets/properties", "http://test"))
    );
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/assets/properties", () => {
  it("returns 201 on create", async () => {
    vi.mocked(createPropertyAsset).mockResolvedValueOnce({
      status: "created",
      row: sampleRow,
    });
    const res = await LIST_POST(
      jsonReq("/api/v1/assets/properties", "POST", validBody)
    );
    expect(res.status).toBe(201);
  });

  it("returns 200 idempotentReplay on conflict", async () => {
    vi.mocked(createPropertyAsset).mockResolvedValueOnce({
      status: "conflict",
      row: sampleRow,
    });
    const res = await LIST_POST(
      jsonReq("/api/v1/assets/properties", "POST", { ...validBody, id: ID })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.idempotentReplay).toBe(true);
  });

  it("maps cross-user collision to 409", async () => {
    const err = new Error("collision") as Error & { code?: string };
    err.code = "CONFLICT";
    vi.mocked(createPropertyAsset).mockRejectedValueOnce(err);
    const res = await LIST_POST(
      jsonReq("/api/v1/assets/properties", "POST", { ...validBody, id: ID })
    );
    expect(res.status).toBe(409);
  });

  it("returns 422 on missing required field", async () => {
    const res = await LIST_POST(
      jsonReq("/api/v1/assets/properties", "POST", { propertyName: "x" })
    );
    expect(res.status).toBe(422);
  });
});

describe("/[id] routes", () => {
  it("GET 200 + 404", async () => {
    vi.mocked(getPropertyAssetById).mockResolvedValueOnce(sampleRow);
    expect((await ID_GET(jsonReq(`/api/v1/assets/properties/${ID}`, "GET"), idCtx)).status).toBe(200);
    vi.mocked(getPropertyAssetById).mockResolvedValueOnce(null);
    expect((await ID_GET(jsonReq(`/api/v1/assets/properties/${ID}`, "GET"), idCtx)).status).toBe(404);
  });

  it("PATCH 200 / 404 / 422-empty", async () => {
    vi.mocked(updatePropertyAsset).mockResolvedValueOnce(sampleRow);
    expect(
      (await ID_PATCH(
        jsonReq(`/api/v1/assets/properties/${ID}`, "PATCH", { propertyName: "Renamed" }),
        idCtx
      )).status
    ).toBe(200);

    vi.mocked(updatePropertyAsset).mockRejectedValueOnce(new PropertyAssetNotFoundError());
    expect(
      (await ID_PATCH(
        jsonReq(`/api/v1/assets/properties/${ID}`, "PATCH", { propertyName: "Renamed" }),
        idCtx
      )).status
    ).toBe(404);

    expect(
      (await ID_PATCH(jsonReq(`/api/v1/assets/properties/${ID}`, "PATCH", {}), idCtx)).status
    ).toBe(422);
  });

  it("DELETE 200 / 404", async () => {
    vi.mocked(deletePropertyAsset).mockResolvedValueOnce(undefined);
    expect((await ID_DELETE(jsonReq(`/api/v1/assets/properties/${ID}`, "DELETE"), idCtx)).status).toBe(200);

    vi.mocked(deletePropertyAsset).mockRejectedValueOnce(new PropertyAssetNotFoundError());
    expect((await ID_DELETE(jsonReq(`/api/v1/assets/properties/${ID}`, "DELETE"), idCtx)).status).toBe(404);
  });
});
