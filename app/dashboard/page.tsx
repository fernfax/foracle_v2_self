import { auth } from "@clerk/nextjs/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, Wallet, Target, Users } from "lucide-react";
import { getDashboardMetrics } from "@/lib/actions/user";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Fetch user-specific metrics with data isolation
  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your financial health.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Income */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.totalIncome.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Monthly recurring income
            </p>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.totalExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Monthly recurring expenses
            </p>
          </CardContent>
        </Card>

        {/* Net Savings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.netSavings.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Income minus expenses
            </p>
          </CardContent>
        </Card>

        {/* Total Assets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.totalAssets.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Current value of all assets
            </p>
          </CardContent>
        </Card>

        {/* Active Goals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeGoals}</div>
            <p className="text-xs text-muted-foreground">
              Financial goals in progress
            </p>
          </CardContent>
        </Card>

        {/* Family Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Family Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.familyMembers}</div>
            <p className="text-xs text-muted-foreground">
              People in your household
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get started by adding your financial information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors">
              <DollarSign className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">Add Income</h3>
              <p className="text-sm text-muted-foreground">
                Track your income sources
              </p>
            </div>
            <div className="rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors">
              <Wallet className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">Add Expense</h3>
              <p className="text-sm text-muted-foreground">
                Record your expenses
              </p>
            </div>
            <div className="rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors">
              <Target className="h-8 w-8 text-primary mb-2" />
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
