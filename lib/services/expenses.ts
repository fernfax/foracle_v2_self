import { randomUUID } from "crypto"
import { db } from "@/db"
import { and, desc, eq } from "drizzle-orm"

import type {
  CreateExpenseBody,
  UpdateExpenseBody
} from "@/lib/api-schemas/expenses"
import type { AuthContext } from "@/lib/auth-context"
import { expenses } from "@/db/schema"

export type ExpenseRow = typeof expenses.$inferSelect

export class ExpenseNotFoundError extends Error {
  constructor() {
    super("Expense not found")
  }
}

export type ListExpensesOpts = {
  isActive?: boolean
  category?: string
}

export async function listExpenses(
  ctx: AuthContext,
  opts: ListExpensesOpts = {}
): Promise<ExpenseRow[]> {
  const conditions = [eq(expenses.familyId, ctx.familyId)]
  if (opts.isActive !== undefined) {
    conditions.push(eq(expenses.isActive, opts.isActive))
  }
  if (opts.category !== undefined) {
    conditions.push(eq(expenses.category, opts.category))
  }
  return db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.createdAt))
}

export async function getExpenseById(
  ctx: AuthContext,
  id: string
): Promise<ExpenseRow | null> {
  const row = await db.query.expenses.findFirst({
    where: and(eq(expenses.id, id), eq(expenses.familyId, ctx.familyId))
  })
  return row ?? null
}

export type CreateExpenseResult =
  | { status: "created"; row: ExpenseRow }
  | { status: "conflict"; row: ExpenseRow }

export async function createExpense(
  ctx: AuthContext,
  body: CreateExpenseBody
): Promise<CreateExpenseResult> {
  const id = body.id ?? randomUUID()

  if (body.id) {
    const existing = await db.query.expenses.findFirst({
      where: eq(expenses.id, body.id)
    })
    if (existing) {
      if (existing.familyId !== ctx.familyId) {
        const err = new Error(
          "id collision with another family's row"
        ) as Error & {
          code?: string
        }
        err.code = "CONFLICT"
        throw err
      }
      return { status: "conflict", row: existing }
    }
  }

  const [row] = await db
    .insert(expenses)
    .values({
      id,
      userId: ctx.userId,
      familyId: ctx.familyId,
      name: body.name,
      category: body.category,
      expenseCategory: body.expenseCategory ?? "current-recurring",
      amount: body.amount,
      frequency: body.frequency,
      customMonths: body.customMonths ?? null,
      startDate: body.startDate ?? null,
      endDate: body.endDate ?? null,
      description: body.description ?? null,
      isActive: true,
      trackedInBudget: body.trackedInBudget ?? true
    })
    .returning()

  return { status: "created", row }
}

export async function updateExpense(
  ctx: AuthContext,
  id: string,
  patch: UpdateExpenseBody
): Promise<ExpenseRow> {
  const existing = await getExpenseById(ctx, id)
  if (!existing) throw new ExpenseNotFoundError()

  const update: Partial<typeof expenses.$inferInsert> = {
    updatedAt: new Date()
  }
  if (patch.name !== undefined) update.name = patch.name
  if (patch.category !== undefined) update.category = patch.category
  if (patch.expenseCategory !== undefined)
    update.expenseCategory = patch.expenseCategory
  if (patch.amount !== undefined) update.amount = patch.amount
  if (patch.frequency !== undefined) update.frequency = patch.frequency
  if (patch.customMonths !== undefined)
    update.customMonths = patch.customMonths ?? null
  if (patch.startDate !== undefined) update.startDate = patch.startDate ?? null
  if (patch.endDate !== undefined) update.endDate = patch.endDate ?? null
  if (patch.description !== undefined)
    update.description = patch.description ?? null
  if (patch.isActive !== undefined) update.isActive = patch.isActive
  if (patch.trackedInBudget !== undefined)
    update.trackedInBudget = patch.trackedInBudget

  const [row] = await db
    .update(expenses)
    .set(update)
    .where(and(eq(expenses.id, id), eq(expenses.familyId, ctx.familyId)))
    .returning()
  return row
}

// Soft-delete keeps the row but flips isActive=false. The recurring expenses
// view filters on isActive in the UI, so this hides the expense without losing
// history. Use hardDeleteExpense when the user wants the row gone for good.
export async function softDeleteExpense(
  ctx: AuthContext,
  id: string
): Promise<ExpenseRow> {
  const existing = await getExpenseById(ctx, id)
  if (!existing) throw new ExpenseNotFoundError()
  const [row] = await db
    .update(expenses)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(expenses.id, id), eq(expenses.familyId, ctx.familyId)))
    .returning()
  return row
}

export async function hardDeleteExpense(
  ctx: AuthContext,
  id: string
): Promise<void> {
  const existing = await getExpenseById(ctx, id)
  if (!existing) throw new ExpenseNotFoundError()
  await db
    .delete(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.familyId, ctx.familyId)))
}
