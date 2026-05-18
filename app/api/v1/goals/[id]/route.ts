import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../../_lib/auth";
import { ApiError } from "../../_lib/errors";
import { ok, wrap } from "../../_lib/response";
import { updateGoalBodySchema } from "@/lib/api-schemas/goals";
import {
  GoalNotFoundError,
  deleteGoal,
  getGoalById,
  updateGoal,
  type GoalRow,
} from "@/lib/services/goals";

function serialize(row: GoalRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    const row = await getGoalById(ctx, id);
    if (!row) throw new ApiError("NOT_FOUND", "Goal not found");
    return ok(serialize(row));
  });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    const patch = updateGoalBodySchema.parse(await req.json());
    try {
      const row = await updateGoal(ctx, id, patch);
      revalidatePath("/goals");
      revalidatePath("/expenses");
      return ok(serialize(row));
    } catch (err) {
      if (err instanceof GoalNotFoundError) {
        throw new ApiError("NOT_FOUND", "Goal not found");
      }
      throw err;
    }
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    try {
      await deleteGoal(ctx, id);
      revalidatePath("/goals");
      revalidatePath("/expenses");
      return ok({ deleted: true });
    } catch (err) {
      if (err instanceof GoalNotFoundError) {
        throw new ApiError("NOT_FOUND", "Goal not found");
      }
      throw err;
    }
  });
}
