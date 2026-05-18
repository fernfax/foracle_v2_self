import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../../../_lib/auth";
import { ApiError } from "../../../_lib/errors";
import { ok, wrap } from "../../../_lib/response";
import {
  IncomeNotFoundError,
  toggleIncomeActive,
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

export async function POST(_req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    try {
      const row = await toggleIncomeActive(ctx, id);
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
