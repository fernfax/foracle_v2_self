"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface ExpensesClientProps {
  initialExpenses: Expense[];
  initialIncomes: Income[];
  initialHoldings: CurrentHolding[];
}

export function ExpensesClient({ initialExpenses, initialIncomes, initialHoldings }: ExpensesClientProps) {
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
    router.push(`/dashboard/user/expenses?tab=${value}`, { scroll: false });
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
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="h-auto flex gap-2 overflow-x-auto bg-transparent">
            <TabsTrigger
              value="expenses"
              className="group flex-1 min-w-[120px] flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-white data-[state=inactive]:hover:shadow-md"
            >
              <div className="p-1.5 rounded-md transition-colors bg-slate-100 group-data-[state=active]:bg-white/20 group-hover:bg-indigo-50 group-data-[state=active]:group-hover:bg-white/20">
                <Receipt className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm">Expenses</span>
            </TabsTrigger>
            <TabsTrigger
              value="graph"
              className="group flex-1 min-w-[120px] flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-white data-[state=inactive]:hover:shadow-md"
            >
              <div className="p-1.5 rounded-md transition-colors bg-slate-100 group-data-[state=active]:bg-white/20 group-hover:bg-indigo-50 group-data-[state=active]:group-hover:bg-white/20">
                <TrendingUp className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm">Graph</span>
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="group flex-1 min-w-[120px] flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-white data-[state=inactive]:hover:shadow-md"
            >
              <div className="p-1.5 rounded-md transition-colors bg-slate-100 group-data-[state=active]:bg-white/20 group-hover:bg-indigo-50 group-data-[state=active]:group-hover:bg-white/20">
                <PieChart className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm">Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="mt-6">
            <ExpenseList initialExpenses={initialExpenses} />
          </TabsContent>

          <TabsContent value="graph" className="mt-6">
            <MonthlyBalanceGraph incomes={initialIncomes} expenses={initialExpenses} holdings={initialHoldings} />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <ExpenseReports expenses={initialExpenses} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
