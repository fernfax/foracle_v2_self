import { auth } from "@clerk/nextjs/server";
import { getIncomes } from "@/lib/actions/income";
import { getFamilyMembers } from "@/lib/actions/family-members";
import { getCpfByFamilyMember } from "@/lib/actions/cpf";
import { UserHomepageClient } from "./client";

export default async function UserHomepage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const [incomes, familyMembers, cpfData] = await Promise.all([
    getIncomes(),
    getFamilyMembers(),
    getCpfByFamilyMember(),
  ]);

  return <UserHomepageClient initialIncomes={incomes} initialFamilyMembers={familyMembers} initialCpfData={cpfData} />;
}
