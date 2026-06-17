import { getCpfByFamilyMember } from "@/actions/cpf"
import { getCurrentHoldings } from "@/actions/current-holdings"
import { getExpenses } from "@/actions/expenses"
import { getFamilyMembers } from "@/actions/family-members"
import { getIncomes } from "@/actions/incomes"
import { getInvestments } from "@/actions/investments"
import { getUserPolicies } from "@/actions/policies"
import { getPropertyAssets } from "@/actions/property-assets"
import { getVehicleAssets } from "@/actions/vehicle-assets"
import { auth } from "@clerk/nextjs/server"

import { cpfBalanceForMember } from "@/lib/cpf-balances"
import { computeHouseholdSummary } from "@/lib/household-summary"
import { computeNetWorth } from "@/lib/net-worth"
import { UserHomepageClient } from "@/app/(app)/user/client"

export const dynamic = "force-dynamic"

export default async function UserHomepage() {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  const [
    incomesBeta,
    familyMembers,
    cpfData,
    currentHoldings,
    policies,
    propertyAssets,
    vehicleAssets,
    expenses,
    investments
  ] = await Promise.all([
    getIncomes(),
    getFamilyMembers(),
    getCpfByFamilyMember(),
    getCurrentHoldings(),
    getUserPolicies(),
    getPropertyAssets(),
    getVehicleAssets(),
    getExpenses(),
    getInvestments()
  ])

  // Pending and revoked invitations belong only in the Clerk Manage Account >
  // Family modal, not in the on-page Family tab.
  const visibleFamilyMembers = familyMembers.filter(
    (m) => m.status !== "pending" && m.status !== "revoked"
  )

  const householdSummary = computeHouseholdSummary(
    incomesBeta,
    expenses,
    currentHoldings,
    visibleFamilyMembers
  )

  // CPF balances reuse the same per-member selection as the CPF tab so the two
  // surfaces never disagree. Driven by cpfData (the canonical CPF-member list).
  const netWorth = computeNetWorth({
    holdings: currentHoldings,
    properties: propertyAssets,
    vehicles: vehicleAssets,
    investments,
    policies,
    cpf: cpfData.map((m) => ({
      id: m.familyMemberId,
      name: m.familyMemberName,
      balance: cpfBalanceForMember(m.familyMemberId, incomesBeta).total
    }))
  })

  return (
    <UserHomepageClient
      initialIncomesBeta={incomesBeta}
      initialFamilyMembers={visibleFamilyMembers}
      initialCpfData={cpfData}
      initialCurrentHoldings={currentHoldings}
      initialPropertyAssets={propertyAssets}
      initialExpenses={expenses}
      initialInvestments={investments}
      householdSummary={householdSummary}
      netWorth={netWorth}
    />
  )
}
