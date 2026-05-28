import { and, desc, eq, gte, lte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { dailyExpenses } from "@/db/schema";
import type { AuthContext } from "@/lib/auth-context";
import type {
  CreateDailyExpenseBody,
  UpdateDailyExpenseBody,
} from "@/lib/api-schemas/daily-expenses";

export class DailyExpenseNotFoundError extends Error {
  constructor() {
    super("Daily expense not found");
  }
}

// Service layer for daily expenses.
//
// All callers (the /api/v1/daily-expenses route handlers AND the existing
// "use server" actions in lib/actions/daily-expenses.ts) flow through here.
// Scoping for v1: filter by ctx.userId (matches the web UI's "your own
// expenses only" contract). The AuthContext is threaded through so we can
// flip to family-scoped reads without changing call sites.

export type DailyExpenseRow = typeof dailyExpenses.$inferSelect;

export type ListOpts = {
  startDate: string;
  endDate: string;
};

export type CreateResult =
  | { status: "created"; row: DailyExpenseRow }
  | { status: "conflict"; row: DailyExpenseRow };

// Idempotent create. If the caller supplies an `id` that already exists AND
// belongs to the same user, returns the existing row with status "conflict"
// (200 on the wire). If the id exists but belongs to someone else, throws.
//
// Always backfills familyId from AuthContext so new rows are family-scoped on
// the way in, even though the read path still filters by userId.
export async function createDailyExpense(
  ctx: AuthContext,
  body: CreateDailyExpenseBody
): Promise<CreateResult> {
  const id = body.id ?? randomUUID();

  if (body.id) {
    const existing = await db.query.dailyExpenses.findFirst({
      where: eq(dailyExpenses.id, body.id),
    });
    if (existing) {
      if (existing.familyId !== ctx.familyId) {
        const err = new Error("id collision with another family's row");
        (err as Error & { code?: string }).code = "CONFLICT";
        throw err;
      }
      return { status: "conflict", row: existing };
    }
  }

  const [row] = await db
    .insert(dailyExpenses)
    .values({
      id,
      userId: ctx.userId,
      familyId: ctx.familyId,
      categoryId: body.categoryId ?? null,
      categoryName: body.categoryName,
      subcategoryId: body.subcategoryId ?? null,
      subcategoryName: body.subcategoryName ?? null,
      amount: body.amount,
      note: body.note ?? null,
      date: body.date,
      originalCurrency: body.originalCurrency ?? null,
      originalAmount: body.originalAmount ?? null,
      exchangeRate: body.exchangeRate ?? null,
    })
    .returning();

  return { status: "created", row };
}

export async function listDailyExpenses(
  ctx: AuthContext,
  opts: ListOpts
): Promise<DailyExpenseRow[]> {
  return db
    .select()
    .from(dailyExpenses)
    .where(
      and(
        eq(dailyExpenses.familyId, ctx.familyId),
        gte(dailyExpenses.date, opts.startDate),
        lte(dailyExpenses.date, opts.endDate)
      )
    )
    .orderBy(desc(dailyExpenses.date), desc(dailyExpenses.createdAt));
}

export async function getDailyExpenseById(
  ctx: AuthContext,
  id: string
): Promise<DailyExpenseRow | null> {
  const row = await db.query.dailyExpenses.findFirst({
    where: and(eq(dailyExpenses.id, id), eq(dailyExpenses.familyId, ctx.familyId)),
  });
  return row ?? null;
}

export async function updateDailyExpense(
  ctx: AuthContext,
  id: string,
  patch: UpdateDailyExpenseBody
): Promise<DailyExpenseRow> {
  const existing = await getDailyExpenseById(ctx, id);
  if (!existing) throw new DailyExpenseNotFoundError();

  const update: Partial<typeof dailyExpenses.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (patch.categoryId !== undefined) update.categoryId = patch.categoryId ?? null;
  if (patch.categoryName !== undefined) update.categoryName = patch.categoryName;
  if (patch.subcategoryId !== undefined) update.subcategoryId = patch.subcategoryId ?? null;
  if (patch.subcategoryName !== undefined) update.subcategoryName = patch.subcategoryName ?? null;
  if (patch.amount !== undefined) update.amount = patch.amount;
  if (patch.note !== undefined) update.note = patch.note ?? null;
  if (patch.date !== undefined) update.date = patch.date;
  if (patch.originalCurrency !== undefined) update.originalCurrency = patch.originalCurrency ?? null;
  if (patch.originalAmount !== undefined) update.originalAmount = patch.originalAmount ?? null;
  if (patch.exchangeRate !== undefined) update.exchangeRate = patch.exchangeRate ?? null;

  const [row] = await db
    .update(dailyExpenses)
    .set(update)
    .where(and(eq(dailyExpenses.id, id), eq(dailyExpenses.familyId, ctx.familyId)))
    .returning();
  return row;
}

export async function deleteDailyExpense(ctx: AuthContext, id: string): Promise<void> {
  const existing = await getDailyExpenseById(ctx, id);
  if (!existing) throw new DailyExpenseNotFoundError();
  await db
    .delete(dailyExpenses)
    .where(and(eq(dailyExpenses.id, id), eq(dailyExpenses.familyId, ctx.familyId)));
}
