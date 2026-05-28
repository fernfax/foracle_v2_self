import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-context", () => ({
  getCurrentUserAndFamily: vi.fn(),
}));
vi.mock("@/lib/services/expense-categories", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/services/expense-categories")>(
      "@/lib/services/expense-categories"
    );
  return {
    ...actual,
    listExpenseCategories: vi.fn(),
    createExpenseCategory: vi.fn(),
  };
});

import { GET, POST } from "@/app/api/v1/expense-categories/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  createExpenseCategory,
  listExpenseCategories,
} from "@/lib/services/expense-categories";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };

const sampleCategory = {
  id: "cat-1",
  userId: "u1",
  familyId: "f1" as string | null,
  name: "Food",
  icon: null as string | null,
  isDefault: true as boolean | null,
  trackedInBudget: null as boolean | null,
  createdAt: new Date("2026-05-15T12:00:00Z"),
  updatedAt: new Date("2026-05-15T12:00:00Z"),
};

function req(method: string, body?: unknown): NextRequest {
  return new NextRequest(
    new URL("/api/v1/expense-categories", "http://test"),
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

describe("GET /api/v1/expense-categories", () => {
  it("returns 200 with serialized categories", async () => {
    vi.mocked(listExpenseCategories).mockResolvedValueOnce([sampleCategory]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe("cat-1");
    expect(body.data[0].createdAt).toBe("2026-05-15T12:00:00.000Z");
  });

  it("passes ctx through to the service", async () => {
    vi.mocked(listExpenseCategories).mockResolvedValueOnce([]);
    await GET();
    expect(listExpenseCategories).toHaveBeenCalledWith(mockCtx);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUserAndFamily).mockRejectedValueOnce(
      new Error("Unauthorized")
    );
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/expense-categories", () => {
  it("returns 201 on create", async () => {
    vi.mocked(createExpenseCategory).mockResolvedValueOnce({
      ...sampleCategory,
      name: "Travel",
      id: "cat-2",
    });
    const res = await POST(req("POST", { name: "Travel" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe("Travel");
    expect(createExpenseCategory).toHaveBeenCalledWith(mockCtx, "Travel");
  });

  it("returns 422 on empty name", async () => {
    const res = await POST(req("POST", { name: "" }));
    expect(res.status).toBe(422);
    expect(createExpenseCategory).not.toHaveBeenCalled();
  });

  it("returns 422 on missing name", async () => {
    const res = await POST(req("POST", {}));
    expect(res.status).toBe(422);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUserAndFamily).mockRejectedValueOnce(
      new Error("Unauthorized")
    );
    const res = await POST(req("POST", { name: "Travel" }));
    expect(res.status).toBe(401);
  });
});
