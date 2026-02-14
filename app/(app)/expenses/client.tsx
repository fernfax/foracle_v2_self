"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { Receipt, TrendingUp, PieChart } from "lucide-react";
import { ExpenseList } from "@/components/expenses/expense-list";
import { MonthlyBalanceGraph } from "@/components/expenses/monthly-balance-graph";
import { ExpenseReports } from "@/components/expenses/expense-reports";

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
  accountForBonus: boolean | null;
  bonusGroups: string | null;
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

interface Investment {
  id: string;
  name: string;
  type: string;
  currentCapital: string;
  projectedYield: string;
  contributionAmount: string;
  contributionFrequency: string;
  customMonths: string | null;
  isActive: boolean | null;
}

interface ExpensesClientProps {
  initialExpenses: Expense[];
  initialIncomes: Income[];
  initialHoldings: CurrentHolding[];
  initialInvestments: Investment[];
}

export function ExpensesClient({ initialExpenses, initialIncomes, initialHoldings, initialInvestments }: ExpensesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "expenses");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync activeTab with URL search params when they change
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") || "expenses";
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/expenses?tab=${value}`, { scroll: false });
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">
          Profile
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Expenses</h1>
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
              { value: "expenses", label: "Expenses", icon: Receipt },
              { value: "graph", label: "Graph", icon: TrendingUp },
              { value: "reports", label: "Reports", icon: PieChart },
            ]}
            value={activeTab}
            onValueChange={handleTabChange}
          />

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsContent value="expenses" className="mt-4">
              <ExpenseList initialExpenses={initialExpenses} />
            </TabsContent>

            <TabsContent value="graph" className="mt-4">
              <MonthlyBalanceGraph incomes={initialIncomes} expenses={initialExpenses} holdings={initialHoldings} investments={initialInvestments} />
            </TabsContent>

            <TabsContent value="reports" className="mt-4">
              <ExpenseReports expenses={initialExpenses} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
