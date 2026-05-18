import type { NextRequest } from "next/server";
import { verifyAndScope } from "../_lib/auth";
import { created, ok, wrap } from "../_lib/response";
import { createExpenseCategoryBodySchema } from "@/lib/api-schemas/expense-categories";
import {
  createExpenseCategory,
  listExpenseCategories,
  type ExpenseCategoryRow,
} from "@/lib/services/expense-categories";

function serialize(row: ExpenseCategoryRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET() {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const rows = await listExpenseCategories(ctx);
    return ok(rows.map(serialize));
  });
}

export async function POST(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { name } = createExpenseCategoryBodySchema.parse(await req.json());
    const row = await createExpenseCategory(ctx, name);
    return created(serialize(row));
  });
}
