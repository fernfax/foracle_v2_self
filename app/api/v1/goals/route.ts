import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../_lib/auth";
import { created, ok, wrap } from "../_lib/response";
import {
  createGoalBodySchema,
  listGoalsQuerySchema,
} from "@/lib/api-schemas/goals";
import {
  createGoal,
  listGoals,
  type GoalRow,
} from "@/lib/services/goals";

function serialize(row: GoalRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const query = listGoalsQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );
    const rows = await listGoals(ctx, query);
    return ok(rows.map(serialize));
  });
}

export async function POST(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const body = createGoalBodySchema.parse(await req.json());
    const row = await createGoal(ctx, body);
    revalidatePath("/goals");
    revalidatePath("/expenses");
    return created(serialize(row));
  });
}
