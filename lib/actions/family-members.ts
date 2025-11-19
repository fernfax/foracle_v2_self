"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { familyMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

/**
 * Get the current authenticated user's ID
 */
async function getCurrentUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

/**
 * Create a new family member
 */
export async function createFamilyMember(data: {
  name: string;
  relationship: string;
  dateOfBirth?: string;
  isContributing?: boolean;
  notes?: string;
}) {
  const userId = await getCurrentUserId();

  const newMember = await db.insert(familyMembers).values({
    id: nanoid(),
    userId,
    name: data.name,
    relationship: data.relationship,
    dateOfBirth: data.dateOfBirth || null,
    isContributing: data.isContributing || false,
    notes: data.notes || null,
  }).returning();

  revalidatePath("/dashboard/user");
  return newMember[0];
}

/**
 * Update an existing family member
 */
export async function updateFamilyMember(
  id: string,
  data: {
    name?: string;
    relationship?: string;
    dateOfBirth?: string | null;
    isContributing?: boolean;
    notes?: string | null;
  }
) {
  const userId = await getCurrentUserId();

  // Verify ownership
  const existing = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.id, id), eq(familyMembers.userId, userId)),
  });

  if (!existing) {
    throw new Error("Family member not found or access denied");
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.relationship !== undefined) updateData.relationship = data.relationship;
  if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth;
  if (data.isContributing !== undefined) updateData.isContributing = data.isContributing;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const updated = await db
    .update(familyMembers)
    .set(updateData)
    .where(and(eq(familyMembers.id, id), eq(familyMembers.userId, userId)))
    .returning();

  revalidatePath("/dashboard/user");
  return updated[0];
}

/**
 * Get linked incomes for a family member (for confirmation dialogs)
 */
export async function getFamilyMemberIncomes(id: string) {
  const userId = await getCurrentUserId();

  const member = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.id, id), eq(familyMembers.userId, userId)),
    with: {
      incomes: {
        columns: {
          id: true,
          name: true,
          amount: true,
          category: true,
        },
      },
    },
  });

  if (!member) {
    throw new Error("Family member not found or access denied");
  }

  return member.incomes || [];
}

/**
 * Delete a family member and all linked incomes (cascading)
 */
export async function deleteFamilyMember(id: string) {
  const userId = await getCurrentUserId();

  // Verify ownership and get linked incomes before deletion
  const existing = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.id, id), eq(familyMembers.userId, userId)),
    with: {
      incomes: {
        columns: {
          id: true,
          name: true,
          amount: true,
          category: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error("Family member not found or access denied");
  }

  // Delete family member (incomes will be cascaded automatically by database)
  await db.delete(familyMembers).where(and(eq(familyMembers.id, id), eq(familyMembers.userId, userId)));

  revalidatePath("/dashboard/user");
  return {
    success: true,
    deletedIncomes: existing.incomes || [],
  };
}

/**
 * Get all family members for the current user
 * Automatically creates a "Self" entry if no family members exist
 */
export async function getFamilyMembers() {
  const userId = await getCurrentUserId();

  let members = await db.query.familyMembers.findMany({
    where: eq(familyMembers.userId, userId),
    orderBy: (familyMembers, { desc }) => [desc(familyMembers.createdAt)],
  });

  // If no family members exist, create a "Self" entry for the user
  if (members.length === 0) {
    // Get user's name from the users table
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    const userName = user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User"
      : "User";

    // Create the self entry
    const selfEntry = await db.insert(familyMembers).values({
      id: nanoid(),
      userId,
      name: userName,
      relationship: "Self",
      dateOfBirth: null,
      notes: "Primary account holder",
    }).returning();

    members = selfEntry;
  }

  return members;
}
