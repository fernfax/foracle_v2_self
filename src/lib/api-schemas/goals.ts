import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

import { goals } from "@/db/schema"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const moneyString = z.string().regex(/^-?\d+(\.\d{1,2})?$/)
const goalTypeEnum = z.enum(["primary", "secondary"])

const booleanLike = z
  .union([
    z.boolean(),
    z.literal("true").transform(() => true),
    z.literal("false").transform(() => false)
  ])
  .pipe(z.boolean())

export const listGoalsQuerySchema = z.object({
  isActive: booleanLike.optional(),
  isAchieved: booleanLike.optional(),
  goalType: goalTypeEnum.optional()
})
export type ListGoalsQuery = z.infer<typeof listGoalsQuerySchema>

// Field schemas derived from the goals table — column TYPES (the decimals are
// strings, the date is a string) come from the schema, so a column change flows
// through. Domain rules (money/date format, goal-type enum) are layered per
// field.
// A provided schema replaces the column's schema verbatim (including
// optionality), so each carries the table's nullability: targetAmount/
// targetDate are NOT NULL (required); currentAmountSaved has a default
// (optional); monthlyContribution/description are nullable (nullish).
const goalInsert = createInsertSchema(goals, {
  goalName: (s) => s.min(1).max(255),
  goalType: goalTypeEnum,
  targetAmount: moneyString,
  targetDate: isoDate,
  currentAmountSaved: moneyString.optional(),
  monthlyContribution: moneyString.nullish(),
  description: z.string().nullish()
})

// User-supplied table fields + the two form-only extras (addToExpenditures
// drives a linked Savings expense; expenseName names it). Server-managed
// columns (id, userId, familyId, linkedExpenseId, isAchieved, isActive,
// timestamps) are never accepted from the client.
export const createGoalBodySchema = goalInsert
  .pick({
    goalName: true,
    goalType: true,
    targetAmount: true,
    targetDate: true,
    currentAmountSaved: true,
    monthlyContribution: true,
    description: true
  })
  .extend({
    addToExpenditures: z.boolean().optional(),
    expenseName: z.string().max(255).nullish()
  })
export type CreateGoalBody = z.infer<typeof createGoalBodySchema>

export const updateGoalBodySchema = createGoalBodySchema
  .partial()
  .extend({
    isAchieved: z.boolean().optional(),
    isActive: z.boolean().optional()
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided"
  })
export type UpdateGoalBody = z.infer<typeof updateGoalBodySchema>
