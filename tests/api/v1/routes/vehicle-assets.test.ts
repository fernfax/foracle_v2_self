import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-context", () => ({
  getCurrentUserAndFamily: vi.fn(),
}));
vi.mock("@/lib/services/vehicle-assets", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/vehicle-assets")>(
    "@/lib/services/vehicle-assets"
  );
  return {
    ...actual,
    listVehicleAssets: vi.fn(),
    createVehicleAsset: vi.fn(),
    getVehicleAssetById: vi.fn(),
    updateVehicleAsset: vi.fn(),
    deleteVehicleAsset: vi.fn(),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  GET as LIST_GET,
  POST as LIST_POST,
} from "@/app/api/v1/assets/vehicles/route";
import {
  DELETE as ID_DELETE,
  GET as ID_GET,
  PATCH as ID_PATCH,
} from "@/app/api/v1/assets/vehicles/[id]/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  VehicleAssetNotFoundError,
  createVehicleAsset,
  deleteVehicleAsset,
  getVehicleAssetById,
  listVehicleAssets,
  updateVehicleAsset,
} from "@/lib/services/vehicle-assets";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };
const ID = "11111111-1111-4111-8111-111111111111";

const sampleRow = {
  id: ID,
  userId: "u1",
  familyId: "f1" as string | null,
  linkedExpenseId: null as string | null,
  vehicleName: "Tesla",
  purchaseDate: "2026-01-01",
  coeExpiryDate: null as string | null,
  originalPurchasePrice: "80000.00",
  loanAmountTaken: null as string | null,
  loanInterestRate: null as string | null,
  loanTenureYears: null as number | null,
  loanTenureMonths: null as number | null,
  loanAmountRepaid: null as string | null,
  monthlyLoanPayment: null as string | null,
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
  vehicleName: "Tesla",
  purchaseDate: "2026-01-01",
  originalPurchasePrice: "80000.00",
};

describe("Vehicle assets routes", () => {
  it("GET list happy", async () => {
    vi.mocked(listVehicleAssets).mockResolvedValueOnce([sampleRow]);
    const res = await LIST_GET(
      new NextRequest(new URL("/api/v1/assets/vehicles", "http://test"))
    );
    expect(res.status).toBe(200);
  });

  it("POST returns 201 + 200 idempotent + 409 collision + 422", async () => {
    vi.mocked(createVehicleAsset).mockResolvedValueOnce({ status: "created", row: sampleRow });
    expect((await LIST_POST(jsonReq("/api/v1/assets/vehicles", "POST", validBody))).status).toBe(201);

    vi.mocked(createVehicleAsset).mockResolvedValueOnce({ status: "conflict", row: sampleRow });
    expect(
      (await LIST_POST(jsonReq("/api/v1/assets/vehicles", "POST", { ...validBody, id: ID }))).status
    ).toBe(200);

    const err = new Error("c") as Error & { code?: string };
    err.code = "CONFLICT";
    vi.mocked(createVehicleAsset).mockRejectedValueOnce(err);
    expect(
      (await LIST_POST(jsonReq("/api/v1/assets/vehicles", "POST", { ...validBody, id: ID }))).status
    ).toBe(409);

    expect(
      (await LIST_POST(jsonReq("/api/v1/assets/vehicles", "POST", { vehicleName: "x" }))).status
    ).toBe(422);
  });

  it("GET/PATCH/DELETE by id", async () => {
    vi.mocked(getVehicleAssetById).mockResolvedValueOnce(sampleRow);
    expect((await ID_GET(jsonReq(`/api/v1/assets/vehicles/${ID}`, "GET"), idCtx)).status).toBe(200);
    vi.mocked(getVehicleAssetById).mockResolvedValueOnce(null);
    expect((await ID_GET(jsonReq(`/api/v1/assets/vehicles/${ID}`, "GET"), idCtx)).status).toBe(404);

    vi.mocked(updateVehicleAsset).mockResolvedValueOnce(sampleRow);
    expect(
      (await ID_PATCH(
        jsonReq(`/api/v1/assets/vehicles/${ID}`, "PATCH", { vehicleName: "Renamed" }),
        idCtx
      )).status
    ).toBe(200);
    vi.mocked(updateVehicleAsset).mockRejectedValueOnce(new VehicleAssetNotFoundError());
    expect(
      (await ID_PATCH(
        jsonReq(`/api/v1/assets/vehicles/${ID}`, "PATCH", { vehicleName: "Renamed" }),
        idCtx
      )).status
    ).toBe(404);

    vi.mocked(deleteVehicleAsset).mockResolvedValueOnce(undefined);
    expect((await ID_DELETE(jsonReq(`/api/v1/assets/vehicles/${ID}`, "DELETE"), idCtx)).status).toBe(200);
    vi.mocked(deleteVehicleAsset).mockRejectedValueOnce(new VehicleAssetNotFoundError());
    expect((await ID_DELETE(jsonReq(`/api/v1/assets/vehicles/${ID}`, "DELETE"), idCtx)).status).toBe(404);
  });
});
