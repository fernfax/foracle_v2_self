import { z } from "zod";

// Schemas for /api/v1/daily-expenses.
//
// This file lives at lib/api-schemas/ for now. When the Phase A monorepo
// migration lands, it moves to packages/shared/src/schemas/ unchanged so the
// mobile client and the web server import the same source of truth.

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const listByMonth = z.object({
  year: z.coerce.number().int().min(1970).max(9999),
  month: z.coerce.number().int().min(1).max(12),
  startDate: z.undefined().optional(),
  endDate: z.undefined().optional(),
});

const listByRange = z.object({
  year: z.undefined().optional(),
  month: z.undefined().optional(),
  startDate: isoDate,
  endDate: isoDate,
});

export const listDailyExpensesQuerySchema = z.union([listByMonth, listByRange]);
export type ListDailyExpensesQuery = z.infer<typeof listDailyExpensesQuerySchema>;

export type ResolvedDateRange = { startDate: string; endDate: string };

export function resolveDateRange(query: ListDailyExpensesQuery): ResolvedDateRange {
  if (query.startDate && query.endDate) {
    return { startDate: query.startDate, endDate: query.endDate };
  }
  const year = query.year!;
  const month = query.month!;
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

// Amount is sent as a string on the wire to preserve decimal precision; the
// regex accepts up to 2 decimal places. Idempotency key (id) is optional but
// recommended for any client that might retry — the offline queue REQUIRES it.
const moneyString = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, "Amount must be a decimal with up to 2 places");

const rateString = z
  .string()
  .regex(/^-?\d+(\.\d{1,6})?$/, "Exchange rate must be a decimal with up to 6 places");

export const createDailyExpenseBodySchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().nullish(),
  categoryName: z.string().min(1).max(100),
  subcategoryId: z.string().nullish(),
  subcategoryName: z.string().max(100).nullish(),
  amount: moneyString,
  note: z.string().nullish(),
  date: isoDate,
  originalCurrency: z.string().length(3).nullish(),
  originalAmount: moneyString.nullish(),
  exchangeRate: rateString.nullish(),
});
export type CreateDailyExpenseBody = z.infer<typeof createDailyExpenseBodySchema>;

export const bulkCreateDailyExpensesBodySchema = z.object({
  ops: z.array(createDailyExpenseBodySchema).min(1).max(100),
});
export type BulkCreateDailyExpensesBody = z.infer<typeof bulkCreateDailyExpensesBodySchema>;

// Patch is all-optional. At least one field is required so we don't accept
// empty PATCH bodies that do nothing.
export const updateDailyExpenseBodySchema = z
  .object({
    categoryId: z.string().nullish(),
    categoryName: z.string().min(1).max(100).optional(),
    subcategoryId: z.string().nullish(),
    subcategoryName: z.string().max(100).nullish(),
    amount: moneyString.optional(),
    note: z.string().nullish(),
    date: isoDate.optional(),
    originalCurrency: z.string().length(3).nullish(),
    originalAmount: moneyString.nullish(),
    exchangeRate: rateString.nullish(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdateDailyExpenseBody = z.infer<typeof updateDailyExpenseBodySchema>;

export const dailyExpenseResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  familyId: z.string().nullable(),
  categoryId: z.string().nullable(),
  categoryName: z.string(),
  subcategoryId: z.string().nullable(),
  subcategoryName: z.string().nullable(),
  amount: z.string(),
  note: z.string().nullable(),
  date: z.string(),
  originalCurrency: z.string().nullable(),
  originalAmount: z.string().nullable(),
  exchangeRate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DailyExpenseResponse = z.infer<typeof dailyExpenseResponseSchema>;
