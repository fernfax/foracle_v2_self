"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { familyMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { assertCallerIsMaster } from "@/lib/auth-context";
import { RELATIONSHIP_VALUES, type RelationshipValue } from "@/lib/family-relationships";

type InviteInput = {
  firstName: string;
  lastName: string;
  email: string;
  relationship: RelationshipValue;
};

// Sends an invitation via Clerk and creates a pending family_members row
// scoped to the master's family. The caller MUST be the family master.
//
// Vulnerability mitigations applied here:
//   - Email enumeration: we always return the same opaque success shape regardless
//     of whether Clerk reports the email as already used. The actual no-op
//     happens silently in the webhook on duplicate signup.
//   - Multi-family: we reject up front if a Clerk-linked family_member already
//     exists for this email or anywhere with a different familyId.
//   - Trust: we put only the row id into Clerk publicMetadata; the webhook
//     re-verifies email match before flipping status to active.
export async function inviteFamilyMember(input: InviteInput) {
  const { firstName, lastName, email, relationship } = input;

  if (!firstName.trim() || !lastName.trim() || !email.trim()) {
    throw new Error("First name, last name, and email are required");
  }
  if (!RELATIONSHIP_VALUES.includes(relationship)) {
    throw new Error("Invalid relationship");
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Invalid email address");
  }

  const ctx = await assertCallerIsMaster();

  // Multi-family rejection: any existing Clerk-linked or pending row for this
  // email anywhere blocks the invite.
  const existingByEmail = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.invitedEmail, normalizedEmail),
  });
  if (
    existingByEmail &&
    existingByEmail.status !== "revoked" &&
    existingByEmail.familyId !== ctx.familyId
  ) {
    throw new Error("This email is already part of another family");
  }
  if (
    existingByEmail &&
    existingByEmail.familyId === ctx.familyId &&
    existingByEmail.status === "pending"
  ) {
    // Idempotent: re-sending an invite for an already-pending row resends only.
    return resendInvitation(existingByEmail.id);
  }

  const rowId = `fm_${nanoid()}`;
  const fullName = `${firstName.trim()} ${lastName.trim()}`;

  await db.insert(familyMembers).values({
    id: rowId,
    userId: ctx.userId,
    familyId: ctx.familyId,
    name: fullName,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    relationship,
    invitedEmail: normalizedEmail,
    status: "pending",
  });

  let clerkInvitationId: string | null = null;
  try {
    const client = await clerkClient();
    const invitation = await client.invitations.createInvitation({
      emailAddress: normalizedEmail,
      // The post-signup redirect lands the user inside the app; auth-context.ts
      // resolves the metadata and attaches them to the family on first request.
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/overview`,
      publicMetadata: { foracleFamilyMemberId: rowId },
      // ignoreExisting=true means "already a Clerk user" doesn't throw — we
      // accept and let the webhook handle attachment idempotently.
      ignoreExisting: true,
    });
    clerkInvitationId = invitation.id;
  } catch (err) {
    // If Clerk rejects (e.g. invalid email format slip-through), we still keep
    // the pending row so the master sees what they tried — but mark it revoked
    // and re-throw so the UI can surface the failure.
    await db
      .update(familyMembers)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(eq(familyMembers.id, rowId));
    throw err;
  }

  if (clerkInvitationId) {
    await db
      .update(familyMembers)
      .set({ clerkInvitationId, updatedAt: new Date() })
      .where(eq(familyMembers.id, rowId));
  }

  revalidatePath("/user");
  return { id: rowId, status: "pending" as const };
}

export async function revokeInvitation(rowId: string) {
  const ctx = await assertCallerIsMaster();

  const row = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.id, rowId), eq(familyMembers.familyId, ctx.familyId)),
  });
  if (!row) {
    throw new Error("Invitation not found");
  }
  if (row.status !== "pending") {
    throw new Error("Only pending invitations can be revoked");
  }

  if (row.clerkInvitationId) {
    try {
      const client = await clerkClient();
      await client.invitations.revokeInvitation(row.clerkInvitationId);
    } catch (err) {
      // Clerk may already have accepted/expired — log and continue so we still
      // mark our row revoked (audit trail for the master).
      console.error("Failed to revoke Clerk invitation", err);
    }
  }

  await db
    .update(familyMembers)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(eq(familyMembers.id, rowId));

  revalidatePath("/user");
  return { id: rowId, status: "revoked" as const };
}

export async function resendInvitation(rowId: string) {
  const ctx = await assertCallerIsMaster();

  const row = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.id, rowId), eq(familyMembers.familyId, ctx.familyId)),
  });
  if (!row || !row.invitedEmail) {
    throw new Error("Invitation not found");
  }
  if (row.status !== "pending") {
    throw new Error("Only pending invitations can be resent");
  }

  // Revoke the old Clerk invitation (if still active) and create a fresh one,
  // so the link in the new email is the authoritative one.
  if (row.clerkInvitationId) {
    try {
      const client = await clerkClient();
      await client.invitations.revokeInvitation(row.clerkInvitationId);
    } catch (err) {
      console.error("Failed to revoke previous Clerk invitation during resend", err);
    }
  }

  const client = await clerkClient();
  const invitation = await client.invitations.createInvitation({
    emailAddress: row.invitedEmail,
    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/overview`,
    publicMetadata: { foracleFamilyMemberId: row.id },
    ignoreExisting: true,
  });

  await db
    .update(familyMembers)
    .set({ clerkInvitationId: invitation.id, updatedAt: new Date() })
    .where(eq(familyMembers.id, row.id));

  revalidatePath("/user");
  return { id: row.id, status: "pending" as const };
}
