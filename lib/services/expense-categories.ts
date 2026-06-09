import { and, asc, eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { expenseCategories, expenses } from "@/db/schema";
import type { AuthContext } from "@/lib/auth-context";

export type ExpenseCategoryRow = typeof expenseCategories.$inferSelect;

// Must match the categories used in onboarding (ExpensesStep.tsx).
const DEFAULT_CATEGORIES = [
  "Housing",
  "Food",
  "Transportation",
  "Utilities",
  "Healthcare",
  "Insurance",
  "Children",
  "Entertainment",
  "Allowances",
  "Vehicle",
  "Shopping",
];

function readFamilyCategories(ctx: AuthContext) {
  return db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.familyId, ctx.familyId))
    .orderBy(asc(expenseCategories.name));
}

/**
 * Collapse duplicate (familyId, name) rows to one per name so the category
 * picker never shows a name twice. Heals families that accumulated duplicates
 * before the seed/backfill below was made atomic. When duplicates exist we keep
 * the most useful row: a tracked category over an untracked one, then a default,
 * then the oldest — so we never silently drop a category the user budgets with.
 */
function dedupeByName(rows: ExpenseCategoryRow[]): ExpenseCategoryRow[] {
  const score = (r: ExpenseCategoryRow) =>
    (r.trackedInBudget !== false ? 4 : 0) + (r.isDefault ? 2 : 0) + (r.icon ? 1 : 0);
  const byName = new Map<string, ExpenseCategoryRow>();
  for (const r of rows) {
    const cur = byName.get(r.name);
    if (
      !cur ||
      score(r) > score(cur) ||
      (score(r) === score(cur) && r.createdAt < cur.createdAt)
    ) {
      byName.set(r.name, r);
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Returns the family's categories, seeding defaults for fresh families and
// backfilling any category names that appear in the recurring `expenses` table
// but are missing from `expense_categories`. Family-scoped so every member of a
// household sees the same set.
//
// The seed + backfill run inside a per-family advisory lock so concurrent
// callers — the web budget page AND the native /api/v1/expense-categories
// endpoint — queue instead of racing the (previously non-atomic) check-then-
// insert. That race, with no unique (familyId, name) constraint, is what
// produced the duplicate categories in the picker. The returned list is also
// de-duplicated by name to hide any duplicates created before this fix.
export async function listExpenseCategories(
  ctx: AuthContext
): Promise<ExpenseCategoryRow[]> {
  let categories = await readFamilyCategories(ctx);

  const existingNames = new Set(categories.map((c) => c.name));
  const namesInExpenses =
    categories.length === 0
      ? []
      : (
          await db
            .selectDistinct({ category: expenses.category })
            .from(expenses)
            .where(
              and(eq(expenses.familyId, ctx.familyId), eq(expenses.isActive, true))
            )
        ).map((e) => e.category);
  const missing = namesInExpenses.filter((name) => !existingNames.has(name));

  if (categories.length === 0 || missing.length > 0) {
    await db.transaction(async (tx) => {
      // Serialize all category seeding/backfill for this family so two
      // concurrent requests can't both pass the existence check and insert.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${ctx.familyId})::bigint)`
      );

      const current = await tx
        .select()
        .from(expenseCategories)
        .where(eq(expenseCategories.familyId, ctx.familyId));
      const have = new Set(current.map((c) => c.name));

      if (current.length === 0) {
        await tx
          .insert(expenseCategories)
          .values(
            DEFAULT_CATEGORIES.map((name) => ({
              id: randomUUID(),
              userId: ctx.userId,
              familyId: ctx.familyId,
              name,
              isDefault: true,
            }))
          )
          .onConflictDoNothing();
        DEFAULT_CATEGORIES.forEach((n) => have.add(n));
      }

      const inExpenses = (
        await tx
          .selectDistinct({ category: expenses.category })
          .from(expenses)
          .where(
            and(eq(expenses.familyId, ctx.familyId), eq(expenses.isActive, true))
          )
      ).map((e) => e.category);
      const stillMissing = inExpenses.filter((name) => !have.has(name));

      if (stillMissing.length > 0) {
        await tx
          .insert(expenseCategories)
          .values(
            stillMissing.map((name) => ({
              id: randomUUID(),
              userId: ctx.userId,
              familyId: ctx.familyId,
              name,
              isDefault: false,
              trackedInBudget: true,
            }))
          )
          .onConflictDoNothing();
      }
    });
    categories = await readFamilyCategories(ctx);
  }

  return dedupeByName(categories);
}

export async function createExpenseCategory(
  ctx: AuthContext,
  name: string
): Promise<ExpenseCategoryRow> {
  // A family can only have one category per name — return the existing one
  // instead of creating a duplicate.
  const [existing] = await db
    .select()
    .from(expenseCategories)
    .where(
      and(
        eq(expenseCategories.familyId, ctx.familyId),
        eq(expenseCategories.name, name)
      )
    )
    .limit(1);
  if (existing) return existing;

  const [row] = await db
    .insert(expenseCategories)
    .values({
      id: randomUUID(),
      userId: ctx.userId,
      familyId: ctx.familyId,
      name,
      isDefault: false,
    })
    .onConflictDoNothing()
    .returning();
  if (row) return row;

  // Lost a race with a concurrent create — return the row the other writer made.
  const [raced] = await db
    .select()
    .from(expenseCategories)
    .where(
      and(
        eq(expenseCategories.familyId, ctx.familyId),
        eq(expenseCategories.name, name)
      )
    )
    .limit(1);
  return raced;
}
