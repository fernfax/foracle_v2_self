import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-context", () => ({
  getCurrentUserAndFamily: vi.fn(),
}));
vi.mock("@/lib/services/expense-subcategories", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/services/expense-subcategories")>(
      "@/lib/services/expense-subcategories"
    );
  return {
    ...actual,
    listExpenseSubcategories: vi.fn(),
    createExpenseSubcategory: vi.fn(),
    getExpenseSubcategoryById: vi.fn(),
    updateExpenseSubcategory: vi.fn(),
    deleteExpenseSubcategory: vi.fn(),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  GET as LIST_GET,
  POST as LIST_POST,
} from "@/app/api/v1/expense-subcategories/route";
import {
  DELETE as ID_DELETE,
  GET as ID_GET,
  PATCH as ID_PATCH,
} from "@/app/api/v1/expense-subcategories/[id]/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  SubcategoryNotFoundError,
  createExpenseSubcategory,
  deleteExpenseSubcategory,
  getExpenseSubcategoryById,
  listExpenseSubcategories,
  updateExpenseSubcategory,
} from "@/lib/services/expense-subcategories";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };

const sampleRow = {
  id: "sub-1",
  userId: "u1",
  familyId: "f1" as string | null,
  categoryId: "cat-1",
  name: "Groceries",
  createdAt: new Date("2026-05-15T12:00:00Z"),
  updatedAt: new Date("2026-05-15T12:00:00Z"),
};

const idCtx = { params: Promise.resolve({ id: "sub-1" }) };

function listReq(query?: string): NextRequest {
  const url = new URL(
    `/api/v1/expense-subcategories${query ? `?${query}` : ""}`,
    "http://test"
  );
  return new NextRequest(url);
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

describe("GET /api/v1/expense-subcategories", () => {
  it("returns 200 with serialized rows", async () => {
    vi.mocked(listExpenseSubcategories).mockResolvedValueOnce([sampleRow]);
    const res = await LIST_GET(listReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].createdAt).toBe("2026-05-15T12:00:00.000Z");
    expect(listExpenseSubcategories).toHaveBeenCalledWith(mockCtx, {});
  });

  it("filters by categoryId when present", async () => {
    vi.mocked(listExpenseSubcategories).mockResolvedValueOnce([]);
    await LIST_GET(listReq("categoryId=cat-1"));
    expect(listExpenseSubcategories).toHaveBeenCalledWith(mockCtx, {
      categoryId: "cat-1",
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUserAndFamily).mockRejectedValueOnce(
      new Error("Unauthorized")
    );
    const res = await LIST_GET(listReq());
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/expense-subcategories", () => {
  it("returns 201 on create", async () => {
    vi.mocked(createExpenseSubcategory).mockResolvedValueOnce(sampleRow);
    const res = await LIST_POST(
      jsonReq("/api/v1/expense-subcategories", "POST", {
        categoryId: "cat-1",
        name: "Groceries",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe("sub-1");
    expect(createExpenseSubcategory).toHaveBeenCalledWith(mockCtx, {
      categoryId: "cat-1",
      name: "Groceries",
    });
  });

  it("returns 422 when name missing", async () => {
    const res = await LIST_POST(
      jsonReq("/api/v1/expense-subcategories", "POST", { categoryId: "cat-1" })
    );
    expect(res.status).toBe(422);
    expect(createExpenseSubcategory).not.toHaveBeenCalled();
  });

  it("returns 422 when categoryId empty", async () => {
    const res = await LIST_POST(
      jsonReq("/api/v1/expense-subcategories", "POST", {
        categoryId: "",
        name: "Groceries",
      })
    );
    expect(res.status).toBe(422);
  });
});

describe("GET /api/v1/expense-subcategories/[id]", () => {
  it("returns 200 when found", async () => {
    vi.mocked(getExpenseSubcategoryById).mockResolvedValueOnce(sampleRow);
    const res = await ID_GET(jsonReq("/api/v1/expense-subcategories/sub-1", "GET"), idCtx);
    expect(res.status).toBe(200);
  });

  it("returns 404 when service returns null", async () => {
    vi.mocked(getExpenseSubcategoryById).mockResolvedValueOnce(null);
    const res = await ID_GET(jsonReq("/api/v1/expense-subcategories/sub-1", "GET"), idCtx);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/expense-subcategories/[id]", () => {
  it("returns 200 on update", async () => {
    vi.mocked(updateExpenseSubcategory).mockResolvedValueOnce({
      ...sampleRow,
      name: "Renamed",
    });
    const res = await ID_PATCH(
      jsonReq("/api/v1/expense-subcategories/sub-1", "PATCH", {
        name: "Renamed",
      }),
      idCtx
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Renamed");
  });

  it("returns 404 when service throws SubcategoryNotFoundError", async () => {
    vi.mocked(updateExpenseSubcategory).mockRejectedValueOnce(
      new SubcategoryNotFoundError()
    );
    const res = await ID_PATCH(
      jsonReq("/api/v1/expense-subcategories/sub-1", "PATCH", {
        name: "Renamed",
      }),
      idCtx
    );
    expect(res.status).toBe(404);
  });

  it("returns 422 on empty body", async () => {
    const res = await ID_PATCH(
      jsonReq("/api/v1/expense-subcategories/sub-1", "PATCH", {}),
      idCtx
    );
    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/v1/expense-subcategories/[id]", () => {
  it("returns 200 on success", async () => {
    vi.mocked(deleteExpenseSubcategory).mockResolvedValueOnce(undefined);
    const res = await ID_DELETE(
      jsonReq("/api/v1/expense-subcategories/sub-1", "DELETE"),
      idCtx
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it("returns 404 when service throws", async () => {
    vi.mocked(deleteExpenseSubcategory).mockRejectedValueOnce(
      new SubcategoryNotFoundError()
    );
    const res = await ID_DELETE(
      jsonReq("/api/v1/expense-subcategories/sub-1", "DELETE"),
      idCtx
    );
    expect(res.status).toBe(404);
  });
});
