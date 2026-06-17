import { db } from "@/db"
import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import {
  createInvestment,
  getInvestmentsSummary,
  listInvestments
} from "@/lib/services/investments"
import {
  createPropertyAsset,
  deletePropertyAsset,
  getPropertyAssetById,
  listPropertyAssets,
  PropertyAssetNotFoundError,
  updatePropertyAsset
} from "@/lib/services/property-assets"
import {
  createVehicleAsset,
  deleteVehicleAsset,
  listVehicleAssets,
  VehicleAssetNotFoundError
} from "@/lib/services/vehicle-assets"
import { expenses, propertyAssets, vehicleAssets } from "@/db/schema"

import { seedUser, truncateAll } from "../../../db-helpers"

const PROP_UUID = "11111111-1111-4111-8111-111111111111"
const VEH_UUID = "22222222-2222-4222-8222-222222222222"

const propertyBase = {
  propertyName: "Condo",
  purchaseDate: "2026-01-01",
  originalPurchasePrice: "500000.00",
  outstandingLoan: "350000.00",
  monthlyLoanPayment: "2000.00",
  interestRate: "3.50"
}

const vehicleBase = {
  vehicleName: "Tesla",
  purchaseDate: "2026-01-01",
  originalPurchasePrice: "80000.00"
}

beforeEach(async () => {
  await truncateAll()
})

describe("property assets (real DB)", () => {
  it("scopes by userId", async () => {
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
    await createPropertyAsset(ctxA, propertyBase)
    await createPropertyAsset(ctxB, propertyBase)
    expect(await listPropertyAssets(ctxA)).toHaveLength(1)
    expect(await listPropertyAssets(ctxB)).toHaveLength(1)
  })

  it("creates linked Housing expense when addToExpenditures=true", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const result = await createPropertyAsset(ctx, {
      ...propertyBase,
      addToExpenditures: true
    })
    expect(result.row.linkedExpenseId).not.toBeNull()

    const exp = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, result.row.linkedExpenseId!))
    expect(exp[0].category).toBe("Housing")
    expect(exp[0].amount).toBe("2000.00")
  })

  it("toggling addToExpenditures off deletes the linked expense", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const created = await createPropertyAsset(ctx, {
      ...propertyBase,
      addToExpenditures: true
    })
    const expenseId = created.row.linkedExpenseId!

    const updated = await updatePropertyAsset(ctx, created.row.id, {
      addToExpenditures: false
    })
    expect(updated.linkedExpenseId).toBeNull()

    const exp = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, expenseId))
    expect(exp).toHaveLength(0)
  })

  it("delete cascades the linked expense", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const created = await createPropertyAsset(ctx, {
      ...propertyBase,
      id: PROP_UUID,
      addToExpenditures: true
    })
    const expenseId = created.row.linkedExpenseId!
    await deletePropertyAsset(ctx, PROP_UUID)
    expect(
      await db.select().from(expenses).where(eq(expenses.id, expenseId))
    ).toHaveLength(0)
    expect(
      await db
        .select()
        .from(propertyAssets)
        .where(eq(propertyAssets.id, PROP_UUID))
    ).toHaveLength(0)
  })

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
    const created = await createPropertyAsset(ctxA, propertyBase)
    await expect(
      updatePropertyAsset(ctxB, created.row.id, { propertyName: "Stolen" })
    ).rejects.toBeInstanceOf(PropertyAssetNotFoundError)
    const intact = await getPropertyAssetById(ctxA, created.row.id)
    expect(intact?.propertyName).toBe("Condo")
  })
})

describe("vehicle assets (real DB)", () => {
  it("scopes by userId", async () => {
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
    await createVehicleAsset(ctxA, vehicleBase)
    await createVehicleAsset(ctxB, vehicleBase)
    expect(await listVehicleAssets(ctxA)).toHaveLength(1)
    expect(await listVehicleAssets(ctxB)).toHaveLength(1)
  })

  it("create with addToExpenditures + monthlyLoanPayment creates linked Vehicle expense", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const created = await createVehicleAsset(ctx, {
      ...vehicleBase,
      monthlyLoanPayment: "800.00",
      addToExpenditures: true
    })
    expect(created.row.linkedExpenseId).not.toBeNull()
    const exp = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, created.row.linkedExpenseId!))
    expect(exp[0].category).toBe("Vehicle")
    expect(exp[0].amount).toBe("800.00")
  })

  it("delete cascades linked expense", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const created = await createVehicleAsset(ctx, {
      ...vehicleBase,
      id: VEH_UUID,
      monthlyLoanPayment: "800.00",
      addToExpenditures: true
    })
    const expenseId = created.row.linkedExpenseId!
    await deleteVehicleAsset(ctx, VEH_UUID)
    expect(
      await db.select().from(expenses).where(eq(expenses.id, expenseId))
    ).toHaveLength(0)
    expect(
      await db
        .select()
        .from(vehicleAssets)
        .where(eq(vehicleAssets.id, VEH_UUID))
    ).toHaveLength(0)
  })

  it("update refuses cross-user", async () => {
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
    const created = await createVehicleAsset(ctxA, vehicleBase)
    await expect(
      deleteVehicleAsset(ctxB, created.row.id)
    ).rejects.toBeInstanceOf(VehicleAssetNotFoundError)
  })
})

describe("investments (real DB)", () => {
  it("scopes by userId", async () => {
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
    await createInvestment(ctxA, {
      name: "VTI",
      type: "etf",
      currentCapital: "10000.00",
      projectedYield: "8.00",
      contributionAmount: "500.00",
      contributionFrequency: "monthly"
    })
    await createInvestment(ctxB, {
      name: "BND",
      type: "bonds",
      currentCapital: "5000.00",
      projectedYield: "3.00",
      contributionAmount: "200.00",
      contributionFrequency: "monthly"
    })
    expect((await listInvestments(ctxA))[0].name).toBe("VTI")
    expect((await listInvestments(ctxB))[0].name).toBe("BND")
  })

  it("summary returns zero-state when no active investments", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    expect(await getInvestmentsSummary(ctx)).toEqual({
      totalPortfolioValue: 0,
      averageYield: 0,
      totalMonthlyContribution: 0,
      activeCount: 0
    })
  })

  it("summary computes weighted-average yield correctly", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    // Capital 10000 @ 10%, capital 30000 @ 5%
    // Weighted = (10000*10 + 30000*5) / 40000 = (100000 + 150000)/40000 = 6.25
    await createInvestment(ctx, {
      name: "A",
      type: "etf",
      currentCapital: "10000.00",
      projectedYield: "10.00",
      contributionAmount: "100.00",
      contributionFrequency: "monthly"
    })
    await createInvestment(ctx, {
      name: "B",
      type: "etf",
      currentCapital: "30000.00",
      projectedYield: "5.00",
      contributionAmount: "200.00",
      contributionFrequency: "monthly"
    })

    const summary = await getInvestmentsSummary(ctx)
    expect(summary.totalPortfolioValue).toBe(40000)
    expect(summary.averageYield).toBe(6.25)
    expect(summary.totalMonthlyContribution).toBe(300)
    expect(summary.activeCount).toBe(2)
  })

  it("summary handles custom-frequency contributions as monthly-equivalent", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    // 1200 contribution × 4 months / 12 = 400 monthly equivalent
    await createInvestment(ctx, {
      name: "Q",
      type: "etf",
      currentCapital: "1000.00",
      projectedYield: "5.00",
      contributionAmount: "1200.00",
      contributionFrequency: "custom",
      customMonths: "[3,6,9,12]"
    })
    const summary = await getInvestmentsSummary(ctx)
    expect(summary.totalMonthlyContribution).toBe(400)
  })
})
