"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Briefcase,
  Building2,
  DollarSign,
  Receipt,
  Target,
  Users
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BudgetCategory,
  BudgetTrackerCard
} from "@/components/dashboard/dashboard-budget-tracker-card"
import { CashflowSankey } from "@/components/dashboard/dashboard-cashflow-sankey"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { TotalAssetsCard } from "@/components/dashboard/dashboard-total-assets-card"
import { MonthlyBalanceGraph } from "@/components/expenses/expense-monthly-balance-graph"
import { PageHeader } from "@/components/layout/layout-page-header"

// No-op subscribe for the hydration-flag useSyncExternalStore below.
const emptySubscribe = () => () => {}

interface DashboardMetrics {
  totalIncome: number
  totalExpenses: number
  netSavings: number
  totalAssets: number
  activeGoals: number
  familyMembers: number
}

interface Income {
  id: string
  name: string
  amount: string
  frequency: string
  customMonths: string | null
  startDate: string
  endDate: string | null
  incomeCategory: string | null
  isActive: boolean | null
  netTakeHome: string | null
  subjectToCpf: boolean | null
  futureMilestones: string | null
  accountForFutureChange: boolean | null
  accountForBonus: boolean | null
  bonusGroups: string | null
}

interface Expense {
  id: string
  userId: string
  linkedPolicyId: string | null
  name: string
  category: string
  expenseCategory: string | null
  amount: string
  frequency: string
  customMonths: string | null
  startDate: string | null
  endDate: string | null
  description: string | null
  isActive: boolean | null
  createdAt: Date
  updatedAt: Date
}

interface CurrentHolding {
  id: string
  userId: string
  familyMemberId: string | null
  bankName: string
  holdingAmount: string
  createdAt: Date
  updatedAt: Date
  familyMemberName?: string | null
}

interface Investment {
  id: string
  name: string
  type: string
  currentCapital: string
  projectedYield: string
  contributionAmount: string
  contributionFrequency: string
  customMonths: string | null
  isActive: boolean | null
}

interface DashboardClientProps {
  metrics: DashboardMetrics
  incomes: Income[]
  expenses: Expense[]
  holdings: CurrentHolding[]
  investments: Investment[]
  budgetData: BudgetCategory[]
}

export function DashboardClient({
  metrics,
  incomes,
  expenses,
  holdings,
  investments,
  budgetData
}: DashboardClientProps) {
  // Hydration flag without a setState-in-effect: server snapshot is `false`,
  // client snapshot `true`. Gates the searchParams-dependent render until after
  // hydration to avoid a server/client mismatch.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
  const searchParams = useSearchParams()
  // `?view=` selects the layout. Default = "cashflow" — the sankey is now the
  // primary entry point. Users can flip to ?view=classic via the toggle.
  const view = searchParams.get("view") === "classic" ? "classic" : "cashflow"

  if (!mounted) {
    return <div className="bg-muted h-[500px] animate-pulse rounded-lg" />
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Overview" />

      {/* Navigation bridge — quick access to User Homepage tabs */}
      <div
        data-tour="overview-nav-bridge"
        className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground/60 mr-1 text-[11px]">
          Go to:
        </span>
        {[
          { tab: "family", label: "Family", icon: Users },
          { tab: "incomes", label: "Incomes", icon: DollarSign },
          { tab: "expenses", label: "Expenses", icon: Receipt },
          { tab: "cpf", label: "CPF", icon: Building2 },
          { tab: "holdings", label: "Holdings", icon: Briefcase }
        ].map(({ tab, label, icon: Icon }) => (
          <Link
            key={tab}
            href={`/user/${tab}`}
            className="border-border/50 text-muted-foreground hover:border-border hover:text-foreground inline-flex items-center gap-1 rounded-full border bg-transparent px-3 py-1 text-[11px] transition-colors">
            <Icon className="h-3 w-3" />
            {label}
          </Link>
        ))}
      </div>

      {view === "cashflow" ? (
        <CashflowSankey
          incomes={incomes}
          expenses={expenses}
          holdings={holdings}
          investments={investments}
        />
      ) : (
        <>
          {/* Main layout: Left (3/4) for Overview + Graph, Right (1/4) for Budget Tracker */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Left column - Monthly Overview and Balance Projection */}
            <div className="space-y-6 lg:col-span-3">
              {/* Header with universal month toggle and metrics cards */}
              <DashboardHeader
                totalIncome={metrics.totalIncome}
                totalExpenses={metrics.totalExpenses}
                netSavings={metrics.netSavings}
              />

              {/* Monthly Balance Projection */}
              <MonthlyBalanceGraph
                incomes={incomes}
                expenses={expenses}
                holdings={holdings}
                investments={investments}
              />
            </div>

            {/* Right column - Budget Tracker (height constrained to left column) */}
            <div className="relative lg:col-span-1">
              <div className="lg:absolute lg:inset-0">
                <BudgetTrackerCard budgetData={budgetData} />
              </div>
            </div>
          </div>

          {/* Secondary Metrics Grid */}
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
            data-tour="secondary-metrics">
            {/* Total Assets */}
            <TotalAssetsCard totalAssets={metrics.totalAssets} />

            {/* Active Goals */}
            <Card className="relative overflow-hidden" data-tour="goals-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Active Goals
                </CardTitle>
                <div className="bg-brand-teal/[0.12] flex h-10 w-10 items-center justify-center rounded-xl">
                  <Target className="text-on-success h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tabular-nums">
                  {metrics.activeGoals}
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Financial goals in progress
                </p>
              </CardContent>
            </Card>

            {/* Family Members */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Family Members
                </CardTitle>
                <div className="bg-brand-terracotta/[0.1] flex h-10 w-10 items-center justify-center rounded-xl">
                  <Users className="text-on-brand h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tabular-nums">
                  {metrics.familyMembers}
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  People in your household
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
