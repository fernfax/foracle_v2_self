"use server";

import { desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { families, familyMembers, users } from "@/db/schema";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  convertFamilyMember as convertFamilyMemberService,
  inviteFamilyMember as inviteFamilyMemberService,
  resendInvitation as resendInvitationService,
  revokeInvitation as revokeInvitationService,
} from "@/lib/services/family";
import { type RelationshipValue } from "@/lib/family-relationships";

type InviteInput = {
  firstName: string;
  lastName: string;
  email: string;
  relationship: RelationshipValue;
};

export async function inviteFamilyMember(input: InviteInput) {
  if (!input.firstName.trim() || !input.lastName.trim() || !input.email.trim()) {
    throw new Error("First name, last name, and email are required");
  }
  const result = await inviteFamilyMemberService({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    relationship: input.relationship,
  });
  revalidatePath("/user");
  return result;
}

type ConvertInput = {
  email: string;
  firstName?: string;
  lastName?: string;
};

export async function convertFamilyMember(rowId: string, input: ConvertInput) {
  if (!input.email.trim()) {
    throw new Error("Email is required");
  }
  const result = await convertFamilyMemberService(rowId, {
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
  });
  revalidatePath("/user");
  return result;
}

export async function revokeInvitation(rowId: string) {
  const result = await revokeInvitationService(rowId);
  revalidatePath("/user");
  return result;
}

export async function resendInvitation(rowId: string) {
  const result = await resendInvitationService(rowId);
  revalidatePath("/user");
  return result;
}

export type PendingInvitation = {
  id: string;
  name: string;
  email: string;
  relationship: string | null;
  sentAt: string; // ISO date
};

export type FamilyMemberSummary = {
  id: string;
  name: string;
  email: string | null;
  relationship: string | null;
  isMaster: boolean;
  isYou: boolean;
  // True iff this row is informational (no Clerk user yet) and can be
  // promoted to a real authenticated user by the master.
  canConvert: boolean;
  joinedAt: string; // ISO date
};

export type FamilyAdminData = {
  familyId: string;
  isMaster: boolean;
  masterName: string | null;
  masterEmail: string | null;
  members: FamilyMemberSummary[];
  pendingInvitations: PendingInvitation[];
};

// One round-trip for the admin panel:
//   - family identity (id + who's master) so members can see context
//   - current member roster (active + informational rows)
//   - pending invitations the master can resend/revoke
// Family-scoped: every member of the family sees the same data, but only the
// master can act on the pending list.
export async function getFamilyAdminData(): Promise<FamilyAdminData> {
  const ctx = await getCurrentUserAndFamily();

  const [family, allRows] = await Promise.all([
    db.query.families.findFirst({
      where: eq(families.id, ctx.familyId),
      columns: { masterUserId: true },
    }),
    db
      .select({
        id: familyMembers.id,
        name: familyMembers.name,
        invitedEmail: familyMembers.invitedEmail,
        relationship: familyMembers.relationship,
        status: familyMembers.status,
        clerkUserId: familyMembers.clerkUserId,
        createdAt: familyMembers.createdAt,
      })
      .from(familyMembers)
      .where(eq(familyMembers.familyId, ctx.familyId))
      .orderBy(desc(familyMembers.createdAt)),
  ]);

  let masterName: string | null = null;
  let masterEmail: string | null = null;
  if (family?.masterUserId) {
    const master = await db.query.users.findFirst({
      where: eq(users.id, family.masterUserId),
      columns: { firstName: true, lastName: true, email: true },
    });
    if (master) {
      const name = `${master.firstName ?? ""} ${master.lastName ?? ""}`.trim();
      masterName = name.length > 0 ? name : null;
      masterEmail = master.email;
    }
  }

  // Fetch emails for clerk-linked members so non-pending rows can show contact
  // info. Pending rows already have invitedEmail; active/informational rows
  // store the email on the linked users row.
  const linkedUserIds = Array.from(
    new Set(allRows.map((r) => r.clerkUserId).filter((id): id is string => id !== null))
  );
  const linkedUsers = linkedUserIds.length
    ? await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(inArray(users.id, linkedUserIds))
    : [];
  const emailByUserId = new Map(linkedUsers.map((u) => [u.id, u.email]));

  const members: FamilyMemberSummary[] = allRows
    .filter((r) => r.status === "active" || r.status === "informational")
    .map((r) => ({
      id: r.id,
      name: r.name,
      email: r.clerkUserId
        ? emailByUserId.get(r.clerkUserId) ?? r.invitedEmail
        : r.invitedEmail,
      relationship: r.relationship,
      isMaster: r.clerkUserId !== null && r.clerkUserId === family?.masterUserId,
      isYou: r.clerkUserId === ctx.userId,
      // Convertible iff this row is purely informational (no Clerk user
      // behind it yet) and isn't a "Self" placeholder for an existing user.
      // Only the master sees the button (gated client-side); the action
      // re-checks server-side.
      canConvert: r.clerkUserId === null && r.relationship !== "Self",
      joinedAt: r.createdAt.toISOString(),
    }));

  const pendingInvitations: PendingInvitation[] = allRows
    .filter((r) => r.status === "pending" && r.invitedEmail !== null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      email: r.invitedEmail as string,
      relationship: r.relationship,
      sentAt: r.createdAt.toISOString(),
    }));

  return {
    familyId: ctx.familyId,
    isMaster: ctx.isMaster,
    masterName,
    masterEmail,
    members,
    pendingInvitations,
  };
}
