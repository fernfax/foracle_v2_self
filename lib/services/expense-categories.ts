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

async function seedDefaults(userId: string): Promise<void> {
  await db.insert(expenseCategories).values(
    DEFAULT_CATEGORIES.map((name) => ({
      id: randomUUID(),
      userId,
      name,
      isDefault: true,
    }))
  );
}

// Returns the user's categories, seeding defaults for new users and
// backfilling any category names that appear in the recurring `expenses`
// table but are missing from `expense_categories`. This auto-heal behavior
// is preserved from the original lib/actions/expense-categories.ts so the
// web continues to work identically after the service swap.
export async function listExpenseCategories(
  ctx: AuthContext
): Promise<ExpenseCategoryRow[]> {
  let categories = await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.userId, ctx.userId))
    .orderBy(asc(expenseCategories.name));

  if (categories.length === 0) {
    await seedDefaults(ctx.userId);
    categories = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.userId, ctx.userId))
      .orderBy(asc(expenseCategories.name));
  }

  const existingNames = new Set(categories.map((c) => c.name));
  const namesInExpenses = await db
    .selectDistinct({ category: expenses.category })
    .from(expenses)
    .where(and(eq(expenses.userId, ctx.userId), eq(expenses.isActive, true)));

  const missing = namesInExpenses
    .map((e) => e.category)
    .filter((name) => !existingNames.has(name));

  if (missing.length > 0) {
    await db.insert(expenseCategories).values(
      missing.map((name) => ({
        id: randomUUID(),
        userId: ctx.userId,
        name,
        isDefault: false,
        trackedInBudget: true,
      }))
    );
    categories = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.userId, ctx.userId))
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
      name,
      isDefault: false,
    })
    .returning();
  return row;
}
