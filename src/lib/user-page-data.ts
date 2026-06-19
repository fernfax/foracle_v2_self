import { cache } from "react"
import { getCpfByFamilyMember } from "@/actions/cpf"
import { getCurrentHoldings } from "@/actions/current-holdings"
import { getExpenses } from "@/actions/expenses"
import { getFamilyMembers } from "@/actions/family-members"
import { getIncomes } from "@/actions/incomes"
import { getInvestments } from "@/actions/investments"
import { getUserPolicies } from "@/actions/policies"
import { getPropertyAssets } from "@/actions/property-assets"
import { getVehicleAssets } from "@/actions/vehicle-assets"

import { cpfBalanceForMember } from "@/lib/cpf-balances"
import { computeHouseholdSummary } from "@/lib/household-summary"
import { computeNetWorth } from "@/lib/net-worth"

/**
 * Per-request data loaders for the /user/* tab routes.
 *
 * Each tab route fetches only the slices it needs. `cache()` memoizes within a
 * single server render, so a route that needs `incomes` both directly and via a
 * composed summary (e.g. /user/incomes) hits the DB once. It does NOT cache
 * across navigations — the routes are force-dynamic and refetch on each visit,
 * matching the old single-page behavior.
 */
export const loadIncomes = cache(getIncomes)
export const loadExpenses = cache(getExpenses)
export const loadHoldings = cache(getCurrentHoldings)
export const loadInvestments = cache(getInvestments)
export const loadCpf = cache(getCpfByFamilyMember)
export const loadProperties = cache(getPropertyAssets)
export const loadVehicles = cache(getVehicleAssets)
export const loadPolicies = cache(getUserPolicies)

// Pending/revoked invitations belong only in the Clerk Manage Account > Family
// modal, never the on-page surfaces.
export const loadVisibleFamilyMembers = cache(async () => {
  const members = await getFamilyMembers()
  return members.filter((m) => m.status !== "pending" && m.status !== "revoked")
})

export const loadHouseholdSummary = cache(async () => {
  const [incomes, expenses, holdings, members] = await Promise.all([
    loadIncomes(),
    loadExpenses(),
    loadHoldings(),
    loadVisibleFamilyMembers()
  ])
  return computeHouseholdSummary(incomes, expenses, holdings, members)
})

export const loadNetWorthSummary = cache(async () => {
  const [holdings, properties, vehicles, investments, policies, cpf, incomes] =
    await Promise.all([
      loadHoldings(),
      loadProperties(),
      loadVehicles(),
      loadInvestments(),
      loadPolicies(),
      loadCpf(),
      loadIncomes()
    ])
  return computeNetWorth({
    holdings,
    properties,
    vehicles,
    investments,
    policies,
    cpf: cpf.map((m) => ({
      id: m.familyMemberId,
      name: m.familyMemberName,
      balance: cpfBalanceForMember(m.familyMemberId, incomes).total
    }))
  })
})
