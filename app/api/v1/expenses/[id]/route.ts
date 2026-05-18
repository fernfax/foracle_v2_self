import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../../_lib/auth";
import { ApiError } from "../../_lib/errors";
import { ok, wrap } from "../../_lib/response";
import {
  deleteExpenseQuerySchema,
  updateExpenseBodySchema,
} from "@/lib/api-schemas/expenses";
import {
  ExpenseNotFoundError,
  getExpenseById,
  hardDeleteExpense,
  softDeleteExpense,
  updateExpense,
  type ExpenseRow,
} from "@/lib/services/expenses";

function serialize(row: ExpenseRow) {
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
    const row = await getExpenseById(ctx, id);
    if (!row) throw new ApiError("NOT_FOUND", "Expense not found");
    return ok(serialize(row));
  });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    const patch = updateExpenseBodySchema.parse(await req.json());
    try {
      const row = await updateExpense(ctx, id, patch);
      revalidatePath("/expenses");
      return ok(serialize(row));
    } catch (err) {
      if (err instanceof ExpenseNotFoundError) {
        throw new ApiError("NOT_FOUND", "Expense not found");
      }
      throw err;
    }
  });
}

// DELETE soft-deletes by default (isActive → false). Pass ?hard=true to
// remove the row entirely.
export async function DELETE(req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    const { hard } = deleteExpenseQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );

    try {
      if (hard) {
        await hardDeleteExpense(ctx, id);
        revalidatePath("/expenses");
        return ok({ deleted: true, mode: "hard" });
      }
      const row = await softDeleteExpense(ctx, id);
      revalidatePath("/expenses");
      return ok({ deleted: true, mode: "soft", row: serialize(row) });
    } catch (err) {
      if (err instanceof ExpenseNotFoundError) {
        throw new ApiError("NOT_FOUND", "Expense not found");
      }
      throw err;
    }
  });
}
