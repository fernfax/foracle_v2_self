import { and, asc, eq } from "drizzle-orm";
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

async function seedDefaults(ctx: AuthContext): Promise<void> {
  await db.insert(expenseCategories).values(
    DEFAULT_CATEGORIES.map((name) => ({
      id: randomUUID(),
      userId: ctx.userId,
      familyId: ctx.familyId,
      name,
      isDefault: true,
    }))
  );
}

// Returns the family's categories, seeding defaults for fresh families and
// backfilling any category names that appear in the recurring `expenses`
// table but are missing from `expense_categories`. Family-scoped so every
// member of a household sees the same category set.
export async function listExpenseCategories(
  ctx: AuthContext
): Promise<ExpenseCategoryRow[]> {
  let categories = await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.familyId, ctx.familyId))
    .orderBy(asc(expenseCategories.name));

  if (categories.length === 0) {
    await seedDefaults(ctx);
    categories = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.familyId, ctx.familyId))
      .orderBy(asc(expenseCategories.name));
  }

  const existingNames = new Set(categories.map((c) => c.name));
  const namesInExpenses = await db
    .selectDistinct({ category: expenses.category })
    .from(expenses)
    .where(and(eq(expenses.familyId, ctx.familyId), eq(expenses.isActive, true)));

  const missing = namesInExpenses
    .map((e) => e.category)
    .filter((name) => !existingNames.has(name));

  if (missing.length > 0) {
    await db.insert(expenseCategories).values(
      missing.map((name) => ({
        id: randomUUID(),
        userId: ctx.userId,
        familyId: ctx.familyId,
        name,
        isDefault: false,
        trackedInBudget: true,
      }))
    );
    categories = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.familyId, ctx.familyId))
      .orderBy(asc(expenseCategories.name));
  }

  return categories;
}

export async function createExpenseCategory(
  ctx: AuthContext,
  name: string
): Promise<ExpenseCategoryRow> {
  const [row] = await db
    .insert(expenseCategories)
    .values({
      id: randomUUID(),
      userId: ctx.userId,
      familyId: ctx.familyId,
      name,
      isDefault: false,
    })
    .returning();
  return row;
}
