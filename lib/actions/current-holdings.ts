"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { currentHoldings, familyMembers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export type CurrentHolding = {
  id: string;
  userId: string;
  familyMemberId: string | null;
  bankName: string;
  holdingAmount: string;
  createdAt: Date;
  updatedAt: Date;
  familyMemberName?: string | null;
};

/**
 * Get all current holdings for the authenticated user
 */
export async function getCurrentHoldings(): Promise<CurrentHolding[]> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const holdings = await db
      .select({
        id: currentHoldings.id,
        userId: currentHoldings.userId,
        familyMemberId: currentHoldings.familyMemberId,
        bankName: currentHoldings.bankName,
        holdingAmount: currentHoldings.holdingAmount,
        createdAt: currentHoldings.createdAt,
        updatedAt: currentHoldings.updatedAt,
        familyMemberName: familyMembers.name,
      })
      .from(currentHoldings)
      .leftJoin(familyMembers, eq(currentHoldings.familyMemberId, familyMembers.id))
      .where(eq(currentHoldings.userId, userId))
      .orderBy(desc(currentHoldings.createdAt));

    return holdings;
  } catch (error) {
    console.error("Error fetching current holdings:", error);
    return [];
  }
}

/**
 * Add a new current holding
 */
export async function addCurrentHolding(data: {
  familyMemberId: string | null;
  bankName: string;
  holdingAmount: number;
}): Promise<CurrentHolding> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const id = randomUUID();

  const [newHolding] = await db
    .insert(currentHoldings)
    .values({
      id,
      userId,
      familyMemberId: data.familyMemberId,
      bankName: data.bankName,
      holdingAmount: data.holdingAmount.toString(),
    })
    .returning();

  // Fetch family member name if linked
  let familyMemberName: string | null = null;
  if (data.familyMemberId) {
    const familyMember = await db.query.familyMembers.findFirst({
      where: eq(familyMembers.id, data.familyMemberId),
    });
    familyMemberName = familyMember?.name || null;
  }

  return {
    ...newHolding,
    holdingAmount: newHolding.holdingAmount || "0",
    familyMemberName,
  };
}

/**
 * Update an existing current holding
 */
export async function updateCurrentHolding(
  id: string,
  data: {
    familyMemberId?: string | null;
    bankName?: string;
    holdingAmount?: number;
  }
): Promise<CurrentHolding> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await db.query.currentHoldings.findFirst({
    where: and(eq(currentHoldings.id, id), eq(currentHoldings.userId, userId)),
  });

  if (!existing) {
    throw new Error("Current holding not found");
  }

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (data.familyMemberId !== undefined) {
    updateData.familyMemberId = data.familyMemberId;
  }
  if (data.bankName !== undefined) {
    updateData.bankName = data.bankName;
  }
  if (data.holdingAmount !== undefined) {
    updateData.holdingAmount = data.holdingAmount.toString();
  }

  const [updatedHolding] = await db
    .update(currentHoldings)
    .set(updateData)
    .where(and(eq(currentHoldings.id, id), eq(currentHoldings.userId, userId)))
    .returning();

  // Fetch family member name if linked
  let familyMemberName: string | null = null;
  if (updatedHolding.familyMemberId) {
    const familyMember = await db.query.familyMembers.findFirst({
      where: eq(familyMembers.id, updatedHolding.familyMemberId),
    });
    familyMemberName = familyMember?.name || null;
  }

  return {
    ...updatedHolding,
    holdingAmount: updatedHolding.holdingAmount || "0",
    familyMemberName,
  };
}

/**
 * Delete a current holding
 */
export async function deleteCurrentHolding(id: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  await db
    .delete(currentHoldings)
    .where(and(eq(currentHoldings.id, id), eq(currentHoldings.userId, userId)));
}
