import { db } from "@/db"
import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { emptyTourStatus } from "@/lib/api-schemas/user-prefs"
import {
  checkOnboardingStatus,
  completeOnboarding,
  createOnboardingExpenses
} from "@/lib/services/onboarding"
import {
  getSinglishMode,
  getTourStatus,
  markTourCompleted,
  resetTourStatus,
  setSinglishMode
} from "@/lib/services/user-prefs"
import { expenses, users } from "@/db/schema"

import { seedUser, truncateAll } from "../../../db-helpers"

beforeEach(async () => {
  await truncateAll()
})

describe("singlish mode (real DB)", () => {
  it("defaults to false when never set", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    expect(await getSinglishMode(ctx)).toBe(false)
  })

  it("set then get round-trips", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    await setSinglishMode(ctx, true)
    expect(await getSinglishMode(ctx)).toBe(true)
    await setSinglishMode(ctx, false)
    expect(await getSinglishMode(ctx)).toBe(false)
  })

  it("scopes per user — never returns another user's value", async () => {
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
    await setSinglishMode(ctxA, true)
    expect(await getSinglishMode(ctxA)).toBe(true)
    expect(await getSinglishMode(ctxB)).toBe(false)
  })
})

describe("tour status (real DB)", () => {
  it("returns all-null when never set", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    expect(await getTourStatus(ctx)).toEqual(emptyTourStatus())
  })

  it("markTourCompleted persists ISO timestamp and preserves the others", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const afterDashboard = await markTourCompleted(ctx, "dashboard")
    expect(afterDashboard.dashboard).not.toBeNull()
    expect(afterDashboard.expenses).toBeNull()

    const afterExpenses = await markTourCompleted(ctx, "expenses")
    expect(afterExpenses.dashboard).toBe(afterDashboard.dashboard)
    expect(afterExpenses.expenses).not.toBeNull()
  })

  it("resetTourStatus clears only the named tour", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    await markTourCompleted(ctx, "dashboard")
    await markTourCompleted(ctx, "incomes")

    const after = await resetTourStatus(ctx, "dashboard")
    expect(after.dashboard).toBeNull()
    expect(after.incomes).not.toBeNull()
  })

  it("malformed JSON in DB resolves to empty status (defensive)", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    await db
      .update(users)
      .set({ tourCompletedAt: "{not valid json" })
      .where(eq(users.id, ctx.userId))

    expect(await getTourStatus(ctx)).toEqual(emptyTourStatus())
  })
})

describe("onboarding (real DB)", () => {
  it("status starts false; completeOnboarding flips it", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    expect(await checkOnboardingStatus(ctx)).toBe(false)
    await completeOnboarding(ctx)
    expect(await checkOnboardingStatus(ctx)).toBe(true)
  })

  it("createOnboardingExpenses uses categoryAmounts when provided", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    await createOnboardingExpenses(ctx, {
      categories: ["Housing", "Food"],
      percentageOfIncome: 50,
      monthlyIncome: 5000,
      categoryAmounts: { Housing: "1500.00", Food: "800.00" }
    })
    const rows = await db
      .select()
      .from(expenses)
      .where(eq(expenses.userId, ctx.userId))
    const housing = rows.find((r) => r.category === "Housing")
    const food = rows.find((r) => r.category === "Food")
    expect(housing?.amount).toBe("1500.00")
    expect(food?.amount).toBe("800.00")
  })

  it("createOnboardingExpenses falls back to weighted distribution when no amounts", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    // 50% of 5000 = 2500 total. Weights: Housing 30, Food 20 → total 50.
    // Housing: 2500 * 30/50 = 1500. Food: 2500 * 20/50 = 1000.
    await createOnboardingExpenses(ctx, {
      categories: ["Housing", "Food"],
      percentageOfIncome: 50,
      monthlyIncome: 5000
    })
    const rows = await db
      .select()
      .from(expenses)
      .where(eq(expenses.userId, ctx.userId))
    expect(rows.find((r) => r.category === "Housing")?.amount).toBe("1500.00")
    expect(rows.find((r) => r.category === "Food")?.amount).toBe("1000.00")
  })

  it("createOnboardingExpenses replaces prior current-recurring rows", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    await createOnboardingExpenses(ctx, {
      categories: ["Housing"],
      percentageOfIncome: 50,
      monthlyIncome: 5000,
      categoryAmounts: { Housing: "1500.00" }
    })
    await createOnboardingExpenses(ctx, {
      categories: ["Food"],
      percentageOfIncome: 50,
      monthlyIncome: 5000,
      categoryAmounts: { Food: "800.00" }
    })
    const rows = await db
      .select()
      .from(expenses)
      .where(eq(expenses.userId, ctx.userId))
    expect(rows).toHaveLength(1)
    expect(rows[0].category).toBe("Food")
  })
})
