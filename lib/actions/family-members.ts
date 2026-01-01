"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { familyMembers, users, incomes } from "@/db/schema";
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
 * Ensure user exists in database (creates if missing)
 * This handles cases where Clerk webhook didn't fire
 * Handles email conflicts from old Clerk accounts by deleting and recreating
 */
async function ensureUserExists(userId: string) {
  // First check if user exists by ID
  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (existingUser) {
    return; // User already exists, nothing to do
  }

  // Get user info from Clerk
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("Unable to get user information");
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress || "";

  // Check if email exists with a different user ID (old Clerk account)
  const existingByEmail = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingByEmail && existingByEmail.id !== userId) {
    // Email exists with old user ID - delete old account (cascade deletes related data)
    // This happens when user re-registers with same email but new Clerk account
    await db.delete(users).where(eq(users.id, existingByEmail.id));
  }

  // Create new user record
  await db.insert(users).values({
    id: userId,
    email,
    firstName: clerkUser.firstName || null,
    lastName: clerkUser.lastName || null,
    imageUrl: clerkUser.imageUrl || null,
  });
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
    ...(data.dateOfBirth ? { dateOfBirth: data.dateOfBirth } : {}),
    isContributing: data.isContributing || false,
    ...(data.notes ? { notes: data.notes } : {}),
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
 * Delete a family member and all linked incomes (including CPF data)
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

  // Explicitly delete all incomes linked to this family member (includes CPF data stored in income records)
  await db.delete(incomes).where(eq(incomes.familyMemberId, id));

  // Delete the family member
  await db.delete(familyMembers).where(and(eq(familyMembers.id, id), eq(familyMembers.userId, userId)));

  revalidatePath("/dashboard/user");
  return {
    success: true,
    deletedIncomes: existing.incomes || [],
  };
}

/**
 * Get or create the "Self" family member for onboarding
 * Returns existing Self member if found, otherwise creates one
 */
export async function getOrCreateSelfMember(data: {
  name: string;
  dateOfBirth: string;
}) {
  const userId = await getCurrentUserId();

  // Ensure user exists in database (handles webhook miss)
  await ensureUserExists(userId);

  // Check if a "Self" member already exists
  const existingSelf = await db.query.familyMembers.findFirst({
    where: and(
      eq(familyMembers.userId, userId),
      eq(familyMembers.relationship, "Self")
    ),
  });

  if (existingSelf) {
    // Update existing Self member
    const updated = await db
      .update(familyMembers)
      .set({
        name: data.name,
        dateOfBirth: data.dateOfBirth,
        isContributing: true,
        updatedAt: new Date(),
      })
      .where(eq(familyMembers.id, existingSelf.id))
      .returning();

    revalidatePath("/dashboard/user");
    return updated[0];
  }

  // Create new Self member
  const newMember = await db.insert(familyMembers).values({
    id: nanoid(),
    userId,
    name: data.name,
    relationship: "Self",
    dateOfBirth: data.dateOfBirth,
    isContributing: true,
  }).returning();

  revalidatePath("/dashboard/user");
  return newMember[0];
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
      isContributing: false,
      notes: "Primary account holder",
    }).returning();

    members = selfEntry;
  }

  return members;
}
