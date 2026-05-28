import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-context", () => ({
  getCurrentUserAndFamily: vi.fn(),
}));
vi.mock("@/lib/services/goals", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/goals")>(
    "@/lib/services/goals"
  );
  return {
    ...actual,
    listGoals: vi.fn(),
    createGoal: vi.fn(),
    getGoalById: vi.fn(),
    updateGoal: vi.fn(),
    markGoalAchieved: vi.fn(),
    deleteGoal: vi.fn(),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { GET as LIST_GET, POST as LIST_POST } from "@/app/api/v1/goals/route";
import {
  DELETE as ID_DELETE,
  GET as ID_GET,
  PATCH as ID_PATCH,
} from "@/app/api/v1/goals/[id]/route";
import { POST as ACHIEVE_POST } from "@/app/api/v1/goals/[id]/mark-achieved/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  GoalNotFoundError,
  createGoal,
  deleteGoal,
  getGoalById,
  listGoals,
  markGoalAchieved,
  updateGoal,
} from "@/lib/services/goals";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };

const sampleRow = {
  id: "goal-1",
  userId: "u1",
  familyId: "f1" as string | null,
  linkedExpenseId: null as string | null,
  goalName: "Buy car",
  goalType: "primary",
  targetAmount: "20000.00",
  targetDate: "2027-01-01",
  currentAmountSaved: "1000.00" as string | null,
  monthlyContribution: "500.00" as string | null,
  description: null as string | null,
  isAchieved: false as boolean | null,
  isActive: true as boolean | null,
  createdAt: new Date("2026-05-15T12:00:00Z"),
  updatedAt: new Date("2026-05-15T12:00:00Z"),
};

const idCtx = { params: Promise.resolve({ id: "goal-1" }) };

function listReq(query?: string): NextRequest {
  return new NextRequest(
    new URL(`/api/v1/goals${query ? `?${query}` : ""}`, "http://test")
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

describe("GET /api/v1/goals", () => {
  it("returns 200 with rows + passes empty filters", async () => {
    vi.mocked(listGoals).mockResolvedValueOnce([sampleRow]);
    const res = await LIST_GET(listReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(listGoals).toHaveBeenCalledWith(mockCtx, {});
  });

  it("forwards isActive + isAchieved + goalType filters", async () => {
    vi.mocked(listGoals).mockResolvedValueOnce([]);
    await LIST_GET(listReq("isActive=true&isAchieved=false&goalType=primary"));
    expect(listGoals).toHaveBeenCalledWith(mockCtx, {
      isActive: true,
      isAchieved: false,
      goalType: "primary",
    });
  });

  it("returns 422 on invalid goalType", async () => {
    const res = await LIST_GET(listReq("goalType=tertiary"));
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

describe("POST /api/v1/goals", () => {
  const validBody = {
    goalName: "Buy car",
    goalType: "primary" as const,
    targetAmount: "20000.00",
    targetDate: "2027-01-01",
  };

  it("returns 201 on create", async () => {
    vi.mocked(createGoal).mockResolvedValueOnce(sampleRow);
    const res = await LIST_POST(jsonReq("/api/v1/goals", "POST", validBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe("goal-1");
  });

  it("returns 422 on invalid goalType", async () => {
    const res = await LIST_POST(
      jsonReq("/api/v1/goals", "POST", { ...validBody, goalType: "tertiary" })
    );
    expect(res.status).toBe(422);
  });

  it("returns 422 on missing targetDate", async () => {
    const { targetDate, ...rest } = validBody;
    const res = await LIST_POST(jsonReq("/api/v1/goals", "POST", rest));
    expect(res.status).toBe(422);
    void targetDate;
  });
});

describe("GET /api/v1/goals/[id]", () => {
  it("returns 200 when found", async () => {
    vi.mocked(getGoalById).mockResolvedValueOnce(sampleRow);
    const res = await ID_GET(jsonReq("/api/v1/goals/goal-1", "GET"), idCtx);
    expect(res.status).toBe(200);
  });

  it("returns 404 when service returns null", async () => {
    vi.mocked(getGoalById).mockResolvedValueOnce(null);
    const res = await ID_GET(jsonReq("/api/v1/goals/goal-1", "GET"), idCtx);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/goals/[id]", () => {
  it("returns 200 on update", async () => {
    vi.mocked(updateGoal).mockResolvedValueOnce({
      ...sampleRow,
      currentAmountSaved: "2000.00",
    });
    const res = await ID_PATCH(
      jsonReq("/api/v1/goals/goal-1", "PATCH", { currentAmountSaved: "2000.00" }),
      idCtx
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.currentAmountSaved).toBe("2000.00");
  });

  it("returns 404 on GoalNotFoundError", async () => {
    vi.mocked(updateGoal).mockRejectedValueOnce(new GoalNotFoundError());
    const res = await ID_PATCH(
      jsonReq("/api/v1/goals/goal-1", "PATCH", { currentAmountSaved: "2000.00" }),
      idCtx
    );
    expect(res.status).toBe(404);
  });

  it("returns 422 on empty body", async () => {
    const res = await ID_PATCH(jsonReq("/api/v1/goals/goal-1", "PATCH", {}), idCtx);
    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/v1/goals/[id]", () => {
  it("returns 200 on success", async () => {
    vi.mocked(deleteGoal).mockResolvedValueOnce(undefined);
    const res = await ID_DELETE(jsonReq("/api/v1/goals/goal-1", "DELETE"), idCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it("returns 404 on GoalNotFoundError", async () => {
    vi.mocked(deleteGoal).mockRejectedValueOnce(new GoalNotFoundError());
    const res = await ID_DELETE(jsonReq("/api/v1/goals/goal-1", "DELETE"), idCtx);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/v1/goals/[id]/mark-achieved", () => {
  it("returns 200 with isAchieved=true", async () => {
    vi.mocked(markGoalAchieved).mockResolvedValueOnce({
      ...sampleRow,
      isAchieved: true,
    });
    const res = await ACHIEVE_POST(
      jsonReq("/api/v1/goals/goal-1/mark-achieved", "POST"),
      idCtx
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.isAchieved).toBe(true);
  });

  it("returns 404 on GoalNotFoundError", async () => {
    vi.mocked(markGoalAchieved).mockRejectedValueOnce(new GoalNotFoundError());
    const res = await ACHIEVE_POST(
      jsonReq("/api/v1/goals/goal-1/mark-achieved", "POST"),
      idCtx
    );
    expect(res.status).toBe(404);
  });
});
