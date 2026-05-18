import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../../../_lib/auth";
import { ApiError } from "../../../_lib/errors";
import { ok, wrap } from "../../../_lib/response";
import {
  GoalNotFoundError,
  markGoalAchieved,
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

export async function POST(_req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    try {
      const row = await markGoalAchieved(ctx, id);
      revalidatePath("/goals");
      return ok(serialize(row));
    } catch (err) {
      if (err instanceof GoalNotFoundError) {
        throw new ApiError("NOT_FOUND", "Goal not found");
      }
      throw err;
    }
  });
}
