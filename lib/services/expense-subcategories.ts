import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { expenseSubcategories } from "@/db/schema";
import type { AuthContext } from "@/lib/auth-context";

export type ExpenseSubcategoryRow = typeof expenseSubcategories.$inferSelect;

export class SubcategoryNotFoundError extends Error {
  constructor() {
    super("Subcategory not found");
  }
}

export async function listExpenseSubcategories(
  ctx: AuthContext,
  opts: { categoryId?: string } = {}
): Promise<ExpenseSubcategoryRow[]> {
  const conditions = [eq(expenseSubcategories.familyId, ctx.familyId)];
  if (opts.categoryId) {
    conditions.push(eq(expenseSubcategories.categoryId, opts.categoryId));
  }
  return db
    .select()
    .from(expenseSubcategories)
    .where(and(...conditions))
    .orderBy(asc(expenseSubcategories.name));
}

export async function getExpenseSubcategoryById(
  ctx: AuthContext,
  id: string
): Promise<ExpenseSubcategoryRow | null> {
  const row = await db.query.expenseSubcategories.findFirst({
    where: and(
      eq(expenseSubcategories.id, id),
      eq(expenseSubcategories.familyId, ctx.familyId)
    ),
  });
  return row ?? null;
}

export async function createExpenseSubcategory(
  ctx: AuthContext,
  input: { categoryId: string; name: string }
): Promise<ExpenseSubcategoryRow> {
  const [row] = await db
    .insert(expenseSubcategories)
    .values({
      id: randomUUID(),
      userId: ctx.userId,
      familyId: ctx.familyId,
      categoryId: input.categoryId,
      name: input.name,
    })
    .returning();
  return row;
}

export async function updateExpenseSubcategory(
  ctx: AuthContext,
  id: string,
  patch: { name?: string }
): Promise<ExpenseSubcategoryRow> {
  const existing = await getExpenseSubcategoryById(ctx, id);
  if (!existing) throw new SubcategoryNotFoundError();

  const update: Partial<typeof expenseSubcategories.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (patch.name !== undefined) update.name = patch.name;

  const [row] = await db
    .update(expenseSubcategories)
    .set(update)
    .where(
      and(
        eq(expenseSubcategories.id, id),
        eq(expenseSubcategories.familyId, ctx.familyId)
      )
    )
    .returning();
  return row;
}

export async function deleteExpenseSubcategory(
  ctx: AuthContext,
  id: string
): Promise<void> {
  const existing = await getExpenseSubcategoryById(ctx, id);
  if (!existing) throw new SubcategoryNotFoundError();
  await db
    .delete(expenseSubcategories)
    .where(
      and(
        eq(expenseSubcategories.id, id),
        eq(expenseSubcategories.familyId, ctx.familyId)
      )
    );
}
