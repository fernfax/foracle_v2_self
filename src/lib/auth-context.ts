"use server"

import { db } from "@/db"
import { auth, currentUser } from "@clerk/nextjs/server"
import { and, eq } from "drizzle-orm"

import { families, familyMembers, users } from "@/db/schema"

export type AuthContext = {
  userId: string
  familyId: string
  isMaster: boolean
}

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
  const { userId } = await auth()
  if (!userId) {
    throw new Error("Unauthorized")
  }

  let userRow = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, familyId: true }
  })

  // True iff this user joined an existing family via invite acceptance. Invitees
  // inherit the family's setup, so they skip the /onboarding wizard even when
  // the Clerk webhook hasn't fired yet (local dev).
  let joinedViaInvite = false
  let familyId = userRow?.familyId ?? null

  // Resolve the family BEFORE materializing the user. `users.family_id` is NOT
  // NULL in production, so a new user row must be inserted WITH a familyId in one
  // shot (the old two-step insert-then-backfill violated the constraint). Two
  // paths, mirroring the Clerk webhook:
  //   1. Invite acceptance — Clerk public metadata carries a foracleFamilyMemberId.
  //   2. Self-signup — create a fresh family-of-1 with this user as master.
  if (!familyId) {
    const clerkUser = await currentUser()
    if (!clerkUser) {
      throw new Error("Unauthorized")
    }

    const invitedRowId =
      typeof clerkUser.publicMetadata?.foracleFamilyMemberId === "string"
        ? (clerkUser.publicMetadata.foracleFamilyMemberId as string)
        : null

    if (invitedRowId) {
      const invitedRow = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.id, invitedRowId)
      })
      const primaryEmail =
        clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase()
      if (
        invitedRow &&
        invitedRow.status === "pending" &&
        invitedRow.familyId &&
        invitedRow.invitedEmail &&
        invitedRow.invitedEmail.toLowerCase() === primaryEmail
      ) {
        familyId = invitedRow.familyId
        joinedViaInvite = true
        await db
          .update(familyMembers)
          .set({
            clerkUserId: userId,
            status: "active",
            emailInvitationAccepted: true,
            updatedAt: new Date()
          })
          .where(eq(familyMembers.id, invitedRow.id))
      }
    }

    if (!familyId) {
      // Self-signup: family-of-1. `families.masterUserId` FK is `set null`, so
      // creating the family before the user row is fine.
      familyId = `fam_${userId}`
      await db
        .insert(families)
        .values({
          id: familyId,
          masterUserId: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoNothing()
    }

    if (!userRow) {
      // Materialize the user row WITH the resolved familyId (webhook fallback
      // for local dev / webhook races).
      await db
        .insert(users)
        .values({
          id: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || "",
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
          onboardingCompleted: joinedViaInvite,
          familyId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoNothing()
    } else {
      // User row exists but has no familyId (mid-rollout backfill). Attach it.
      await db
        .update(users)
        .set({
          familyId,
          // Mark invitees as onboarded — only the family master runs the wizard.
          ...(joinedViaInvite ? { onboardingCompleted: true } : {}),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
    }

    userRow = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, familyId: true }
    })
  }

  if (!userRow || !familyId) {
    throw new Error("Failed to materialize user row")
  }

  const family = await db.query.families.findFirst({
    where: eq(families.id, familyId),
    columns: { masterUserId: true }
  })

  return {
    userId,
    familyId,
    isMaster: family?.masterUserId === userId
  }
}

// Backwards-compatible shim — existing actions that only need userId can keep
// using this. New code should prefer getCurrentUserAndFamily().
export async function getCurrentUserId(): Promise<string> {
  const { userId } = await getCurrentUserAndFamily()
  return userId
}

// Convenience for read paths that have already migrated to family-scoped queries.
export async function getCurrentFamilyId(): Promise<string> {
  const { familyId } = await getCurrentUserAndFamily()
  return familyId
}

// Membership check used by invite/remove server actions.
export async function assertCallerIsMaster(): Promise<AuthContext> {
  const ctx = await getCurrentUserAndFamily()
  if (!ctx.isMaster) {
    throw new Error("Only the family master can perform this action")
  }
  return ctx
}

// Returns true iff the candidate Clerk userId is the master of the same family
// as the caller. Used to gate UI affordances on the client.
export async function callerIsMasterOf(
  candidateFamilyId: string
): Promise<boolean> {
  const ctx = await getCurrentUserAndFamily()
  return ctx.isMaster && ctx.familyId === candidateFamilyId
}

// Used by the invite flow to look up an existing Clerk-linked family_member by email
// (idempotency + multi-family rejection).
export async function findFamilyMembershipForEmail(email: string) {
  return db.query.familyMembers.findFirst({
    where: and(
      eq(familyMembers.invitedEmail, email)
      // status filter is enforced at call sites
    )
  })
}
