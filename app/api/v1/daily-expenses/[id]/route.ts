import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../../_lib/auth";
import { ok, wrap } from "../../_lib/response";
import { ApiError } from "../../_lib/errors";
import { updateDailyExpenseBodySchema } from "@/lib/api-schemas/daily-expenses";
import {
  DailyExpenseNotFoundError,
  deleteDailyExpense,
  getDailyExpenseById,
  updateDailyExpense,
  type DailyExpenseRow,
} from "@/lib/services/daily-expenses";

function serialize(row: DailyExpenseRow) {
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
    const row = await getDailyExpenseById(ctx, id);
    if (!row) throw new ApiError("NOT_FOUND", "Daily expense not found");
    return ok(serialize(row));
  });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    const patch = updateDailyExpenseBodySchema.parse(await req.json());
    try {
      const row = await updateDailyExpense(ctx, id, patch);
      revalidatePath("/budget");
      return ok(serialize(row));
    } catch (err) {
      if (err instanceof DailyExpenseNotFoundError) {
        throw new ApiError("NOT_FOUND", "Daily expense not found");
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
      await deleteDailyExpense(ctx, id);
      revalidatePath("/budget");
      return ok({ deleted: true });
    } catch (err) {
      if (err instanceof DailyExpenseNotFoundError) {
        throw new ApiError("NOT_FOUND", "Daily expense not found");
      }
      throw err;
    }
  });
}
