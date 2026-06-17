import { db } from "@/db"
import { and, asc, eq } from "drizzle-orm"
import { nanoid } from "nanoid"

import type {
  CreateGoalBody,
  ListGoalsQuery,
  UpdateGoalBody
} from "@/lib/api-schemas/goals"
import type { AuthContext } from "@/lib/auth-context"
import { expenses, goals } from "@/db/schema"

export type GoalRow = typeof goals.$inferSelect

export class GoalNotFoundError extends Error {
  constructor() {
    super("Goal not found")
  }
}

function expenseNameFor(goalName: string, override?: string | null): string {
  return override?.trim() ? override : `${goalName} - Monthly Savings`
}

async function ensureLinkedExpense(opts: {
  ctx: AuthContext
  goalId: string
  goalName: string
  monthlyContribution: string
  expenseName?: string | null
  existingExpenseId: string | null
}): Promise<string> {
  if (opts.existingExpenseId) {
    await db
      .update(expenses)
      .set({
        name: expenseNameFor(opts.goalName, opts.expenseName),
        amount: opts.monthlyContribution,
        updatedAt: new Date()
      })
      .where(eq(expenses.id, opts.existingExpenseId))
    return opts.existingExpenseId
  }
  const id = nanoid()
  await db.insert(expenses).values({
    id,
    userId: opts.ctx.userId,
    familyId: opts.ctx.familyId,
    linkedGoalId: opts.goalId,
    name: expenseNameFor(opts.goalName, opts.expenseName),
    category: "Savings",
    expenseCategory: "current-recurring",
    amount: opts.monthlyContribution,
    frequency: "Monthly",
    description: `Auto-generated from goal: ${opts.goalName}`,
    isActive: true
  })
  return id
}

export async function listGoals(
  ctx: AuthContext,
  filters: ListGoalsQuery = {}
): Promise<GoalRow[]> {
  const conditions = [eq(goals.familyId, ctx.familyId)]
  if (filters.isActive !== undefined)
    conditions.push(eq(goals.isActive, filters.isActive))
  if (filters.isAchieved !== undefined)
    conditions.push(eq(goals.isAchieved, filters.isAchieved))
  if (filters.goalType !== undefined)
    conditions.push(eq(goals.goalType, filters.goalType))
  return db
    .select()
    .from(goals)
    .where(and(...conditions))
    .orderBy(asc(goals.createdAt))
}

export async function getGoalById(
  ctx: AuthContext,
  id: string
): Promise<GoalRow | null> {
  const row = await db.query.goals.findFirst({
    where: and(eq(goals.id, id), eq(goals.familyId, ctx.familyId))
  })
  return row ?? null
}

export async function createGoal(
  ctx: AuthContext,
  body: CreateGoalBody
): Promise<GoalRow> {
  const goalId = nanoid()
  let linkedExpenseId: string | null = null

  if (
    body.addToExpenditures &&
    body.monthlyContribution &&
    Number(body.monthlyContribution) > 0
  ) {
    linkedExpenseId = await ensureLinkedExpense({
      ctx,
      goalId,
      goalName: body.goalName,
      monthlyContribution: body.monthlyContribution,
      expenseName: body.expenseName,
      existingExpenseId: null
    })
  }

  const [row] = await db
    .insert(goals)
    .values({
      id: goalId,
      userId: ctx.userId,
      familyId: ctx.familyId,
      linkedExpenseId,
      goalName: body.goalName,
      goalType: body.goalType,
      targetAmount: body.targetAmount,
      targetDate: body.targetDate,
      currentAmountSaved: body.currentAmountSaved ?? "0",
      monthlyContribution: body.monthlyContribution ?? null,
      description: body.description ?? null,
      isAchieved: false,
      isActive: true
    })
    .returning()
  return row
}

export async function updateGoal(
  ctx: AuthContext,
  id: string,
  patch: UpdateGoalBody
): Promise<GoalRow> {
  const existing = await getGoalById(ctx, id)
  if (!existing) throw new GoalNotFoundError()

  let linkedExpenseId = existing.linkedExpenseId
  const effectiveGoalName = patch.goalName ?? existing.goalName
  const effectiveMonthlyContribution =
    patch.monthlyContribution !== undefined
      ? patch.monthlyContribution
      : existing.monthlyContribution

  // Cross-resource sync of the linked Savings expense.
  if (
    patch.addToExpenditures !== undefined ||
    patch.monthlyContribution !== undefined
  ) {
    if (
      patch.addToExpenditures === true &&
      effectiveMonthlyContribution &&
      Number(effectiveMonthlyContribution) > 0
    ) {
      linkedExpenseId = await ensureLinkedExpense({
        ctx,
        goalId: id,
        goalName: effectiveGoalName,
        monthlyContribution: effectiveMonthlyContribution,
        expenseName: patch.expenseName,
        existingExpenseId: linkedExpenseId
      })
    } else if (patch.addToExpenditures === false && linkedExpenseId) {
      await db.delete(expenses).where(eq(expenses.id, linkedExpenseId))
      linkedExpenseId = null
    }
  }

  const update: Partial<typeof goals.$inferInsert> = {
    updatedAt: new Date(),
    linkedExpenseId
  }
  if (patch.goalName !== undefined) update.goalName = patch.goalName
  if (patch.goalType !== undefined) update.goalType = patch.goalType
  if (patch.targetAmount !== undefined) update.targetAmount = patch.targetAmount
  if (patch.targetDate !== undefined) update.targetDate = patch.targetDate
  if (patch.currentAmountSaved !== undefined)
    update.currentAmountSaved = patch.currentAmountSaved
  if (patch.monthlyContribution !== undefined)
    update.monthlyContribution = patch.monthlyContribution ?? null
  if (patch.description !== undefined)
    update.description = patch.description ?? null
  if (patch.isAchieved !== undefined) update.isAchieved = patch.isAchieved
  if (patch.isActive !== undefined) update.isActive = patch.isActive

  const [row] = await db
    .update(goals)
    .set(update)
    .where(and(eq(goals.id, id), eq(goals.familyId, ctx.familyId)))
    .returning()
  return row
}

export async function markGoalAchieved(
  ctx: AuthContext,
  id: string
): Promise<GoalRow> {
  const existing = await getGoalById(ctx, id)
  if (!existing) throw new GoalNotFoundError()
  const [row] = await db
    .update(goals)
    .set({ isAchieved: true, updatedAt: new Date() })
    .where(and(eq(goals.id, id), eq(goals.familyId, ctx.familyId)))
    .returning()
  return row
}

export async function deleteGoal(ctx: AuthContext, id: string): Promise<void> {
  const existing = await getGoalById(ctx, id)
  if (!existing) throw new GoalNotFoundError()
  if (existing.linkedExpenseId) {
    await db.delete(expenses).where(eq(expenses.id, existing.linkedExpenseId))
  }
  await db
    .delete(goals)
    .where(and(eq(goals.id, id), eq(goals.familyId, ctx.familyId)))
}
