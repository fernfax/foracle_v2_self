"use server"

import { randomUUID } from "crypto"
import { db } from "@/db"
import { and, desc, eq } from "drizzle-orm"

import { getCurrentUserAndFamily } from "@/lib/auth-context"
import {
  currentHoldings,
  familyMembers,
  holdingAmountHistory
} from "@/db/schema"
import type { CurrentHolding as CurrentHoldingRow } from "@/db/types"

// Holdings are read back as a join projection: the schema-derived row minus
// familyId (not selected) plus the joined account-holder name. Base columns stay
// tied to the current_holdings table; familyMemberName is the join-only field.
export type CurrentHolding = Omit<CurrentHoldingRow, "familyId"> & {
  familyMemberName?: string | null
}

/**
 * Get all current holdings for the authenticated user
 */
export async function getCurrentHoldings(): Promise<CurrentHolding[]> {
  try {
    const { familyId } = await getCurrentUserAndFamily()

    const holdings = await db
      .select({
        id: currentHoldings.id,
        userId: currentHoldings.userId,
        familyMemberId: currentHoldings.familyMemberId,
        bankName: currentHoldings.bankName,
        holdingAmount: currentHoldings.holdingAmount,
        createdAt: currentHoldings.createdAt,
        updatedAt: currentHoldings.updatedAt,
        familyMemberName: familyMembers.name
      })
      .from(currentHoldings)
      .leftJoin(
        familyMembers,
        eq(currentHoldings.familyMemberId, familyMembers.id)
      )
      .where(eq(currentHoldings.familyId, familyId))
      .orderBy(desc(currentHoldings.createdAt))

    return holdings
  } catch (error) {
    console.error("Error fetching current holdings:", error)
    return []
  }
}

/**
 * Add a new current holding
 */
export async function addCurrentHolding(data: {
  familyMemberId: string | null
  bankName: string
  holdingAmount: number
}): Promise<CurrentHolding> {
  const { userId, familyId } = await getCurrentUserAndFamily()

  const id = randomUUID()

  const [newHolding] = await db
    .insert(currentHoldings)
    .values({
      id,
      userId,
      familyId,
      familyMemberId: data.familyMemberId,
      bankName: data.bankName,
      holdingAmount: data.holdingAmount.toString()
    })
    .returning()

  // Record initial amount in history
  await db.insert(holdingAmountHistory).values({
    id: randomUUID(),
    holdingId: id,
    userId,
    familyId,
    amount: data.holdingAmount.toString()
  })

  // Fetch family member name if linked (scoped to family)
  let familyMemberName: string | null = null
  if (data.familyMemberId) {
    const familyMember = await db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.id, data.familyMemberId),
        eq(familyMembers.familyId, familyId)
      )
    })
    familyMemberName = familyMember?.name || null
  }

  return {
    ...newHolding,
    holdingAmount: newHolding.holdingAmount || "0",
    familyMemberName
  }
}

/**
 * Update an existing current holding
 */
export async function updateCurrentHolding(
  id: string,
  data: {
    familyMemberId?: string | null
    bankName?: string
    holdingAmount?: number
  }
): Promise<CurrentHolding> {
  const { userId, familyId } = await getCurrentUserAndFamily()

  // Verify the holding belongs to caller's family
  const existing = await db.query.currentHoldings.findFirst({
    where: and(
      eq(currentHoldings.id, id),
      eq(currentHoldings.familyId, familyId)
    )
  })

  if (!existing) {
    throw new Error("Current holding not found")
  }

  const updateData: {
    updatedAt: Date
    familyMemberId?: string | null
    bankName?: string
    holdingAmount?: string
  } = {
    updatedAt: new Date()
  }

  if (data.familyMemberId !== undefined) {
    updateData.familyMemberId = data.familyMemberId
  }
  if (data.bankName !== undefined) {
    updateData.bankName = data.bankName
  }
  if (data.holdingAmount !== undefined) {
    updateData.holdingAmount = data.holdingAmount.toString()
  }

  const [updatedHolding] = await db
    .update(currentHoldings)
    .set(updateData)
    .where(
      and(eq(currentHoldings.id, id), eq(currentHoldings.familyId, familyId))
    )
    .returning()

  // Record amount snapshot in history if amount changed
  if (data.holdingAmount !== undefined) {
    await db.insert(holdingAmountHistory).values({
      id: randomUUID(),
      holdingId: id,
      userId,
      familyId,
      amount: data.holdingAmount.toString()
    })
  }

  // Fetch family member name if linked (scoped to family)
  let familyMemberName: string | null = null
  if (updatedHolding.familyMemberId) {
    const familyMember = await db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.id, updatedHolding.familyMemberId),
        eq(familyMembers.familyId, familyId)
      )
    })
    familyMemberName = familyMember?.name || null
  }

  return {
    ...updatedHolding,
    holdingAmount: updatedHolding.holdingAmount || "0",
    familyMemberName
  }
}

/**
 * Delete a current holding
 */
export async function deleteCurrentHolding(id: string): Promise<void> {
  const { familyId } = await getCurrentUserAndFamily()

  await db
    .delete(currentHoldings)
    .where(
      and(eq(currentHoldings.id, id), eq(currentHoldings.familyId, familyId))
    )
}
