import { db } from "@/db"
import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import {
  createIncome,
  deleteIncome,
  getIncomeById,
  IncomeNotFoundError,
  listIncomes,
  toggleIncomeActive,
  updateIncome
} from "@/lib/services/incomes"
import { incomes } from "@/db/schema"

import { seedFamilyMember, seedUser, truncateAll } from "../../../db-helpers"

const baseInput = {
  name: "Salary",
  category: "Employment",
  amount: "5000.00",
  startDate: "2026-01-01",
  subjectToCpf: false
}

beforeEach(async () => {
  await truncateAll()
})

describe("listIncomes (real DB, family-scoped)", () => {
  it("returns all rows for the caller's family", async () => {
    const ctxA1 = await seedUser({
      userId: "user-a1",
      familyId: "fam-a",
      isMaster: true
    })
    const ctxA2 = await seedUser({
      userId: "user-a2",
      familyId: "fam-a"
    })
    const ctxB = await seedUser({
      userId: "user-b",
      familyId: "fam-b",
      isMaster: true
    })

    await createIncome(ctxA1, baseInput)
    await createIncome(ctxA2, { ...baseInput, name: "Spouse Salary" })
    await createIncome(ctxB, { ...baseInput, name: "Other Family" })

    // Family A: BOTH members' incomes visible
    const aRows = await listIncomes(ctxA1)
    expect(aRows).toHaveLength(2)
    expect(aRows.every((r) => r.familyId === "fam-a")).toBe(true)
    expect(aRows.map((r) => r.userId).sort()).toEqual(["user-a1", "user-a2"])

    // Family B: only its own row
    const bRows = await listIncomes(ctxB)
    expect(bRows).toHaveLength(1)
    expect(bRows[0].userId).toBe("user-b")
  })
})

describe("createIncome CPF behavior (real DB)", () => {
  it("auto-fills CPF when linked to a family member with a DOB", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const memberId = await seedFamilyMember({
      userId: "user-a",
      familyId: "fam-a",
      dateOfBirth: "1994-01-01" // ~32, ≤55 band
    })
    const row = await createIncome(ctx, {
      ...baseInput,
      subjectToCpf: true,
      familyMemberId: memberId
    })
    expect(row.subjectToCpf).toBe(true)
    expect(row.employeeCpfContribution).not.toBeNull()
    expect(row.employerCpfContribution).not.toBeNull()
    expect(row.netTakeHome).not.toBeNull()
    expect(Number(row.netTakeHome)).toBeLessThan(Number(row.amount))
    expect(row.cpfRatesVersion).toBe("2026")
  })

  it("leaves CPF OFF when subjectToCpf is true but no member is linked", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    // member+DOB policy: no linked member → CPF disabled (amount = take-home).
    const row = await createIncome(ctx, { ...baseInput, subjectToCpf: true })
    expect(row.employeeCpfContribution).toBeNull()
    expect(row.netTakeHome).toBeNull()
    expect(row.cpfRatesVersion).toBeNull()
  })

  it("leaves CPF OFF when the linked member has no DOB (pending invitee)", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const memberId = await seedFamilyMember({
      userId: "user-a",
      familyId: "fam-a",
      dateOfBirth: null // pending — no DOB yet
    })
    const row = await createIncome(ctx, {
      ...baseInput,
      subjectToCpf: true,
      familyMemberId: memberId
    })
    expect(row.employeeCpfContribution).toBeNull()
    expect(row.netTakeHome).toBeNull()
  })

  it("ignores a client-supplied familyMemberAge — age comes from DOB only", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const memberId = await seedFamilyMember({
      userId: "user-a",
      familyId: "fam-a",
      dateOfBirth: "1960-01-01" // ~66 → above 65 band, EE 7.5%
    })
    // A tampered "age 30" must NOT shrink CPF to the ≤55 rate.
    const row = await createIncome(ctx, {
      ...baseInput,
      amount: "5000.00",
      subjectToCpf: true,
      familyMemberId: memberId,
      familyMemberAge: 30 // tampered client age — must be IGNORED (PR 6 drops the field)
    })
    // age ~66 → EE 7.5% of 5000 = 375 (statutory), NOT 20% = 1000.
    expect(Number(row.employeeCpfContribution)).toBe(375)
  })

  it("refuses to compute CPF from a foreign family's member", async () => {
    const ctxA = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    await seedUser({ userId: "user-b", familyId: "fam-b", isMaster: true })
    const foreignMember = await seedFamilyMember({
      userId: "user-b",
      familyId: "fam-b",
      dateOfBirth: "1990-01-01"
    })
    // Family A income pointing at family B's member → member lookup is
    // family-scoped, so CPF stays OFF (no cross-family DOB leak into the calc).
    const row = await createIncome(ctxA, {
      ...baseInput,
      subjectToCpf: true,
      familyMemberId: foreignMember
    })
    expect(row.employeeCpfContribution).toBeNull()
  })

  it("leaves CPF fields null when subjectToCpf is false", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const row = await createIncome(ctx, baseInput)
    expect(row.subjectToCpf).toBe(false)
    expect(row.employeeCpfContribution).toBeNull()
    expect(row.employerCpfContribution).toBeNull()
    expect(row.netTakeHome).toBeNull()
  })
})

describe("updateIncome (real DB)", () => {
  it("recomputes CPF when subjectToCpf toggles on (member has DOB)", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const memberId = await seedFamilyMember({
      userId: "user-a",
      familyId: "fam-a",
      dateOfBirth: "1994-01-01"
    })
    const created = await createIncome(ctx, {
      ...baseInput,
      familyMemberId: memberId
    })
    expect(created.employeeCpfContribution).toBeNull()

    const updated = await updateIncome(ctx, created.id, { subjectToCpf: true })
    expect(updated.employeeCpfContribution).not.toBeNull()
    expect(updated.netTakeHome).not.toBeNull()
  })

  it("recomputes CPF when amount changes (subjectToCpf stays true)", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const memberId = await seedFamilyMember({
      userId: "user-a",
      familyId: "fam-a",
      dateOfBirth: "1994-01-01"
    })
    const created = await createIncome(ctx, {
      ...baseInput,
      subjectToCpf: true,
      familyMemberId: memberId
    })
    const firstCpf = Number(created.employeeCpfContribution)

    const updated = await updateIncome(ctx, created.id, { amount: "10000.00" })
    const newCpf = Number(updated.employeeCpfContribution)
    expect(newCpf).toBeGreaterThan(firstCpf)
  })

  it("refuses to touch another family's row", async () => {
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
    const created = await createIncome(ctxA, baseInput)

    await expect(
      updateIncome(ctxB, created.id, { amount: "1" })
    ).rejects.toBeInstanceOf(IncomeNotFoundError)

    const intact = await getIncomeById(ctxA, created.id)
    expect(intact?.amount).toBe("5000.00")
  })
})

describe("toggleIncomeActive (real DB)", () => {
  it("flips isActive on each invocation", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const created = await createIncome(ctx, baseInput)
    expect(created.isActive).toBe(true)

    const off = await toggleIncomeActive(ctx, created.id)
    expect(off.isActive).toBe(false)

    const on = await toggleIncomeActive(ctx, created.id)
    expect(on.isActive).toBe(true)
  })

  it("throws NotFound for another family's row", async () => {
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
    const created = await createIncome(ctxA, baseInput)
    await expect(toggleIncomeActive(ctxB, created.id)).rejects.toBeInstanceOf(
      IncomeNotFoundError
    )
  })
})

describe("deleteIncome (real DB)", () => {
  it("removes the row", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const created = await createIncome(ctx, baseInput)
    await deleteIncome(ctx, created.id)

    const found = await db
      .select()
      .from(incomes)
      .where(eq(incomes.id, created.id))
    expect(found).toHaveLength(0)
  })

  it("throws NotFound for another family's row", async () => {
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
    const created = await createIncome(ctxA, baseInput)
    await expect(deleteIncome(ctxB, created.id)).rejects.toBeInstanceOf(
      IncomeNotFoundError
    )
    expect(await getIncomeById(ctxA, created.id)).not.toBeNull()
  })
})

describe("createIncome input validation (real DB)", () => {
  it("rejects $0 / negative / non-numeric amounts (zod enforced)", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    await expect(
      createIncome(ctx, { ...baseInput, amount: "0" })
    ).rejects.toThrow()
    await expect(
      createIncome(ctx, { ...baseInput, amount: "-100" })
    ).rejects.toThrow()
    await expect(
      createIncome(ctx, { ...baseInput, amount: "abc" })
    ).rejects.toThrow()
    await expect(
      createIncome(ctx, { ...baseInput, amount: "" })
    ).rejects.toThrow()
  })

  it("accepts a positive amount and a $0 CPF-account balance", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const row = await createIncome(ctx, {
      ...baseInput,
      amount: "5000.50",
      cpfOrdinaryAccount: "0"
    })
    expect(Number(row.amount)).toBe(5000.5)
  })

  it("updateIncome rejects a non-positive amount", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const created = await createIncome(ctx, baseInput)
    await expect(
      updateIncome(ctx, created.id, { amount: "0" })
    ).rejects.toThrow()
    await expect(
      updateIncome(ctx, created.id, { amount: "-1" })
    ).rejects.toThrow()
  })
})
