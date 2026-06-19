import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

import { expenses } from "@/db/schema"

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

// Field schemas derived from the expenses table — types and nullability flow
// from the columns; domain rules (money/date format, frequency and category
// enums) layered per field. The linked* columns are server-set when an expense
// is auto-generated from a policy/property/vehicle/goal, so they are not part of
// the user-supplied create/update bodies. customMonths is a JSON-encoded text
// column, validated as an opaque string here and shaped by the form layer.
const expenseInsert = createInsertSchema(expenses, {
  name: (s) => s.min(1).max(255),
  category: (s) => s.min(1).max(100),
  expenseCategory: z.enum(ALLOWED_EXPENSE_CATEGORIES).optional(),
  amount: moneyString,
  frequency: z.enum(ALLOWED_FREQUENCIES),
  customMonths: z.string().nullish(),
  startDate: isoDate.nullish(),
  endDate: isoDate.nullish(),
  description: z.string().nullish(),
  trackedInBudget: z.boolean().optional()
})

export const createExpenseBodySchema = expenseInsert
  .pick({
    name: true,
    category: true,
    expenseCategory: true,
    amount: true,
    frequency: true,
    customMonths: true,
    startDate: true,
    endDate: true,
    description: true,
    trackedInBudget: true
  })
  .extend({ id: z.string().uuid().optional() })
export type CreateExpenseBody = z.infer<typeof createExpenseBodySchema>

export const updateExpenseBodySchema = createExpenseBodySchema
  .omit({ id: true })
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided"
  })
export type UpdateExpenseBody = z.infer<typeof updateExpenseBodySchema>

export const deleteExpenseQuerySchema = z.object({
  hard: booleanLike.optional()
})
