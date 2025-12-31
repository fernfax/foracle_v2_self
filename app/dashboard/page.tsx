import { auth } from "@clerk/nextjs/server";

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
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Goals
            </CardTitle>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950">
              <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
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
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950">
              <Users className="h-5 w-5 text-pink-600 dark:text-pink-400" />
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
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
          <CardDescription>
            Get started by adding your financial information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="group rounded-2xl border border-dashed border-border p-8 hover:border-foreground/30 hover:bg-muted/50 cursor-pointer transition-all duration-200">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted mb-4 group-hover:bg-muted/80 transition-colors">
                <DollarSign className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Add Income</h3>
              <p className="text-sm text-muted-foreground">
                Track your income sources
              </p>
            </div>
            <div className="group rounded-2xl border border-dashed border-border p-8 hover:border-foreground/30 hover:bg-muted/50 cursor-pointer transition-all duration-200">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted mb-4 group-hover:bg-muted/80 transition-colors">
                <Wallet className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Add Expense</h3>
              <p className="text-sm text-muted-foreground">
                Record your expenses
              </p>
            </div>
            <div className="group rounded-2xl border border-dashed border-border p-8 hover:border-foreground/30 hover:bg-muted/50 cursor-pointer transition-all duration-200">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted mb-4 group-hover:bg-muted/80 transition-colors">
                <Target className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Set a Goal</h3>
              <p className="text-sm text-muted-foreground">
                Define your financial goals
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
