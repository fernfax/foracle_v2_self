import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../../_lib/auth";
import { ok, wrap } from "../../_lib/response";
import { bulkCreateDailyExpensesBodySchema } from "@/lib/api-schemas/daily-expenses";
import {
  createDailyExpense,
  type DailyExpenseRow,
} from "@/lib/services/daily-expenses";

// Bulk drain endpoint for the mobile offline queue.
//
// Accepts up to 100 client-supplied ops; runs each through createDailyExpense
// independently so one bad op never fails the whole batch. The response array
// preserves order and carries per-op status so the client can prune its queue.
//
// Idempotency contract: each op's `id` is the queue's idempotency key. If the
// server has already processed that id, the corresponding result status is
// "conflict" with the existing row in `data` — the client treats this as
// "successfully synced" and removes the op.

type OpResult =
  | { id: string; status: "created"; data: SerializedRow }
  | { id: string; status: "conflict"; data: SerializedRow }
  | { id: string; status: "failed"; error: { code: string; message: string } };

type SerializedRow = ReturnType<typeof serialize>;

function serialize(row: DailyExpenseRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function POST(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const body = bulkCreateDailyExpensesBodySchema.parse(await req.json());

    const results: OpResult[] = [];
    let anyCreated = false;

    for (const op of body.ops) {
      const opId = op.id ?? "";
      try {
        const result = await createDailyExpense(ctx, op);
        if (result.status === "created") anyCreated = true;
        results.push({
          id: result.row.id,
          status: result.status,
          data: serialize(result.row),
        });
      } catch (err) {
        const code = (err as Error & { code?: string }).code ?? "INTERNAL";
        const message = err instanceof Error ? err.message : "Unknown error";
        results.push({
          id: opId,
          status: "failed",
          error: { code, message },
        });
      }
    }

    if (anyCreated) revalidatePath("/budget");
    return ok({ results });
  });
}
