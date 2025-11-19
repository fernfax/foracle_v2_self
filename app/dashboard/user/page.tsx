import { auth } from "@clerk/nextjs/server";
import { getIncomes } from "@/lib/actions/income";
import { getFamilyMembers } from "@/lib/actions/family-members";
import { getCpfByFamilyMember } from "@/lib/actions/cpf";
import { getCurrentHoldings } from "@/lib/actions/current-holdings";
import { UserHomepageClient } from "./client";

export default async function UserHomepage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const [incomes, familyMembers, cpfData, currentHoldings] = await Promise.all([
    getIncomes(),
    getFamilyMembers(),
    getCpfByFamilyMember(),
    getCurrentHoldings(),
  ]);

  return <UserHomepageClient initialIncomes={incomes} initialFamilyMembers={familyMembers} initialCpfData={cpfData} initialCurrentHoldings={currentHoldings} />;
}
