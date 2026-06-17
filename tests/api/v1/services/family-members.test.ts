import { randomUUID } from "crypto"
import { db } from "@/db"
import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import {
  createFamilyMember,
  deleteFamilyMember,
  FamilyMemberNotFoundError,
  getFamilyMemberById,
  getOrCreateSelfMember,
  listFamilyMembers,
  listFamilyMembersOrSelf,
  updateFamilyMember
} from "@/lib/services/family"
import { familyMembers, incomesBeta } from "@/db/schema"

import { seedUser, truncateAll } from "../../../db-helpers"

beforeEach(async () => {
  await truncateAll()
})

describe("family members (real DB)", () => {
  it("scopes by userId — never returns another user's members", async () => {
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
    await createFamilyMember(ctxA, { name: "Alice", relationship: "Spouse" })
    await createFamilyMember(ctxB, { name: "Bob", relationship: "Sibling" })

    const aRows = await listFamilyMembers(ctxA)
    expect(aRows).toHaveLength(1)
    expect(aRows[0].name).toBe("Alice")

    const bRows = await listFamilyMembers(ctxB)
    expect(bRows).toHaveLength(1)
    expect(bRows[0].name).toBe("Bob")
  })

  it("update refuses to touch another user's member", async () => {
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
    const created = await createFamilyMember(ctxA, {
      name: "Alice",
      relationship: "Spouse"
    })

    await expect(
      updateFamilyMember(ctxB, created.id, { name: "Stolen" })
    ).rejects.toBeInstanceOf(FamilyMemberNotFoundError)

    const intact = await getFamilyMemberById(ctxA, created.id)
    expect(intact?.name).toBe("Alice")
  })

  it("listFamilyMembersOrSelf auto-creates a Self when empty", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    expect(await listFamilyMembers(ctx)).toHaveLength(0)

    const result = await listFamilyMembersOrSelf(ctx)
    expect(result).toHaveLength(1)
    expect(result[0].relationship).toBe("Self")
  })

  it("listFamilyMembersOrSelf ensures the caller's own Self even when other members exist", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    await createFamilyMember(ctx, { name: "Alice", relationship: "Spouse" })
    const result = await listFamilyMembersOrSelf(ctx)
    // The function guarantees the caller has a Self row for the household, so a
    // Self is added alongside the existing Spouse (see family.ts:listFamilyMembersOrSelf).
    expect(result).toHaveLength(2)
    expect(result.some((m) => m.relationship === "Self")).toBe(true)
    expect(
      result.some((m) => m.relationship === "Spouse" && m.name === "Alice")
    ).toBe(true)
  })

  it("getOrCreateSelfMember idempotent: updates existing Self on second call", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const first = await getOrCreateSelfMember(ctx, {
      name: "Evan",
      dateOfBirth: "1990-01-01"
    })
    const second = await getOrCreateSelfMember(ctx, {
      name: "Evan Lee",
      dateOfBirth: "1990-01-01"
    })
    expect(second.id).toBe(first.id)
    expect(second.name).toBe("Evan Lee")

    const all = await listFamilyMembers(ctx)
    expect(all).toHaveLength(1)
  })

  it("deleteFamilyMember cascades incomes and returns the deleted summaries", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true
    })
    const member = await createFamilyMember(ctx, {
      name: "Alice",
      relationship: "Spouse"
    })
    // Seed two incomes_beta rows linked to this member.
    await db.insert(incomesBeta).values([
      {
        id: randomUUID(),
        userId: ctx.userId,
        familyId: ctx.familyId,
        familyMemberId: member.id,
        name: "Salary",
        category: "Employment",
        amount: "5000.00",
        startDate: "2026-01-01"
      },
      {
        id: randomUUID(),
        userId: ctx.userId,
        familyId: ctx.familyId,
        familyMemberId: member.id,
        name: "Bonus",
        category: "Employment",
        amount: "1000.00",
        startDate: "2026-01-01"
      }
    ])

    const result = await deleteFamilyMember(ctx, member.id)
    expect(result.deletedIncomes).toHaveLength(2)

    const remainingMember = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.id, member.id))
    expect(remainingMember).toHaveLength(0)

    const remainingIncomes = await db
      .select()
      .from(incomesBeta)
      .where(eq(incomesBeta.familyMemberId, member.id))
    expect(remainingIncomes).toHaveLength(0)
  })

  it("deleteFamilyMember throws NotFound for another user's member", async () => {
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
    const created = await createFamilyMember(ctxA, {
      name: "Alice",
      relationship: "Spouse"
    })
    await expect(deleteFamilyMember(ctxB, created.id)).rejects.toBeInstanceOf(
      FamilyMemberNotFoundError
    )
  })
})
