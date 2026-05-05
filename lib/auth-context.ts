"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, families, familyMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type AuthContext = {
  userId: string;
  familyId: string;
  isMaster: boolean;
};

// Single auth entry point. Every server action that needs to load or write
// scoped data should call this. The contract:
//   - userId is the Clerk-issued ID for the caller (used as createdBy on new rows).
//   - familyId is the household this user belongs to (used to filter all reads).
//   - isMaster is true iff this user is the family's master (gates invite/remove).
//
// Throws if not signed in. If the user has no `users` row yet (webhook hasn't
// fired), or no familyId yet (mid-rollout), this resolves both lazily and
// idempotently:
//   - Missing user row → create it (mirrors checkOnboardingStatus's fallback).
//   - Missing familyId → either attach to an existing family via Clerk public
//     metadata `foracleFamilyMemberId` (invite acceptance racing the webhook),
//     or create a fresh family-of-1 with this user as master.
export async function getCurrentUserAndFamily(): Promise<AuthContext> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  let userRow = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, familyId: true },
  });

  if (!userRow) {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      throw new Error("Unauthorized");
    }
    await db
      .insert(users)
      .values({
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        onboardingCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
    userRow = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, familyId: true },
    });
  }

  if (!userRow) {
    throw new Error("Failed to materialize user row");
  }

  let familyId = userRow.familyId;

  if (!familyId) {
    // Resolve missing familyId. Two paths:
    //   1. Clerk public metadata carries a foracleFamilyMemberId from invite acceptance.
    //   2. No invite metadata → user is a fresh self-signup; create their family-of-1.
    const clerkUser = await currentUser();
    const invitedRowId =
      typeof clerkUser?.publicMetadata?.foracleFamilyMemberId === "string"
        ? (clerkUser.publicMetadata.foracleFamilyMemberId as string)
        : null;

    if (invitedRowId) {
      const invitedRow = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.id, invitedRowId),
      });
      const primaryEmail = clerkUser?.emailAddresses[0]?.emailAddress?.toLowerCase();
      if (
        invitedRow &&
        invitedRow.status === "pending" &&
        invitedRow.familyId &&
        invitedRow.invitedEmail &&
        invitedRow.invitedEmail.toLowerCase() === primaryEmail
      ) {
        familyId = invitedRow.familyId;
        await db
          .update(familyMembers)
          .set({ clerkUserId: userId, status: "active", updatedAt: new Date() })
          .where(eq(familyMembers.id, invitedRow.id));
      }
    }

    if (!familyId) {
      familyId = `fam_${userId}`;
      await db
        .insert(families)
        .values({
          id: familyId,
          masterUserId: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();
    }

    await db
      .update(users)
      .set({ familyId, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  const family = await db.query.families.findFirst({
    where: eq(families.id, familyId),
    columns: { masterUserId: true },
  });

  return {
    userId,
    familyId,
    isMaster: family?.masterUserId === userId,
  };
}

// Backwards-compatible shim — existing actions that only need userId can keep
// using this. New code should prefer getCurrentUserAndFamily().
export async function getCurrentUserId(): Promise<string> {
  const { userId } = await getCurrentUserAndFamily();
  return userId;
}

// Convenience for read paths that have already migrated to family-scoped queries.
export async function getCurrentFamilyId(): Promise<string> {
  const { familyId } = await getCurrentUserAndFamily();
  return familyId;
}

// Membership check used by invite/remove server actions.
export async function assertCallerIsMaster(): Promise<AuthContext> {
  const ctx = await getCurrentUserAndFamily();
  if (!ctx.isMaster) {
    throw new Error("Only the family master can perform this action");
  }
  return ctx;
}

// Returns true iff the candidate Clerk userId is the master of the same family
// as the caller. Used to gate UI affordances on the client.
export async function callerIsMasterOf(candidateFamilyId: string): Promise<boolean> {
  const ctx = await getCurrentUserAndFamily();
  return ctx.isMaster && ctx.familyId === candidateFamilyId;
}

// Used by the invite flow to look up an existing Clerk-linked family_member by email
// (idempotency + multi-family rejection).
export async function findFamilyMembershipForEmail(email: string) {
  return db.query.familyMembers.findFirst({
    where: and(
      eq(familyMembers.invitedEmail, email),
      // status filter is enforced at call sites
    ),
  });
}
