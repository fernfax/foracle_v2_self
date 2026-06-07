"use client";

import { useState, useEffect, type ComponentProps } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, Building2, Briefcase, Sparkles, Receipt } from "lucide-react";
import { IncomeList } from "@/components/income/income-list";
import { IncomesBetaView } from "@/components/income/incomes-beta/incomes-beta-view";
import { ExpensesClient } from "@/app/(app)/expenses/client";
import { FamilyMemberList } from "@/components/family-members/family-member-list";
import { CpfList } from "@/components/cpf/cpf-list";
import { CpfProjectionGraph } from "@/components/cpf/cpf-projection-graph";
import { CurrentHoldingList } from "@/components/current-holdings/current-holding-list";
import { CpfByFamilyMember } from "@/lib/actions/cpf";
import { CurrentHolding } from "@/lib/actions/current-holdings";
import { cn } from "@/lib/utils";
import { HouseholdContextStrip } from "@/components/ui/household-context-strip";
import type { HouseholdSummary } from "@/lib/household-summary";

type Policy = {
  id: string;
  userId: string;
  familyMemberId: string | null;
  linkedExpenseId: string | null;
  provider: string;
  policyNumber: string | null;
  policyType: string;
  status: string | null;
  startDate: string;
  maturityDate: string | null;
  coverageUntilAge: number | null;
  premiumAmount: string;
  premiumFrequency: string;
  totalPremiumDuration: number | null;
  coverageOptions: string | null;
  description: string | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

type Income = {
  id: string;
  userId: string;
  name: string;
  category: string;
  incomeCategory: string | null;
  amount: string;
  frequency: string;
  customMonths: string | null;
  subjectToCpf: boolean | null;
  accountForBonus: boolean | null;
  bonusGroups: string | null;
  employeeCpfContribution: string | null;
  employerCpfContribution: string | null;
  netTakeHome: string | null;
  cpfOrdinaryAccount: string | null;
  cpfSpecialAccount: string | null;
  cpfMedisaveAccount: string | null;
  description: string | null;
  startDate: string;
  endDate: string | null;
  pastIncomeHistory: string | null;
  futureMilestones: string | null;
  accountForFutureChange: boolean | null;
  isActive: boolean | null;
  familyMemberId: string | null;
  familyMember: {
    id: string;
    name: string;
    relationship: string | null;
    dateOfBirth: string | null;
    isContributing: boolean | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

type FamilyMember = {
  id: string;
  name: string;
  relationship: string | null;
  dateOfBirth: string | null;
  isContributing: boolean | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PropertyAssetForCpf = {
  id: string;
  monthlyLoanPayment: string;
  outstandingLoan: string;
  paidByCpf: boolean | null;
  isActive: boolean | null;
};

interface UserHomepageClientProps {
  initialIncomes: Income[];
  // The Beta view is wired to its own `incomes_beta` table. Empty until the
  // user creates rows via the new beta CRUD flow.
  initialIncomesBeta: Income[];
  initialFamilyMembers: FamilyMember[];
  initialCpfData: CpfByFamilyMember[];
  initialCurrentHoldings: CurrentHolding[];
  initialPolicies: Policy[];
  initialPropertyAssets: PropertyAssetForCpf[];
  // Borrow the exact prop shapes ExpensesClient expects so the embedded
  // Expenses tab type-checks without re-declaring the Expense/Investment types.
  initialExpenses: ComponentProps<typeof ExpensesClient>["initialExpenses"];
  initialInvestments: ComponentProps<typeof ExpensesClient>["initialInvestments"];
  householdSummary: HouseholdSummary;
}

export function UserHomepageClient({ initialIncomes, initialIncomesBeta, initialFamilyMembers, initialCpfData, initialCurrentHoldings, initialPolicies, initialPropertyAssets, initialExpenses, initialInvestments, householdSummary }: UserHomepageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab") || "family";
    return tab === "current" ? "holdings" : tab;
  });
  // "standard" = the Timeline Studio (formerly "beta") — now the default.
  // "legacy" = the old income table view. Opt into it with ?view=legacy.
  const [incomeView, setIncomeView] = useState<"legacy" | "standard">(
    searchParams.get("view") === "legacy" ? "legacy" : "standard"
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync activeTab + incomeView with URL search params when they change
  useEffect(() => {
    // "current" was the legacy slug for the Holdings tab — redirect to "holdings".
    const raw = searchParams.get("tab") || "family";
    const tabFromUrl = raw === "current" ? "holdings" : raw;
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
    const viewFromUrl = searchParams.get("view") === "legacy" ? "legacy" : "standard";
    if (viewFromUrl !== incomeView) {
      setIncomeView(viewFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Switching tabs always returns to the standard view
    router.push(`/user?tab=${value}`, { scroll: false });
  };

  const handleToggleIncomeView = () => {
    const next = incomeView === "legacy" ? "standard" : "legacy";
    setIncomeView(next);
    const params = new URLSearchParams();
    params.set("tab", "incomes");
    if (next === "legacy") params.set("view", "legacy");
    router.push(`/user?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="User Homepage"
        tabs={
          mounted ? (
            <div className="flex items-center justify-between gap-4">
              <SlidingTabs
                tabs={[
                  { value: "family", label: "Family", icon: Users },
                  { value: "incomes", label: "Incomes", icon: DollarSign },
                  { value: "expenses", label: "Expenses", icon: Receipt },
                  { value: "cpf", label: "CPF", icon: Building2 },
                  { value: "holdings", label: "Holdings", icon: Briefcase },
                ]}
                value={activeTab}
                onValueChange={handleTabChange}
              />
              {activeTab === "incomes" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleIncomeView}
                  className={cn(
                    "shrink-0 h-8 px-3 rounded-full text-xs font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-sm",
                    incomeView === "legacy"
                      ? "border-brand-terracotta bg-brand-terracotta text-white hover:bg-brand-terracotta/90 hover:border-brand-terracotta"
                      : "border-brand-terracotta/40 bg-brand-terracotta/10 text-brand-terracotta hover:bg-brand-terracotta/15 hover:border-brand-terracotta/60"
                  )}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  {incomeView === "legacy" ? "Standard View" : "Legacy"}
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />

      {!mounted ? (
        <div className="h-[500px] animate-pulse bg-muted rounded-lg" />
      ) : (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsContent value="family" className="mt-4">
          <HouseholdContextStrip summary={householdSummary} tab="family" />
          <FamilyMemberList
            initialMembers={initialFamilyMembers}
            incomes={initialIncomesBeta}
            cpfData={initialCpfData}
            holdings={initialCurrentHoldings}
            policies={initialPolicies}
          />
        </TabsContent>

        <TabsContent value="incomes" className="mt-4">
          <HouseholdContextStrip summary={householdSummary} tab="incomes" />
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
          <HouseholdContextStrip summary={householdSummary} tab="expenses" />
          <ExpensesClient
            embedded
            initialExpenses={initialExpenses}
            initialIncomes={initialIncomesBeta}
            initialHoldings={initialCurrentHoldings}
            initialInvestments={initialInvestments}
          />
        </TabsContent>

        <TabsContent value="cpf" className="mt-4">
          <HouseholdContextStrip summary={householdSummary} tab="cpf" />
          <CpfList initialCpfData={initialCpfData} />
          <div className="mt-6">
            <CpfProjectionGraph cpfData={initialCpfData} incomes={initialIncomesBeta} propertyAssets={initialPropertyAssets} />
          </div>
        </TabsContent>

        <TabsContent value="holdings" className="mt-4">
          <HouseholdContextStrip summary={householdSummary} tab="holdings" />
          <CurrentHoldingList initialHoldings={initialCurrentHoldings} />
        </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
