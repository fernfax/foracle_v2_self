import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

import { policies } from "@/db/schema"

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => !isNaN(new Date(v).getTime()), { message: "Invalid date" })
const moneyString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/)
  .refine((v) => parseFloat(v) <= 9_999_999_999.99, {
    message: "Amount too large"
  })

const policyStatusEnum = z.enum(["active", "lapsed", "cancelled", "matured"])

const booleanLike = z
  .union([
    z.boolean(),
    z.literal("true").transform(() => true),
    z.literal("false").transform(() => false)
  ])
  .pipe(z.boolean())

export const listPoliciesQuerySchema = z.object({
  status: policyStatusEnum.optional(),
  isActive: booleanLike.optional(),
  policyType: z.string().optional(),
  familyMemberId: z.string().optional()
})
export type ListPoliciesQuery = z.infer<typeof listPoliciesQuerySchema>

// Field schemas derived from the policies table — types and nullability flow
// from the columns; domain rules (money/date format, status enum, age range)
// layered per field. A provided schema replaces the column verbatim, so each
// carries its own optionality (NOT NULL vs nullable). coverageOptions and
// customMonths are JSON-encoded text columns, validated as opaque strings here
// and shaped by the form layer.
const policyInsert = createInsertSchema(policies, {
  familyMemberId: z.string().nullish(),
  linkedExpenseId: z.string().nullish(),
  provider: (s) => s.min(1).max(255),
  planName: (s) => s.max(255).nullish(),
  policyNumber: z.string().nullish(),
  policyType: (s) => s.min(1).max(100),
  status: policyStatusEnum.optional(),
  startDate: isoDate,
  maturityDate: isoDate.nullish(),
  coverageUntilAge: z.number().int().min(0).max(150).nullish(),
  premiumAmount: moneyString,
  premiumAmountCPF: moneyString.nullish(),
  premiumFrequency: (s) => s.min(1).max(50),
  customMonths: z.string().nullish(),
  totalPremiumDuration: z.number().int().min(0).nullish(),
  coverageOptions: z.string().nullish(),
  cashValue: moneyString.nullish(),
  cashValueDate: isoDate.nullish(),
  description: z.string().nullish()
})

export const createPolicyBodySchema = policyInsert
  .pick({
    familyMemberId: true,
    linkedExpenseId: true,
    provider: true,
    planName: true,
    policyNumber: true,
    policyType: true,
    status: true,
    startDate: true,
    maturityDate: true,
    coverageUntilAge: true,
    premiumAmount: true,
    premiumAmountCPF: true,
    premiumFrequency: true,
    customMonths: true,
    totalPremiumDuration: true,
    coverageOptions: true,
    cashValue: true,
    cashValueDate: true,
    description: true
  })
  .extend({ id: z.string().uuid().optional() })
export type CreatePolicyBody = z.infer<typeof createPolicyBodySchema>

export const updatePolicyBodySchema = createPolicyBodySchema
  .omit({ id: true })
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided"
  })
export type UpdatePolicyBody = z.infer<typeof updatePolicyBodySchema>
