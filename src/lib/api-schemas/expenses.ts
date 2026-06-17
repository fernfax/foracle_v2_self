import { z } from "zod"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const moneyString = z.string().regex(/^-?\d+(\.\d{1,2})?$/)

const ALLOWED_FREQUENCIES = [
  "monthly",
  "yearly",
  "one-time",
  "weekly",
  "bi-weekly",
  "custom"
] as const

const ALLOWED_EXPENSE_CATEGORIES = [
  "current-recurring",
  "future-recurring",
  "temporary",
  "one-off"
] as const

const booleanLike = z
  .union([
    z.boolean(),
    z.literal("true").transform(() => true),
    z.literal("false").transform(() => false)
  ])
  .pipe(z.boolean())

export const listExpensesQuerySchema = z.object({
  isActive: booleanLike.optional(),
  category: z.string().optional()
})
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>

export const createExpenseBodySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  expenseCategory: z.enum(ALLOWED_EXPENSE_CATEGORIES).optional(),
  amount: moneyString,
  frequency: z.enum(ALLOWED_FREQUENCIES),
  customMonths: z.string().nullish(),
  startDate: isoDate.nullish(),
  endDate: isoDate.nullish(),
  description: z.string().nullish(),
  trackedInBudget: z.boolean().optional()
})
export type CreateExpenseBody = z.infer<typeof createExpenseBodySchema>

export const updateExpenseBodySchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    category: z.string().min(1).max(100).optional(),
    expenseCategory: z.enum(ALLOWED_EXPENSE_CATEGORIES).optional(),
    amount: moneyString.optional(),
    frequency: z.enum(ALLOWED_FREQUENCIES).optional(),
    customMonths: z.string().nullish(),
    startDate: isoDate.nullish(),
    endDate: isoDate.nullish(),
    description: z.string().nullish(),
    isActive: z.boolean().optional(),
    trackedInBudget: z.boolean().optional()
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided"
  })
export type UpdateExpenseBody = z.infer<typeof updateExpenseBodySchema>

export const deleteExpenseQuerySchema = z.object({
  hard: booleanLike.optional()
})
