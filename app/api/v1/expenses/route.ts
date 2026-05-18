import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../_lib/auth";
import { ApiError } from "../_lib/errors";
import { created, ok, wrap } from "../_lib/response";
import {
  createExpenseBodySchema,
  listExpensesQuerySchema,
} from "@/lib/api-schemas/expenses";
import {
  createExpense,
  listExpenses,
  type ExpenseRow,
} from "@/lib/services/expenses";

function serialize(row: ExpenseRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const query = listExpensesQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );
    const rows = await listExpenses(ctx, query);
    return ok(rows.map(serialize));
  });
}

export async function POST(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const body = createExpenseBodySchema.parse(await req.json());

    let result;
    try {
      result = await createExpense(ctx, body);
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code === "CONFLICT") {
        throw new ApiError(
          "CONFLICT",
          "An expense with this id already exists for another user"
        );
      }
      throw err;
    }

    revalidatePath("/expenses");
    const payload = {
      ...serialize(result.row),
      idempotentReplay: result.status === "conflict",
    };
    return result.status === "created" ? created(payload) : ok(payload);
  });
}
