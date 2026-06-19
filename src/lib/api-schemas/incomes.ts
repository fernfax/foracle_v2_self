import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

import { incomes } from "@/db/schema"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
// Non-negative decimal string (the leading "-?" was a bug — it accepted
// negative income/CPF amounts). CPF account balances may legitimately be "0".
const moneyString = z.string().regex(/^\d+(\.\d{1,2})?$/)
// Income amount must be strictly positive — "0", "-5", "abc", "" all rejected.
const positiveMoneyString = moneyString.refine(
  (s) => {
    const n = Number(s)
    return Number.isFinite(n) && n > 0
  },
  { message: "Amount must be greater than 0" }
)

// Income taxonomy: past / current / future. The action layer still receives the
// legacy "current-recurring" / "future-recurring" values from the existing UI
// and normalizes them. For the v1 API we expose only the new taxonomy.
const incomeCategoryEnum = z.enum(["past", "current", "future"])

// Field schemas derived from the incomes table — types and nullability flow from
// the columns; domain rules (money/date format, income-category enum) layered per
// field. subjectToCpf is required on create even though the column is defaulted.
// Amount and CPF fields are decimal strings on the wire to preserve precision
// (Drizzle returns them as strings; never quietly coerce).
const incomeInsert = createInsertSchema(incomes, {
  name: (s) => s.min(1).max(255),
  category: (s) => s.min(1).max(100),
  incomeCategory: incomeCategoryEnum.optional(),
  amount: positiveMoneyString,
  startDate: isoDate,
  endDate: isoDate.nullish(),
  subjectToCpf: z.boolean(),
  accountForBonus: z.boolean().optional(),
  bonusGroups: z.string().nullish(),
  description: z.string().nullish(),
  familyMemberId: z.string().nullish(),
  pastIncomeHistory: z.string().nullish(),
  futureMilestones: z.string().nullish(),
  accountForFutureChange: z.boolean().optional(),
  cpfOrdinaryAccount: moneyString.nullish(),
  cpfSpecialAccount: moneyString.nullish(),
  cpfMedisaveAccount: moneyString.nullish()
})

export const createIncomeBodySchema = incomeInsert
  .pick({
    name: true,
    category: true,
    incomeCategory: true,
    amount: true,
    startDate: true,
    endDate: true,
    subjectToCpf: true,
    accountForBonus: true,
    bonusGroups: true,
    description: true,
    familyMemberId: true,
    pastIncomeHistory: true,
    futureMilestones: true,
    accountForFutureChange: true,
    cpfOrdinaryAccount: true,
    cpfSpecialAccount: true,
    cpfMedisaveAccount: true
  })
  .extend({
    // Optional override of the family member's age for CPF computation (not a
    // column). If omitted, the service derives age from date_of_birth.
    familyMemberAge: z.number().int().min(0).max(150).optional()
  })
export type CreateIncomeBody = z.infer<typeof createIncomeBodySchema>

export const updateIncomeBodySchema = createIncomeBodySchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided"
  })
export type UpdateIncomeBody = z.infer<typeof updateIncomeBodySchema>
