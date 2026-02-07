import { currentUser } from "@clerk/nextjs/server";

export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";
import { getUserPolicies } from "@/lib/actions/policies";
import { getUserFamilyMembers } from "@/lib/actions/user";
import { PoliciesClient } from "./client";

export default async function PoliciesPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [policies, familyMembers] = await Promise.all([
    getUserPolicies(user.id),
    getUserFamilyMembers(),
  ]);

  return (
    <PoliciesClient
      initialPolicies={policies}
      familyMembers={familyMembers}
      userId={user.id}
    />
  );
}
