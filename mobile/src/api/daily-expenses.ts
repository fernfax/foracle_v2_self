import type { ApiClient } from "@/src/lib/api-client";

// Mirrors the daily_expenses row shape returned by the v1 API. Decimals are
// kept as strings on the wire — never coerce silently to number, the
// currency utilities format them.
export type DailyExpense = {
  id: string;
  userId: string;
  familyId: string | null;
  categoryId: string | null;
  categoryName: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
  amount: string;
  note: string | null;
  date: string;
  originalCurrency: string | null;
  originalAmount: string | null;
  exchangeRate: string | null;
  createdAt: string;
  updatedAt: string;
};

export function listDailyExpenses(
  client: ApiClient,
  opts: { year: number; month: number }
): Promise<DailyExpense[]> {
  const qs = new URLSearchParams({
    year: String(opts.year),
    month: String(opts.month),
  }).toString();
  return client.get<DailyExpense[]>(`/api/v1/daily-expenses?${qs}`);
}
