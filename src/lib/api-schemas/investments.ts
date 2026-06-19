import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

import { investmentPolicies } from "@/db/schema"

const moneyString = z.string().regex(/^-?\d+(\.\d{1,2})?$/)
const yieldString = z.string().regex(/^-?\d+(\.\d{1,2})?$/)

const investmentTypeEnum = z.enum([
  "stock",
  "cash",
  "bonds",
  "etf",
  "crypto",
  "mutual_fund",
  "reit"
])

const contributionFrequencyEnum = z.enum(["monthly", "custom"])

const booleanLike = z
  .union([
    z.boolean(),
    z.literal("true").transform(() => true),
    z.literal("false").transform(() => false)
  ])
  .pipe(z.boolean())

export const listInvestmentsQuerySchema = z.object({
  isActive: booleanLike.optional(),
  type: investmentTypeEnum.optional()
})
export type ListInvestmentsQuery = z.infer<typeof listInvestmentsQuerySchema>

// Field schemas derived from the investment_policies table — types and
// nullability flow from the columns; domain rules (money/yield format, type and
// frequency enums) layered per field. customMonths is a JSON-encoded text
// column, validated as an opaque string here and shaped by the form layer.
const investmentInsert = createInsertSchema(investmentPolicies, {
  name: (s) => s.min(1).max(255),
  type: investmentTypeEnum,
  currentCapital: moneyString,
  projectedYield: yieldString,
  contributionAmount: moneyString,
  contributionFrequency: contributionFrequencyEnum,
  customMonths: z.string().nullish()
})

export const createInvestmentBodySchema = investmentInsert
  .pick({
    name: true,
    type: true,
    currentCapital: true,
    projectedYield: true,
    contributionAmount: true,
    contributionFrequency: true,
    customMonths: true
  })
  .extend({ id: z.string().uuid().optional() })
export type CreateInvestmentBody = z.infer<typeof createInvestmentBodySchema>

export const updateInvestmentBodySchema = createInvestmentBodySchema
  .omit({ id: true })
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided"
  })
export type UpdateInvestmentBody = z.infer<typeof updateInvestmentBodySchema>
