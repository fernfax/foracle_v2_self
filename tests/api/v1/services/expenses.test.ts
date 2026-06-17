import { db } from "@/db"
import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import {
  createExpense,
  ExpenseNotFoundError,
  getExpenseById,
  hardDeleteExpense,
  listExpenses,
  softDeleteExpense,
  updateExpense
} from "@/lib/services/expenses"
import { expenses } from "@/db/schema"

import { seedUser, truncateAll } from "../../../db-helpers"

const UUID_1 = "11111111-1111-4111-8111-111111111111"
const UUID_2 = "22222222-2222-4222-8222-222222222222"

const baseInput = {
  name: "Rent",
  category: "Housing" as const,
  amount: "2500.00",
  frequency: "monthly" as const
}

beforeEach(async () => {
  await truncateAll()
})

describe("listExpenses (real DB)", () => {
  it("scopes by userId — never returns rows from another user", async () => {
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

    await createExpense(ctxA, baseInput)
    await createExpense(ctxB, baseInput)
    await createExpense(ctxB, { ...baseInput, name: "Food" })

    const aRows = await listExpenses(ctxA)
    expect(aRows).toHaveLength(1)
    expect(aRows[0].userId).toBe("user-a")

    const bRows = await listExpenses(ctxB)
    expect(bRows).toHaveLength(2)
    expect(bRows.every((r) => r.userId === "user-b")).toBe(true)
  })

  it("isActive filter respects soft-delete state", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const created = await createExpense(ctx, { ...baseInput, id: UUID_1 })
    await createExpense(ctx, { ...baseInput, id: UUID_2, name: "Food" })
    await softDeleteExpense(ctx, created.row.id)

    const active = await listExpenses(ctx, { isActive: true })
    expect(active).toHaveLength(1)
    expect(active[0].id).toBe(UUID_2)

    const inactive = await listExpenses(ctx, { isActive: false })
    expect(inactive).toHaveLength(1)
    expect(inactive[0].id).toBe(UUID_1)
  })

  it("category filter narrows the set", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    await createExpense(ctx, baseInput)
    await createExpense(ctx, {
      ...baseInput,
      name: "Groceries",
      category: "Food"
    })

    const food = await listExpenses(ctx, { category: "Food" })
    expect(food).toHaveLength(1)
    expect(food[0].category).toBe("Food")
  })
})

describe("createExpense (real DB)", () => {
  it("backfills familyId from AuthContext", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const result = await createExpense(ctx, baseInput)
    expect(result.status).toBe("created")
    expect(result.row.familyId).toBe("fam-a")
    expect(result.row.isActive).toBe(true)
    expect(result.row.trackedInBudget).toBe(true)
  })

  it("idempotency: same UUID + same user returns conflict, not duplicate", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const first = await createExpense(ctx, { ...baseInput, id: UUID_1 })
    expect(first.status).toBe("created")

    const replay = await createExpense(ctx, {
      ...baseInput,
      id: UUID_1,
      name: "DIFFERENT",
      amount: "9999.99"
    })
    expect(replay.status).toBe("conflict")
    expect(replay.row.name).toBe("Rent")

    const all = await db.select().from(expenses).where(eq(expenses.id, UUID_1))
    expect(all).toHaveLength(1)
  })

  it("throws on cross-user id collision", async () => {
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
    await createExpense(ctxA, { ...baseInput, id: UUID_1 })
    await expect(
      createExpense(ctxB, { ...baseInput, id: UUID_1 })
    ).rejects.toThrow(/collision/)
  })
})

describe("updateExpense + delete (real DB)", () => {
  it("update refuses to touch another user's row", async () => {
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
    await createExpense(ctxA, { ...baseInput, id: UUID_1 })

    await expect(
      updateExpense(ctxB, UUID_1, { amount: "1" })
    ).rejects.toBeInstanceOf(ExpenseNotFoundError)

    const stillIntact = await getExpenseById(ctxA, UUID_1)
    expect(stillIntact?.amount).toBe("2500.00")
  })

  it("softDelete keeps the row but flips isActive=false", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    await createExpense(ctx, { ...baseInput, id: UUID_1 })

    const deleted = await softDeleteExpense(ctx, UUID_1)
    expect(deleted.isActive).toBe(false)

    const stillThere = await getExpenseById(ctx, UUID_1)
    expect(stillThere).not.toBeNull()
    expect(stillThere?.isActive).toBe(false)
  })

  it("hardDelete removes the row", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    await createExpense(ctx, { ...baseInput, id: UUID_1 })
    await hardDeleteExpense(ctx, UUID_1)
    expect(await getExpenseById(ctx, UUID_1)).toBeNull()
  })

  it("softDelete throws NotFound for another user's row", async () => {
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
    await createExpense(ctxA, { ...baseInput, id: UUID_1 })

    await expect(softDeleteExpense(ctxB, UUID_1)).rejects.toBeInstanceOf(
      ExpenseNotFoundError
    )

    const stillActive = await getExpenseById(ctxA, UUID_1)
    expect(stillActive?.isActive).toBe(true)
  })
})
