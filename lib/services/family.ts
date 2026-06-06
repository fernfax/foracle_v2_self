import { and, desc, eq, isNull, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { familyMembers, incomesBeta, users } from "@/db/schema";
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
  readonly code:
    | "OTHER_FAMILY"
    | "INVALID_RELATIONSHIP"
    | "INVALID_EMAIL"
    | "INVALID_STATUS"
    | "ALREADY_LINKED"
    | "EXISTING_USER";
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
    where: eq(familyMembers.familyId, ctx.familyId),
    orderBy: [desc(familyMembers.createdAt)],
  });
}

export async function getFamilyMemberById(
  ctx: AuthContext,
  id: string
): Promise<FamilyMemberRow | null> {
  const row = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.id, id), eq(familyMembers.familyId, ctx.familyId)),
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
    .where(and(eq(familyMembers.id, id), eq(familyMembers.familyId, ctx.familyId)))
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
    where: and(eq(familyMembers.id, id), eq(familyMembers.familyId, ctx.familyId)),
  });
  if (!existing) throw new FamilyMemberNotFoundError();

  // Capture the linked incomes (for the confirmation summary) before deleting.
  const linkedIncomes = await db
    .select({
      id: incomesBeta.id,
      name: incomesBeta.name,
      amount: incomesBeta.amount,
      category: incomesBeta.category,
    })
    .from(incomesBeta)
    .where(eq(incomesBeta.familyMemberId, id));

  await db.delete(incomesBeta).where(eq(incomesBeta.familyMemberId, id));
  await db
    .delete(familyMembers)
    .where(and(eq(familyMembers.id, id), eq(familyMembers.familyId, ctx.familyId)));

  return { deletedIncomes: linkedIncomes };
}

export async function getFamilyMemberIncomes(
  ctx: AuthContext,
  id: string
): Promise<{ id: string; name: string; amount: string; category: string }[]> {
  const member = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.id, id), eq(familyMembers.familyId, ctx.familyId)),
  });
  if (!member) throw new FamilyMemberNotFoundError();
  return db
    .select({
      id: incomesBeta.id,
      name: incomesBeta.name,
      amount: incomesBeta.amount,
      category: incomesBeta.category,
    })
    .from(incomesBeta)
    .where(eq(incomesBeta.familyMemberId, id));
}

// Finds the caller's own Self row in the current family. Adopts legacy rows
// that pre-date the clerkUserId linking — matched by user_id + relationship
// when clerk_user_id is still NULL. This is the single place that decides
// whether to insert vs reuse, so the rest of the code can call it freely
// without re-implementing the same dedupe logic.
async function findCallerSelfRow(
  ctx: AuthContext
): Promise<FamilyMemberRow | null> {
  const row = await db.query.familyMembers.findFirst({
    where: and(
      eq(familyMembers.familyId, ctx.familyId),
      eq(familyMembers.relationship, "Self"),
      or(
        eq(familyMembers.clerkUserId, ctx.userId),
        and(eq(familyMembers.userId, ctx.userId), isNull(familyMembers.clerkUserId))
      )
    ),
  });
  return row ?? null;
}

// Onboarding helper. If the caller already has a Self row (clerk-linked OR
// legacy NULL-clerk), returns/updates it. Otherwise inserts a new one.
export async function getOrCreateSelfMember(
  ctx: AuthContext,
  data: { name: string; dateOfBirth: string }
): Promise<FamilyMemberRow> {
  const existing = await findCallerSelfRow(ctx);

  if (existing) {
    const [row] = await db
      .update(familyMembers)
      .set({
        // Adopt the row by setting clerk_user_id if it was NULL (legacy).
        clerkUserId: ctx.userId,
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
      clerkUserId: ctx.userId,
      name: data.name,
      relationship: "Self",
      dateOfBirth: data.dateOfBirth,
      isContributing: true,
    })
    .returning();
  return row;
}

// Returns the family member list, ensuring exactly one Self row exists for
// the caller. If the caller's Self row exists with NULL clerk_user_id
// (legacy), adopt it by writing clerk_user_id. If no Self row exists, insert
// a fresh one. The partial unique index on family_members(clerk_user_id)
// backs this up at the DB layer.
export async function listFamilyMembersOrSelf(
  ctx: AuthContext
): Promise<FamilyMemberRow[]> {
  const members = await listFamilyMembers(ctx);
  const existing = members.find(
    (m) =>
      m.relationship === "Self" &&
      (m.clerkUserId === ctx.userId ||
        (m.userId === ctx.userId && m.clerkUserId === null))
  );

  // Already linked — nothing to do.
  if (existing && existing.clerkUserId === ctx.userId) {
    return members;
  }

  // Legacy Self row with NULL clerk_user_id — adopt it in place.
  if (existing && existing.clerkUserId === null) {
    const [adopted] = await db
      .update(familyMembers)
      .set({ clerkUserId: ctx.userId, status: "active", updatedAt: new Date() })
      .where(eq(familyMembers.id, existing.id))
      .returning();
    return members.map((m) => (m.id === adopted.id ? adopted : m));
  }

  // No Self row at all — create one.
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
      clerkUserId: ctx.userId,
      name: userName,
      relationship: "Self",
      isContributing: false,
      notes: "Primary account holder",
    })
    .returning();
  return [row, ...members];
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

  // Block invites for emails that already have a fully-signed-up Foracle
  // account. Clerk's `createInvitation` with `ignoreExisting: true` happily
  // sends an invite link to existing users, but those users already have a
  // `users.family_id` so accepting the invite doesn't reroute them — they
  // end up in their original family, and the inviting master is left with
  // an orphan pending row. This was the prod bug behind the "logged in to
  // realise the family ID is different" complaint.
  const existingUserByEmail = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
    columns: { id: true, email: true, familyId: true },
  });
  if (existingUserByEmail && existingUserByEmail.familyId !== ctx.familyId) {
    throw new InvitationError(
      "EXISTING_USER",
      `${normalizedEmail} already has a Foracle account in another family. They can't be added to this family — ask them to delete their account first, or invite them at a different email.`
    );
  }

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

// Convert an existing informational family member (no Clerk user yet) into a
// real authenticated user. Reuses the same family_members row so all linked
// records (incomes, policies, holdings) follow the converted member without
// any data migration. Sends a Clerk invitation with publicMetadata pointing
// at this row; on acceptance the webhook/auth-context fallback flips the
// row to active and sets onboardingCompleted on the new user.
export async function convertFamilyMember(
  rowId: string,
  input: { email: string; firstName?: string; lastName?: string }
): Promise<{ id: string; status: "pending" }> {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new InvitationError("INVALID_EMAIL", "Invalid email address");
  }

  const ctx = await callerAsMaster();

  const row = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.id, rowId), eq(familyMembers.familyId, ctx.familyId)),
  });
  if (!row) throw new FamilyMemberNotFoundError();
  if (row.clerkUserId) {
    throw new InvitationError(
      "ALREADY_LINKED",
      "This family member is already a Foracle user"
    );
  }
  if (row.status !== "active" && row.status !== "informational") {
    throw new InvitationError(
      "INVALID_STATUS",
      "Only informational members can be converted"
    );
  }

  // Reject if this email already belongs to a different family. An existing
  // pending row in the *current* family is fine — it would be a no-op overlap.
  const existingByEmail = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.invitedEmail, normalizedEmail),
  });
  if (
    existingByEmail &&
    existingByEmail.id !== row.id &&
    existingByEmail.status !== "revoked" &&
    existingByEmail.familyId !== ctx.familyId
  ) {
    throw new InvitationError(
      "OTHER_FAMILY",
      "This email is already part of another family"
    );
  }

  // Derive firstName/lastName: prefer caller input, fall back to existing
  // columns, then to splitting the display name.
  const fallbackSplit = row.name?.split(/\s+/) ?? [];
  const firstName = (input.firstName ?? row.firstName ?? fallbackSplit[0] ?? "").trim();
  const lastName = (
    input.lastName ?? row.lastName ?? fallbackSplit.slice(1).join(" ") ?? ""
  ).trim();

  await db
    .update(familyMembers)
    .set({
      invitedEmail: normalizedEmail,
      firstName: firstName || null,
      lastName: lastName || null,
      status: "pending",
      emailInvitationAccepted: false,
      updatedAt: new Date(),
    })
    .where(eq(familyMembers.id, row.id));

  let clerkInvitationId: string | null = null;
  try {
    const client = await clerkClient();
    const invitation = await client.invitations.createInvitation({
      emailAddress: normalizedEmail,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/overview`,
      publicMetadata: { foracleFamilyMemberId: row.id },
      ignoreExisting: true,
    });
    clerkInvitationId = invitation.id;
  } catch (err) {
    // Roll the row back so the UI doesn't show a pending invite that was
    // never actually sent.
    await db
      .update(familyMembers)
      .set({
        status: row.status,
        invitedEmail: row.invitedEmail,
        updatedAt: new Date(),
      })
      .where(eq(familyMembers.id, row.id));
    throw err;
  }

  if (clerkInvitationId) {
    await db
      .update(familyMembers)
      .set({ clerkInvitationId, updatedAt: new Date() })
      .where(eq(familyMembers.id, row.id));
  }

  return { id: row.id, status: "pending" };
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
