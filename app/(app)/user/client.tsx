"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, Users, Building2, Briefcase } from "lucide-react";
import { IncomeList } from "@/components/income/income-list";
import { FamilyMemberList } from "@/components/family-members/family-member-list";
import { CpfList } from "@/components/cpf/cpf-list";
import { CpfProjectionGraph } from "@/components/cpf/cpf-projection-graph";
import { CurrentHoldingList } from "@/components/current-holdings/current-holding-list";
import { CpfByFamilyMember } from "@/lib/actions/cpf";
import { CurrentHolding } from "@/lib/actions/current-holdings";

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
  initialFamilyMembers: FamilyMember[];
  initialCpfData: CpfByFamilyMember[];
  initialCurrentHoldings: CurrentHolding[];
  initialPolicies: Policy[];
  initialPropertyAssets: PropertyAssetForCpf[];
}

export function UserHomepageClient({ initialIncomes, initialFamilyMembers, initialCpfData, initialCurrentHoldings, initialPolicies, initialPropertyAssets }: UserHomepageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "family");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync activeTab with URL search params when they change
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") || "family";
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/user?tab=${value}`, { scroll: false });
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">
          Profile
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">User Homepage</h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal financial information
        </p>
      </div>

      {!mounted ? (
        <div className="h-[500px] animate-pulse bg-muted rounded-lg" />
      ) : (
        <>
        <SlidingTabs
          tabs={[
            { value: "family", label: "Family", icon: Users },
            { value: "incomes", label: "Incomes", icon: DollarSign },
            { value: "cpf", label: "CPF", icon: Building2 },
            { value: "current", label: "Holdings", icon: Briefcase },
          ]}
          value={activeTab}
          onValueChange={handleTabChange}
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsContent value="family" className="mt-4">
          <FamilyMemberList
            initialMembers={initialFamilyMembers}
            incomes={initialIncomes}
            cpfData={initialCpfData}
            holdings={initialCurrentHoldings}
            policies={initialPolicies}
          />
        </TabsContent>

        <TabsContent value="incomes" className="mt-4">
          <IncomeList initialIncomes={initialIncomes} />
        </TabsContent>

        <TabsContent value="cpf" className="mt-4">
          <CpfList initialCpfData={initialCpfData} />
          <div className="mt-6">
            <CpfProjectionGraph cpfData={initialCpfData} incomes={initialIncomes} propertyAssets={initialPropertyAssets} />
          </div>
        </TabsContent>

        <TabsContent value="current" className="mt-4">
          <CurrentHoldingList initialHoldings={initialCurrentHoldings} />
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  );
}
