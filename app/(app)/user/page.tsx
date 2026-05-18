import { auth } from "@clerk/nextjs/server";

export const dynamic = 'force-dynamic';

import { getIncomes } from "@/lib/actions/income";
import { getIncomesBeta } from "@/lib/actions/incomes-beta";
import { getFamilyMembers } from "@/lib/actions/family-members";
import { getCpfByFamilyMember } from "@/lib/actions/cpf";
import { getCurrentHoldings } from "@/lib/actions/current-holdings";
import { getUserPolicies } from "@/lib/actions/policies";
import { getPropertyAssets } from "@/lib/actions/property-assets";
import { UserHomepageClient } from "./client";

export default async function UserHomepage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const [incomes, incomesBeta, familyMembers, cpfData, currentHoldings, policies, propertyAssets] = await Promise.all([
    getIncomes(),
    getIncomesBeta(),
    getFamilyMembers(),
    getCpfByFamilyMember(),
    getCurrentHoldings(),
    getUserPolicies(),
    getPropertyAssets(),
  ]);

  return <UserHomepageClient initialIncomes={incomes} initialIncomesBeta={incomesBeta} initialFamilyMembers={familyMembers} initialCpfData={cpfData} initialCurrentHoldings={currentHoldings} initialPolicies={policies} initialPropertyAssets={propertyAssets} />;
}
