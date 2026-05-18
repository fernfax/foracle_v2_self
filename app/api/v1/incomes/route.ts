import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../_lib/auth";
import { created, ok, wrap } from "../_lib/response";
import { createIncomeBodySchema } from "@/lib/api-schemas/incomes";
import {
  createIncome,
  listIncomes,
  type IncomeRow,
} from "@/lib/services/incomes";

function serialize<T extends IncomeRow>(row: T) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET() {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const rows = await listIncomes(ctx);
    return ok(rows.map((r) => ({ ...serialize(r), familyMember: r.familyMember })));
  });
}

export async function POST(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const body = createIncomeBodySchema.parse(await req.json());
    const row = await createIncome(ctx, body);
    revalidatePath("/user");
    return created(serialize(row));
  });
}
