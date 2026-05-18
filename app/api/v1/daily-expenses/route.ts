import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../_lib/auth";
import { ok, created, wrap } from "../_lib/response";
import { ApiError } from "../_lib/errors";
import {
  createDailyExpenseBodySchema,
  listDailyExpensesQuerySchema,
  resolveDateRange,
} from "@/lib/api-schemas/daily-expenses";
import {
  createDailyExpense,
  listDailyExpenses,
  type DailyExpenseRow,
} from "@/lib/services/daily-expenses";

function serialize(row: DailyExpenseRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();

    const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = listDailyExpensesQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Invalid query parameters",
        parsed.error.issues
      );
    }

    const range = resolveDateRange(parsed.data);
    const rows = await listDailyExpenses(ctx, range);
    return ok(rows.map(serialize));
  });
}

export async function POST(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const body = createDailyExpenseBodySchema.parse(await req.json());

    let result;
    try {
      result = await createDailyExpense(ctx, body);
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

    revalidatePath("/budget");
    const payload = { ...serialize(result.row), idempotentReplay: result.status === "conflict" };
    return result.status === "created" ? created(payload) : ok(payload);
  });
}
