import { db } from "@/db"
import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import {
  createGoal,
  deleteGoal,
  getGoalById,
  GoalNotFoundError,
  listGoals,
  markGoalAchieved,
  updateGoal
} from "@/lib/services/goals"
import { expenses, goals } from "@/db/schema"

import { seedUser, truncateAll } from "../../../db-helpers"

const baseGoal = {
  goalName: "Buy car",
  goalType: "primary" as const,
  targetAmount: "20000.00",
  targetDate: "2027-01-01"
}

beforeEach(async () => {
  await truncateAll()
})

describe("listGoals (real DB)", () => {
  it("scopes by userId — never returns another user's goals", async () => {
    const ctxA = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const ctxB = await seedUser({
      userId: "user-b",
      familyId: "fam-b",
      isMaster: true
    })

    await createGoal(ctxA, baseGoal)
    await createGoal(ctxB, baseGoal)
    await createGoal(ctxB, { ...baseGoal, goalName: "House" })

    const aRows = await listGoals(ctxA)
    expect(aRows).toHaveLength(1)
    expect(aRows[0].userId).toBe("user-a")

    const bRows = await listGoals(ctxB)
    expect(bRows).toHaveLength(2)
  })

  it("filters narrow correctly", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const g1 = await createGoal(ctx, baseGoal)
    await createGoal(ctx, {
      ...baseGoal,
      goalName: "Secondary",
      goalType: "secondary"
    })
    await markGoalAchieved(ctx, g1.id)

    const active = await listGoals(ctx, { isActive: true, isAchieved: false })
    expect(active).toHaveLength(1)
    expect(active[0].goalType).toBe("secondary")

    const achieved = await listGoals(ctx, { isAchieved: true })
    expect(achieved).toHaveLength(1)
    expect(achieved[0].id).toBe(g1.id)

    const primary = await listGoals(ctx, { goalType: "primary" })
    expect(primary).toHaveLength(1)
  })
})

describe("createGoal linked-expense behavior (real DB)", () => {
  it("creates paired Savings expense when addToExpenditures + contribution > 0", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const row = await createGoal(ctx, {
      ...baseGoal,
      monthlyContribution: "500.00",
      addToExpenditures: true
    })
    expect(row.linkedExpenseId).not.toBeNull()

    const exp = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, row.linkedExpenseId!))
    expect(exp).toHaveLength(1)
    expect(exp[0].category).toBe("Savings")
    expect(exp[0].amount).toBe("500.00")
    expect(exp[0].linkedGoalId).toBe(row.id)
  })

  it("does NOT create expense when addToExpenditures is false", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const row = await createGoal(ctx, {
      ...baseGoal,
      monthlyContribution: "500.00"
    })
    expect(row.linkedExpenseId).toBeNull()
    const exp = await db.select().from(expenses)
    expect(exp).toHaveLength(0)
  })

  it("does NOT create expense when contribution is zero, even with addToExpenditures=true", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const row = await createGoal(ctx, {
      ...baseGoal,
      monthlyContribution: "0",
      addToExpenditures: true
    })
    expect(row.linkedExpenseId).toBeNull()
  })
})

describe("updateGoal linked-expense sync (real DB)", () => {
  it("toggling addToExpenditures on creates the linked expense", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const goal = await createGoal(ctx, baseGoal)
    expect(goal.linkedExpenseId).toBeNull()

    const updated = await updateGoal(ctx, goal.id, {
      addToExpenditures: true,
      monthlyContribution: "300.00"
    })
    expect(updated.linkedExpenseId).not.toBeNull()
    const exp = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, updated.linkedExpenseId!))
    expect(exp[0].amount).toBe("300.00")
  })

  it("toggling addToExpenditures off deletes the linked expense", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const goal = await createGoal(ctx, {
      ...baseGoal,
      monthlyContribution: "300.00",
      addToExpenditures: true
    })
    const expenseId = goal.linkedExpenseId!
    expect(expenseId).not.toBeNull()

    const updated = await updateGoal(ctx, goal.id, { addToExpenditures: false })
    expect(updated.linkedExpenseId).toBeNull()

    const expRow = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, expenseId))
    expect(expRow).toHaveLength(0)
  })

  it("changing monthlyContribution while linked updates the expense amount", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const goal = await createGoal(ctx, {
      ...baseGoal,
      monthlyContribution: "300.00",
      addToExpenditures: true
    })
    const expenseId = goal.linkedExpenseId!

    await updateGoal(ctx, goal.id, {
      addToExpenditures: true,
      monthlyContribution: "800.00"
    })

    const expRow = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, expenseId))
    expect(expRow[0].amount).toBe("800.00")
  })

  it("refuses to touch another user's goal", async () => {
    const ctxA = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const ctxB = await seedUser({
      userId: "user-b",
      familyId: "fam-b",
      isMaster: true
    })
    const goal = await createGoal(ctxA, baseGoal)
    await expect(
      updateGoal(ctxB, goal.id, { currentAmountSaved: "5000.00" })
    ).rejects.toBeInstanceOf(GoalNotFoundError)
  })
})

describe("deleteGoal cascade (real DB)", () => {
  it("delete cascades to linked expense", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const goal = await createGoal(ctx, {
      ...baseGoal,
      monthlyContribution: "500.00",
      addToExpenditures: true
    })
    const expenseId = goal.linkedExpenseId!

    await deleteGoal(ctx, goal.id)

    const expRow = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, expenseId))
    expect(expRow).toHaveLength(0)

    const goalRow = await db.select().from(goals).where(eq(goals.id, goal.id))
    expect(goalRow).toHaveLength(0)
  })

  it("delete without linked expense just removes the goal", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const goal = await createGoal(ctx, baseGoal)
    await deleteGoal(ctx, goal.id)
    expect(await getGoalById(ctx, goal.id)).toBeNull()
  })
})

describe("markGoalAchieved (real DB)", () => {
  it("flips isAchieved=true", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const goal = await createGoal(ctx, baseGoal)
    expect(goal.isAchieved).toBe(false)
    const updated = await markGoalAchieved(ctx, goal.id)
    expect(updated.isAchieved).toBe(true)
  })

  it("refuses another user's goal", async () => {
    const ctxA = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const ctxB = await seedUser({
      userId: "user-b",
      familyId: "fam-b",
      isMaster: true
    })
    const goal = await createGoal(ctxA, baseGoal)
    await expect(markGoalAchieved(ctxB, goal.id)).rejects.toBeInstanceOf(
      GoalNotFoundError
    )
  })
})
