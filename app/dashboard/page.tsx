import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

export const dynamic = 'force-dynamic';

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
} from "lucide-react";
import { getDashboardMetrics } from "@/lib/actions/user";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { TotalAssetsCard } from "@/components/dashboard/total-assets-card";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Fetch user-specific metrics with data isolation
  const metrics = await getDashboardMetrics();

  return (
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
  );
}
