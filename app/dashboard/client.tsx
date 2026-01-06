"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DollarSign,
  Wallet,
  Target,
  Users,
  LayoutDashboard,
  TrendingUp,
} from "lucide-react";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") || "overview";
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/dashboard?tab=${value}`, { scroll: false });
  };

  if (!mounted) {
    return <div className="h-[500px] animate-pulse bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">
          Home
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Your financial overview at a glance
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="h-auto p-0 bg-transparent border-b border-border rounded-none flex gap-0 justify-start">
          <TabsTrigger
            value="overview"
            className="relative flex items-center gap-2 py-2.5 px-4 rounded-t-lg border border-border transition-colors data-[state=active]:z-10 data-[state=active]:-mb-px data-[state=active]:border-t-2 data-[state=active]:border-t-[#5C98FF] data-[state=active]:border-b-white data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=inactive]:border-b-0 data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="projection"
            className="relative flex items-center gap-2 py-2.5 px-4 rounded-t-lg border border-border transition-colors data-[state=active]:z-10 data-[state=active]:-mb-px data-[state=active]:border-t-2 data-[state=active]:border-t-[#5C98FF] data-[state=active]:border-b-white data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=inactive]:border-b-0 data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Monthly Balance Projection</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="space-y-8">
            {/* Header with universal month toggle and metrics cards */}
            <DashboardHeader
              totalIncome={metrics.totalIncome}
              totalExpenses={metrics.totalExpenses}
              netSavings={metrics.netSavings}
            />

            {/* Secondary Metrics Grid */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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

            {/* Quick Actions */}
            <Card data-tour="quick-actions">
              <CardHeader>
                <CardTitle className="text-xl">Quick Actions</CardTitle>
                <CardDescription>
                  Get started by adding your financial information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Link href="/dashboard/user?tab=incomes" className="group rounded-2xl border border-dashed border-border p-8 hover:border-purple-300 hover:bg-purple-50/50 cursor-pointer transition-all duration-200">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 mb-4 group-hover:bg-purple-200 transition-colors">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold mb-1">Add Income</h3>
                    <p className="text-sm text-muted-foreground">
                      Track your income sources
                    </p>
                  </Link>
                  <Link href="/dashboard/user/expenses" className="group rounded-2xl border border-dashed border-border p-8 hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer transition-all duration-200">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 mb-4 group-hover:bg-emerald-200 transition-colors">
                      <Wallet className="h-6 w-6 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold mb-1">Add Expense</h3>
                    <p className="text-sm text-muted-foreground">
                      Record your expenses
                    </p>
                  </Link>
                  <Link href="/dashboard/goals" className="group rounded-2xl border border-dashed border-border p-8 hover:border-cyan-300 hover:bg-cyan-50/50 cursor-pointer transition-all duration-200">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-100 mb-4 group-hover:bg-cyan-200 transition-colors">
                      <Target className="h-6 w-6 text-cyan-600" />
                    </div>
                    <h3 className="font-semibold mb-1">Set a Goal</h3>
                    <p className="text-sm text-muted-foreground">
                      Define your financial goals
                    </p>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projection" className="mt-6">
          <MonthlyBalanceGraph incomes={incomes} expenses={expenses} holdings={holdings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
