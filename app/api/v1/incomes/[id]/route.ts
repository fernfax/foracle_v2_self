import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../../_lib/auth";
import { ApiError } from "../../_lib/errors";
import { ok, wrap } from "../../_lib/response";
import { updateIncomeBodySchema } from "@/lib/api-schemas/incomes";
import {
  IncomeNotFoundError,
  deleteIncome,
  getIncomeById,
  updateIncome,
  type IncomeRow,
} from "@/lib/services/incomes";

function serialize(row: IncomeRow) {
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
    const row = await getIncomeById(ctx, id);
    if (!row) throw new ApiError("NOT_FOUND", "Income not found");
    return ok(serialize(row));
  });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    const patch = updateIncomeBodySchema.parse(await req.json());
    try {
      const row = await updateIncome(ctx, id, patch);
      revalidatePath("/user");
      return ok(serialize(row));
    } catch (err) {
      if (err instanceof IncomeNotFoundError) {
        throw new ApiError("NOT_FOUND", "Income not found");
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
      await deleteIncome(ctx, id);
      revalidatePath("/user");
      return ok({ deleted: true });
    } catch (err) {
      if (err instanceof IncomeNotFoundError) {
        throw new ApiError("NOT_FOUND", "Income not found");
      }
      throw err;
    }
  });
}
