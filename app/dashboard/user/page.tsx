import { auth } from "@clerk/nextjs/server";
import { getIncomes } from "@/lib/actions/income";
import { getFamilyMembers } from "@/lib/actions/family-members";
import { UserHomepageClient } from "./client";

export default async function UserHomepage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const [incomes, familyMembers] = await Promise.all([
    getIncomes(),
    getFamilyMembers(),
  ]);

  return <UserHomepageClient initialIncomes={incomes} initialFamilyMembers={familyMembers} />;
}
