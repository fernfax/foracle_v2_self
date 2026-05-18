import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../_lib/auth";
import { created, ok, wrap } from "../_lib/response";
import {
  createExpenseSubcategoryBodySchema,
  listExpenseSubcategoriesQuerySchema,
} from "@/lib/api-schemas/expense-subcategories";
import {
  createExpenseSubcategory,
  listExpenseSubcategories,
  type ExpenseSubcategoryRow,
} from "@/lib/services/expense-subcategories";

function serialize(row: ExpenseSubcategoryRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const query = listExpenseSubcategoriesQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );
    const rows = await listExpenseSubcategories(ctx, query);
    return ok(rows.map(serialize));
  });
}

export async function POST(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const body = createExpenseSubcategoryBodySchema.parse(await req.json());
    const row = await createExpenseSubcategory(ctx, body);
    revalidatePath("/budget");
    return created(serialize(row));
  });
}
