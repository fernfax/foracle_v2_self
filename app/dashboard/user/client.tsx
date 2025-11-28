"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  name: string;
  category: string;
  amount: string;
  frequency: string;
  subjectToCpf: boolean | null;
  accountForBonus: boolean | null;
  bonusGroups: string | null;
  employeeCpfContribution: string | null;
  employerCpfContribution: string | null;
  netTakeHome: string | null;
  description: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean | null;
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

interface UserHomepageClientProps {
  initialIncomes: Income[];
  initialFamilyMembers: FamilyMember[];
  initialCpfData: CpfByFamilyMember[];
  initialCurrentHoldings: CurrentHolding[];
  initialPolicies: Policy[];
}

export function UserHomepageClient({ initialIncomes, initialFamilyMembers, initialCpfData, initialCurrentHoldings, initialPolicies }: UserHomepageClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        <Tabs defaultValue="family" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="family" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Family</span>
          </TabsTrigger>
          <TabsTrigger value="incomes" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span>Incomes</span>
          </TabsTrigger>
          <TabsTrigger value="cpf" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>CPF</span>
          </TabsTrigger>
          <TabsTrigger value="current" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span>Holdings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="family" className="mt-6">
          <FamilyMemberList
            initialMembers={initialFamilyMembers}
            incomes={initialIncomes}
            cpfData={initialCpfData}
            holdings={initialCurrentHoldings}
            policies={initialPolicies}
          />
        </TabsContent>

        <TabsContent value="incomes" className="mt-6">
          <IncomeList initialIncomes={initialIncomes} />
        </TabsContent>

        <TabsContent value="cpf" className="mt-6">
          <CpfList initialCpfData={initialCpfData} />
        </TabsContent>

        <TabsContent value="current" className="mt-6">
          <CurrentHoldingList initialHoldings={initialCurrentHoldings} />
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}
