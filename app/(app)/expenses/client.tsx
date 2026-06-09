"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ExpenseList } from "@/components/expenses/expense-list";

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
  // When embedded inside another page (e.g. the User Homepage "Expenses" tab),
  // skip the standalone PageHeader and keep the sub-tabs on local state so we
  // don't fight the host page over the shared `?tab=` query param.
  embedded?: boolean;
}

export function ExpensesClient({ initialExpenses, embedded = false }: ExpensesClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Graph + Reports sub-tabs are temporarily removed — the Expenses tab is now
  // just the stat band + the expense table. (Sub-tabs can come back later.)
  return (
    <div className="space-y-4">
      {!embedded && <PageHeader title="Expenses" />}

      {!mounted ? (
        <div className="h-[500px] animate-pulse bg-muted rounded-lg" />
      ) : (
        <ExpenseList initialExpenses={initialExpenses} />
      )}
    </div>
  );
}
