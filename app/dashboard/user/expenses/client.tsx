"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, TrendingUp } from "lucide-react";
import { ExpenseList } from "@/components/expenses/expense-list";
import { MonthlyBalanceGraph } from "@/components/expenses/monthly-balance-graph";

interface Expense {
  id: string;
  name: string;
  category: string;
  expenseCategory: string;
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string;
  endDate: string | null;
  description: string | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Income {
  id: string;
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string;
  endDate: string | null;
  incomeCategory: string;
  isActive: boolean | null;
  netTakeHome: string | null;
  subjectToCpf: boolean | null;
  futureIncomeChange: boolean | null;
  futureIncomeAmount: string | null;
  futureIncomeStartDate: string | null;
  futureIncomeEndDate: string | null;
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="graph" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Graph</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="mt-6">
            <ExpenseList initialExpenses={initialExpenses} />
          </TabsContent>

          <TabsContent value="graph" className="mt-6">
            <MonthlyBalanceGraph incomes={initialIncomes} expenses={initialExpenses} holdings={initialHoldings} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
