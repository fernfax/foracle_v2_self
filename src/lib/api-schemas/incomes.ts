import { z } from "zod"

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

// Beta taxonomy: past / current / future. The action layer still receives the
// legacy "current-recurring" / "future-recurring" values from the existing UI
// and normalizes them. For the v1 API we expose only the new taxonomy.
const incomeCategoryEnum = z.enum(["past", "current", "future"])

// Amount and CPF fields are sent as decimal strings on the wire to preserve
// precision (Drizzle returns them as strings; never quietly coerce).
export const createIncomeBodySchema = z.object({
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  incomeCategory: incomeCategoryEnum.optional(),
  amount: positiveMoneyString,
  startDate: isoDate,
  endDate: isoDate.nullish(),
  subjectToCpf: z.boolean(),
  accountForBonus: z.boolean().optional(),
  bonusGroups: z.string().nullish(),
  description: z.string().nullish(),
  familyMemberId: z.string().nullish(),
  // Optional override of the family member's age for CPF computation. If
  // omitted, the service derives age from the family member's date_of_birth.
  familyMemberAge: z.number().int().min(0).max(150).optional(),
  pastIncomeHistory: z.string().nullish(),
  futureMilestones: z.string().nullish(),
  accountForFutureChange: z.boolean().optional(),
  // CPF account allocations are user-provided (optional). Server auto-computes
  // employee/employer contributions + net take-home from subjectToCpf + age.
  cpfOrdinaryAccount: moneyString.nullish(),
  cpfSpecialAccount: moneyString.nullish(),
  cpfMedisaveAccount: moneyString.nullish()
})
export type CreateIncomeBody = z.infer<typeof createIncomeBodySchema>

export const updateIncomeBodySchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    category: z.string().min(1).max(100).optional(),
    incomeCategory: incomeCategoryEnum.optional(),
    amount: positiveMoneyString.optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.nullish(),
    subjectToCpf: z.boolean().optional(),
    accountForBonus: z.boolean().optional(),
    bonusGroups: z.string().nullish(),
    description: z.string().nullish(),
    isActive: z.boolean().optional(),
    familyMemberId: z.string().nullish(),
    familyMemberAge: z.number().int().min(0).max(150).optional(),
    pastIncomeHistory: z.string().nullish(),
    futureMilestones: z.string().nullish(),
    accountForFutureChange: z.boolean().optional(),
    cpfOrdinaryAccount: moneyString.nullish(),
    cpfSpecialAccount: moneyString.nullish(),
    cpfMedisaveAccount: moneyString.nullish()
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided"
  })
export type UpdateIncomeBody = z.infer<typeof updateIncomeBodySchema>
