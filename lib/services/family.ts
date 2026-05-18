import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { familyMembers, incomes, users } from "@/db/schema";
import type { AuthContext } from "@/lib/auth-context";
import { assertCallerIsMaster } from "@/lib/auth-context";
import { RELATIONSHIP_VALUES, type RelationshipValue } from "@/lib/family-relationships";
import type {
  CreateFamilyMemberBody,
  InviteFamilyMemberBody,
  UpdateFamilyMemberBody,
} from "@/lib/api-schemas/family";

export type FamilyMemberRow = typeof familyMembers.$inferSelect;

export class FamilyMemberNotFoundError extends Error {
  constructor() {
    super("Family member not found");
  }
}

export class InvitationError extends Error {
  readonly code: "OTHER_FAMILY" | "INVALID_RELATIONSHIP" | "INVALID_EMAIL" | "INVALID_STATUS";
  constructor(code: InvitationError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

// =============================================================================
// Members — informational + Clerk-linked rows live in the same table
// =============================================================================

export async function listFamilyMembers(
  ctx: AuthContext
): Promise<FamilyMemberRow[]> {
  return db.query.familyMembers.findMany({
    where: eq(familyMembers.userId, ctx.userId),
    orderBy: [desc(familyMembers.createdAt)],
  });
}

export async function getFamilyMemberById(
  ctx: AuthContext,
  id: string
): Promise<FamilyMemberRow | null> {
  const row = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.id, id), eq(familyMembers.userId, ctx.userId)),
  });
  return row ?? null;
}

export async function createFamilyMember(
  ctx: AuthContext,
  body: CreateFamilyMemberBody
): Promise<FamilyMemberRow> {
  const [row] = await db
    .insert(familyMembers)
    .values({
      id: nanoid(),
      userId: ctx.userId,
      familyId: ctx.familyId,
      name: body.name,
      relationship: body.relationship,
      dateOfBirth: body.dateOfBirth ?? null,
      isContributing: body.isContributing ?? false,
      notes: body.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateFamilyMember(
  ctx: AuthContext,
  id: string,
  patch: UpdateFamilyMemberBody
): Promise<FamilyMemberRow> {
  const existing = await getFamilyMemberById(ctx, id);
  if (!existing) throw new FamilyMemberNotFoundError();

  const update: Partial<typeof familyMembers.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.relationship !== undefined) update.relationship = patch.relationship;
  if (patch.dateOfBirth !== undefined) update.dateOfBirth = patch.dateOfBirth ?? null;
  if (patch.isContributing !== undefined) update.isContributing = patch.isContributing;
  if (patch.notes !== undefined) update.notes = patch.notes ?? null;

  const [row] = await db
    .update(familyMembers)
    .set(update)
    .where(and(eq(familyMembers.id, id), eq(familyMembers.userId, ctx.userId)))
    .returning();
  return row;
}

// Cascades all incomes linked to this member (CPF data lives on income rows).
// Returns the deleted income summaries so the UI can show a confirmation.
export async function deleteFamilyMember(
  ctx: AuthContext,
  id: string
): Promise<{
  deletedIncomes: { id: string; name: string; amount: string; category: string }[];
}> {
  const existing = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.id, id), eq(familyMembers.userId, ctx.userId)),
    with: {
      incomes: {
        columns: { id: true, name: true, amount: true, category: true },
      },
    },
  });
  if (!existing) throw new FamilyMemberNotFoundError();

  await db.delete(incomes).where(eq(incomes.familyMemberId, id));
  await db
    .delete(familyMembers)
    .where(and(eq(familyMembers.id, id), eq(familyMembers.userId, ctx.userId)));

  return { deletedIncomes: existing.incomes ?? [] };
}

export async function getFamilyMemberIncomes(
  ctx: AuthContext,
  id: string
): Promise<{ id: string; name: string; amount: string; category: string }[]> {
  const member = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.id, id), eq(familyMembers.userId, ctx.userId)),
    with: {
      incomes: {
        columns: { id: true, name: true, amount: true, category: true },
      },
    },
  });
  if (!member) throw new FamilyMemberNotFoundError();
  return member.incomes ?? [];
}

// Onboarding helper. If the caller already has any family members, returns
// the existing "Self" row (creating/updating it). Otherwise inserts a new one.
export async function getOrCreateSelfMember(
  ctx: AuthContext,
  data: { name: string; dateOfBirth: string }
): Promise<FamilyMemberRow> {
  const existing = await db.query.familyMembers.findFirst({
    where: and(
      eq(familyMembers.userId, ctx.userId),
      eq(familyMembers.relationship, "Self")
    ),
  });

  if (existing) {
    const [row] = await db
      .update(familyMembers)
      .set({
        name: data.name,
        dateOfBirth: data.dateOfBirth,
        isContributing: true,
        updatedAt: new Date(),
      })
      .where(eq(familyMembers.id, existing.id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(familyMembers)
    .values({
      id: nanoid(),
      userId: ctx.userId,
      familyId: ctx.familyId,
      name: data.name,
      relationship: "Self",
      dateOfBirth: data.dateOfBirth,
      isContributing: true,
    })
    .returning();
  return row;
}

// Auto-seeds a Self member when the list is empty — preserves existing
// behavior of getFamilyMembers() action so the action layer can delegate.
export async function listFamilyMembersOrSelf(
  ctx: AuthContext
): Promise<FamilyMemberRow[]> {
  let members = await listFamilyMembers(ctx);
  if (members.length === 0) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
    });
    const userName = user
      ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "User"
      : "User";
    const [row] = await db
      .insert(familyMembers)
      .values({
        id: nanoid(),
        userId: ctx.userId,
        familyId: ctx.familyId,
        name: userName,
        relationship: "Self",
        isContributing: false,
        notes: "Primary account holder",
      })
      .returning();
    members = [row];
  }
  return members;
}

// =============================================================================
// Invitations — master only, Clerk-integrated
// =============================================================================

// Internal helper — assertCallerIsMaster() is the master gate.
async function callerAsMaster(): Promise<AuthContext> {
  return assertCallerIsMaster();
}

export async function inviteFamilyMember(
  input: InviteFamilyMemberBody
): Promise<{ id: string; status: "pending" }> {
  if (!RELATIONSHIP_VALUES.includes(input.relationship as RelationshipValue)) {
    throw new InvitationError("INVALID_RELATIONSHIP", "Invalid relationship");
  }
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new InvitationError("INVALID_EMAIL", "Invalid email address");
  }

  const ctx = await callerAsMaster();

  const existingByEmail = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.invitedEmail, normalizedEmail),
  });
  if (
    existingByEmail &&
    existingByEmail.status !== "revoked" &&
    existingByEmail.familyId !== ctx.familyId
  ) {
    throw new InvitationError(
      "OTHER_FAMILY",
      "This email is already part of another family"
    );
  }
  if (
    existingByEmail &&
    existingByEmail.familyId === ctx.familyId &&
    existingByEmail.status === "pending"
  ) {
    return resendInvitation(existingByEmail.id);
  }

  const rowId = `fm_${nanoid()}`;
  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`;

  await db.insert(familyMembers).values({
    id: rowId,
    userId: ctx.userId,
    familyId: ctx.familyId,
    name: fullName,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    relationship: input.relationship,
    invitedEmail: normalizedEmail,
    status: "pending",
  });

  let clerkInvitationId: string | null = null;
  try {
    const client = await clerkClient();
    const invitation = await client.invitations.createInvitation({
      emailAddress: normalizedEmail,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/overview`,
      publicMetadata: { foracleFamilyMemberId: rowId },
      ignoreExisting: true,
    });
    clerkInvitationId = invitation.id;
  } catch (err) {
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
  return { id: rowId, status: "pending" };
}

export async function revokeInvitation(
  rowId: string
): Promise<{ id: string; status: "revoked" }> {
  const ctx = await callerAsMaster();

  const row = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.id, rowId), eq(familyMembers.familyId, ctx.familyId)),
  });
  if (!row) throw new FamilyMemberNotFoundError();
  if (row.status !== "pending") {
    throw new InvitationError(
      "INVALID_STATUS",
      "Only pending invitations can be revoked"
    );
  }

  if (row.clerkInvitationId) {
    try {
      const client = await clerkClient();
      await client.invitations.revokeInvitation(row.clerkInvitationId);
    } catch (err) {
      console.error("Failed to revoke Clerk invitation", err);
    }
  }

  await db
    .update(familyMembers)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(eq(familyMembers.id, rowId));

  return { id: rowId, status: "revoked" };
}

export async function resendInvitation(
  rowId: string
): Promise<{ id: string; status: "pending" }> {
  const ctx = await callerAsMaster();

  const row = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.id, rowId), eq(familyMembers.familyId, ctx.familyId)),
  });
  if (!row || !row.invitedEmail) throw new FamilyMemberNotFoundError();
  if (row.status !== "pending") {
    throw new InvitationError(
      "INVALID_STATUS",
      "Only pending invitations can be resent"
    );
  }

  if (row.clerkInvitationId) {
    try {
      const client = await clerkClient();
      await client.invitations.revokeInvitation(row.clerkInvitationId);
    } catch (err) {
      console.error(
        "Failed to revoke previous Clerk invitation during resend",
        err
      );
    }
  }

  const client = await clerkClient();
  const invitation = await client.invitations.createInvitation({
    emailAddress: row.invitedEmail,
    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/overview`,
    publicMetadata: { foracleFamilyMemberId: row.id },
    ignoreExisting: true,
  });

  await db
    .update(familyMembers)
    .set({ clerkInvitationId: invitation.id, updatedAt: new Date() })
    .where(eq(familyMembers.id, row.id));

  return { id: row.id, status: "pending" };
}

// Re-export for the action layer's onboarding flow which previously had its
// own currentUser() call.
export { currentUser };
