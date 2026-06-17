"use client"

import { useEffect, useState, type ComponentProps } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Briefcase,
  Building2,
  DollarSign,
  Receipt,
  Users,
  Waves
} from "lucide-react"

import { CpfByFamilyMember } from "@/lib/actions/cpf"
import { CurrentHolding } from "@/lib/actions/current-holdings"
import type { HouseholdSummary } from "@/lib/household-summary"
import type { NetWorthSummary } from "@/lib/net-worth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { SlidingTabs } from "@/components/ui/sliding-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { CpfProjectionGraph } from "@/components/cpf/cpf-projection-graph"
import { CpfView } from "@/components/cpf/cpf-view"
import { CashflowSankey } from "@/components/dashboard/cashflow-sankey"
import { FamilyMemberGrid } from "@/components/family-members/family-member-grid"
import { IncomeList } from "@/components/income/income-list"
import { IncomeStatBand } from "@/components/income/income-stat-band"
import { IncomesBetaView } from "@/components/income/incomes-beta/incomes-beta-view"
import { NetWorthView } from "@/components/net-worth/net-worth-view"
import { ExpensesClient } from "@/app/(app)/expenses/client"

type Income = {
  id: string
  userId: string
  name: string
  category: string
  incomeCategory: string | null
  amount: string
  frequency: string
  customMonths: string | null
  subjectToCpf: boolean | null
  accountForBonus: boolean | null
  bonusGroups: string | null
  employeeCpfContribution: string | null
  employerCpfContribution: string | null
  netTakeHome: string | null
  cpfOrdinaryAccount: string | null
  cpfSpecialAccount: string | null
  cpfMedisaveAccount: string | null
  description: string | null
  startDate: string
  endDate: string | null
  pastIncomeHistory: string | null
  futureMilestones: string | null
  accountForFutureChange: boolean | null
  isActive: boolean | null
  familyMemberId: string | null
  familyMember: {
    id: string
    name: string
    relationship: string | null
    dateOfBirth: string | null
    isContributing: boolean | null
  } | null
  createdAt: Date
  updatedAt: Date
}

type FamilyMember = {
  id: string
  name: string
  relationship: string | null
  dateOfBirth: string | null
  isContributing: boolean | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

type PropertyAssetForCpf = {
  id: string
  monthlyLoanPayment: string
  outstandingLoan: string
  paidByCpf: boolean | null
  isActive: boolean | null
}

interface UserHomepageClientProps {
  initialIncomes: Income[]
  // The Beta view is wired to its own `incomes_beta` table. Empty until the
  // user creates rows via the new beta CRUD flow.
  initialIncomesBeta: Income[]
  initialFamilyMembers: FamilyMember[]
  initialCpfData: CpfByFamilyMember[]
  initialCurrentHoldings: CurrentHolding[]
  initialPropertyAssets: PropertyAssetForCpf[]
  // Borrow the exact prop shapes ExpensesClient expects so the embedded
  // Expenses tab type-checks without re-declaring the Expense/Investment types.
  initialExpenses: ComponentProps<typeof ExpensesClient>["initialExpenses"]
  initialInvestments: ComponentProps<
    typeof ExpensesClient
  >["initialInvestments"]
  householdSummary: HouseholdSummary
  netWorth: NetWorthSummary
}

export function UserHomepageClient({
  initialIncomes,
  initialIncomesBeta,
  initialFamilyMembers,
  initialCpfData,
  initialCurrentHoldings,
  initialPropertyAssets,
  initialExpenses,
  initialInvestments,
  householdSummary,
  netWorth
}: UserHomepageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab") || "overview"
    return tab === "current" ? "holdings" : tab
  })
  // "standard" = the Timeline Studio (formerly "beta") — now the default.
  // "legacy" = the old income table view. Opt into it with ?view=legacy.
  const [incomeView, setIncomeView] = useState<"legacy" | "standard">(
    searchParams.get("view") === "legacy" ? "legacy" : "standard"
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync activeTab + incomeView with URL search params when they change
  useEffect(() => {
    // "current" was the legacy slug for the Holdings tab — redirect to "holdings".
    // Bare /user (no ?tab=) always defaults to Overview — keep this fallback in
    // sync with the initial useState above so the tab can't flip on mount.
    const raw = searchParams.get("tab") || "overview"
    const tabFromUrl = raw === "current" ? "holdings" : raw
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
    const viewFromUrl =
      searchParams.get("view") === "legacy" ? "legacy" : "standard"
    if (viewFromUrl !== incomeView) {
      setIncomeView(viewFromUrl)
    }
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Switching tabs always returns to the standard view
    router.push(`/user?tab=${value}`, { scroll: false })
  }

  const handleToggleIncomeView = () => {
    const next = incomeView === "legacy" ? "standard" : "legacy"
    setIncomeView(next)
    const params = new URLSearchParams()
    params.set("tab", "incomes")
    if (next === "legacy") params.set("view", "legacy")
    router.push(`/user?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="User Homepage"
        tabs={
          mounted ? (
            <SlidingTabs
              tabs={[
                { value: "overview", label: "Overview", icon: Waves },
                { value: "family", label: "Family", icon: Users },
                { value: "incomes", label: "Incomes", icon: DollarSign },
                { value: "expenses", label: "Expenses", icon: Receipt },
                { value: "cpf", label: "CPF", icon: Building2 },
                { value: "holdings", label: "Holdings", icon: Briefcase }
              ]}
              value={activeTab}
              onValueChange={handleTabChange}
            />
          ) : null
        }
      />

      {!mounted ? (
        <div className="bg-muted h-[500px] animate-pulse rounded-lg" />
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full">
          <TabsContent value="overview" className="mt-4">
            <CashflowSankey
              incomes={initialIncomesBeta}
              expenses={initialExpenses}
              holdings={initialCurrentHoldings}
              investments={initialInvestments}
            />
          </TabsContent>

          <TabsContent value="family" className="mt-4">
            <FamilyMemberGrid initialMembers={initialFamilyMembers} />
          </TabsContent>

          <TabsContent value="incomes" className="mt-4 space-y-4">
            <IncomeStatBand
              grossIncome={householdSummary.grossIncome}
              netIncome={householdSummary.netIncome}
              incomes={initialIncomesBeta}
            />
            {incomeView === "standard" ? (
              <IncomesBetaView
                incomes={initialIncomesBeta}
                familyMembers={initialFamilyMembers}
              />
            ) : (
              <IncomeList initialIncomes={initialIncomes} />
            )}
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            <ExpensesClient
              embedded
              initialExpenses={initialExpenses}
              initialIncomes={initialIncomesBeta}
              initialHoldings={initialCurrentHoldings}
              initialInvestments={initialInvestments}
            />
          </TabsContent>

          <TabsContent value="cpf" className="mt-4">
            <CpfView cpfData={initialCpfData} incomes={initialIncomesBeta} />
            <div className="mt-6">
              <CpfProjectionGraph
                cpfData={initialCpfData}
                incomes={initialIncomesBeta}
                propertyAssets={initialPropertyAssets}
              />
            </div>
          </TabsContent>

          <TabsContent value="holdings" className="mt-4">
            <NetWorthView
              summary={netWorth}
              initialHoldings={initialCurrentHoldings}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
