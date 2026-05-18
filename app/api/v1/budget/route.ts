import type { NextRequest } from "next/server";
import { verifyAndScope } from "../_lib/auth";
import { ok, wrap } from "../_lib/response";
import { budgetQuerySchema } from "@/lib/api-schemas/budget";
import { getBudgetForMonth } from "@/lib/services/budget";

export async function GET(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { year, month } = budgetQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );
    const data = await getBudgetForMonth(ctx, year, month);
    return ok(data);
  });
}
