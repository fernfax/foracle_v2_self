"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Target, Users } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { TotalAssetsCard } from "@/components/dashboard/total-assets-card";
import { MonthlyBalanceGraph } from "@/components/expenses/monthly-balance-graph";

interface DashboardMetrics {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  totalAssets: number;
  activeGoals: number;
  familyMembers: number;
}

interface Income {
  id: string;
  name: string;
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string;
  endDate: string | null;
  incomeCategory: string | null;
  isActive: boolean | null;
  netTakeHome: string | null;
  subjectToCpf: boolean | null;
  futureMilestones: string | null;
  accountForFutureChange: boolean | null;
}

interface Expense {
  id: string;
  userId: string;
  linkedPolicyId: string | null;
  name: string;
  category: string;
  expenseCategory: string | null;
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CurrentHolding {
  id: string;
  userId: string;
  familyMemberId: string | null;
  bankName: string;
  holdingAmount: string;
  createdAt: Date;
  updatedAt: Date;
  familyMemberName?: string | null;
}

interface DashboardClientProps {
  metrics: DashboardMetrics;
  incomes: Income[];
  expenses: Expense[];
  holdings: CurrentHolding[];
}

export function DashboardClient({ metrics, incomes, expenses, holdings }: DashboardClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-[500px] animate-pulse bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-8">
      {/* Header with universal month toggle and metrics cards */}
      <DashboardHeader
        totalIncome={metrics.totalIncome}
        totalExpenses={metrics.totalExpenses}
        netSavings={metrics.netSavings}
      />

      {/* Secondary Metrics Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" data-tour="secondary-metrics">
        {/* Total Assets */}
        <TotalAssetsCard totalAssets={metrics.totalAssets} />

        {/* Active Goals */}
        <Card className="relative overflow-hidden" data-tour="goals-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Goals
            </CardTitle>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-100">
              <Target className="h-5 w-5 text-cyan-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {metrics.activeGoals}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Financial goals in progress
            </p>
          </CardContent>
        </Card>

        {/* Family Members */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Family Members
            </CardTitle>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {metrics.familyMembers}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              People in your household
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Balance Projection */}
      <MonthlyBalanceGraph incomes={incomes} expenses={expenses} holdings={holdings} />
    </div>
  );
}
