import { auth } from "@clerk/nextjs/server";

export const dynamic = 'force-dynamic';

import { getIncomesBeta } from "@/lib/actions/incomes-beta";
import { getFamilyMembers } from "@/lib/actions/family-members";
import { getCpfByFamilyMember } from "@/lib/actions/cpf";
import { getCurrentHoldings } from "@/lib/actions/current-holdings";
import { getUserPolicies } from "@/lib/actions/policies";
import { getPropertyAssets } from "@/lib/actions/property-assets";
import { getExpenses } from "@/lib/actions/expenses";
import { getInvestments } from "@/lib/actions/investments";
import { UserHomepageClient } from "./client";
import { computeHouseholdSummary } from "@/lib/household-summary";

export default async function UserHomepage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const [incomesBeta, familyMembers, cpfData, currentHoldings, policies, propertyAssets, expenses, investments] = await Promise.all([
    getIncomesBeta(),
    getFamilyMembers(),
    getCpfByFamilyMember(),
    getCurrentHoldings(),
    getUserPolicies(),
    getPropertyAssets(),
    getExpenses(),
    getInvestments(),
  ]);

  // Pending and revoked invitations belong only in the Clerk Manage Account >
  // Family modal, not in the on-page Family tab.
  const visibleFamilyMembers = familyMembers.filter(
    (m) => m.status !== "pending" && m.status !== "revoked"
  );

  const householdSummary = computeHouseholdSummary(
    incomesBeta,
    expenses,
    currentHoldings,
    visibleFamilyMembers,
  );

  return (
    <UserHomepageClient
      initialIncomes={incomesBeta}
      initialIncomesBeta={incomesBeta}
      initialFamilyMembers={visibleFamilyMembers}
      initialCpfData={cpfData}
      initialCurrentHoldings={currentHoldings}
      initialPolicies={policies}
      initialPropertyAssets={propertyAssets}
      initialExpenses={expenses}
      initialInvestments={investments}
      householdSummary={householdSummary}
    />
  );
}
