import type { ApiClient } from "@/src/lib/api-client";

export type BudgetSummary = {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentUsed: number;
  dailyBudget: number;
  expectedSpentByToday: number;
  pacingStatus: "under" | "on-track" | "over";
  daysInMonth: number;
  currentDay: number;
};

export type CategoryBudgetRow = {
  categoryId: string | null;
  categoryName: string;
  icon: string | null;
  monthlyBudget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
};

export type BudgetForMonth = {
  year: number;
  month: number;
  summary: BudgetSummary;
  categories: CategoryBudgetRow[];
};

export function getBudgetForMonth(
  client: ApiClient,
  opts: { year: number; month: number }
): Promise<BudgetForMonth> {
  const qs = new URLSearchParams({
    year: String(opts.year),
    month: String(opts.month),
  }).toString();
  return client.get<BudgetForMonth>(`/api/v1/budget?${qs}`);
}
