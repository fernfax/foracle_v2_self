import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../../_lib/auth";
import { ok, wrap } from "../../_lib/response";
import { ApiError } from "../../_lib/errors";
import { updateExpenseSubcategoryBodySchema } from "@/lib/api-schemas/expense-subcategories";
import {
  SubcategoryNotFoundError,
  deleteExpenseSubcategory,
  getExpenseSubcategoryById,
  updateExpenseSubcategory,
  type ExpenseSubcategoryRow,
} from "@/lib/services/expense-subcategories";

function serialize(row: ExpenseSubcategoryRow) {
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
    const row = await getExpenseSubcategoryById(ctx, id);
    if (!row) throw new ApiError("NOT_FOUND", "Subcategory not found");
    return ok(serialize(row));
  });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    const patch = updateExpenseSubcategoryBodySchema.parse(await req.json());
    try {
      const row = await updateExpenseSubcategory(ctx, id, patch);
      revalidatePath("/budget");
      return ok(serialize(row));
    } catch (err) {
      if (err instanceof SubcategoryNotFoundError) {
        throw new ApiError("NOT_FOUND", "Subcategory not found");
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
      await deleteExpenseSubcategory(ctx, id);
      revalidatePath("/budget");
      return ok({ deleted: true });
    } catch (err) {
      if (err instanceof SubcategoryNotFoundError) {
        throw new ApiError("NOT_FOUND", "Subcategory not found");
      }
      throw err;
    }
  });
}
