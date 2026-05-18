"use server";

import { revalidatePath } from "next/cache";
import {
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
