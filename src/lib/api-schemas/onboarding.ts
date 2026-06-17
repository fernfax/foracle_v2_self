import { z } from "zod"

const moneyString = z.string().regex(/^-?\d+(\.\d{1,2})?$/)

export const createOnboardingExpensesBodySchema = z.object({
  categories: z.array(z.string().min(1).max(100)),
  percentageOfIncome: z.number().min(0).max(100),
  monthlyIncome: z.number().min(0),
  categoryAmounts: z.record(z.string(), moneyString).optional()
})
export type CreateOnboardingExpensesBody = z.infer<
  typeof createOnboardingExpensesBodySchema
>
