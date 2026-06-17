import { z } from "zod"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const moneyString = z.string().regex(/^-?\d+(\.\d{1,2})?$/)
const rateString = z.string().regex(/^-?\d+(\.\d{1,2})?$/)

const booleanLike = z
  .union([
    z.boolean(),
    z.literal("true").transform(() => true),
    z.literal("false").transform(() => false)
  ])
  .pipe(z.boolean())

export const listPropertyAssetsQuerySchema = z.object({
  isActive: booleanLike.optional()
})
export type ListPropertyAssetsQuery = z.infer<
  typeof listPropertyAssetsQuerySchema
>

export const createPropertyAssetBodySchema = z.object({
  id: z.string().uuid().optional(),
  propertyName: z.string().min(1).max(255),
  purchaseDate: isoDate,
  originalPurchasePrice: moneyString,
  loanAmountTaken: moneyString.nullish(),
  outstandingLoan: moneyString,
  monthlyLoanPayment: moneyString,
  interestRate: rateString,
  principalCpfWithdrawn: moneyString.nullish(),
  housingGrantTaken: moneyString.nullish(),
  accruedInterestToDate: moneyString.nullish(),
  paidByCpf: z.boolean().optional(),
  // When true, the service creates a linked recurring "Housing" expense.
  addToExpenditures: z.boolean().optional(),
  expenseName: z.string().max(255).nullish(),
  expenditureAmount: moneyString.nullish()
})
export type CreatePropertyAssetBody = z.infer<
  typeof createPropertyAssetBodySchema
>

export const updatePropertyAssetBodySchema = z
  .object({
    propertyName: z.string().min(1).max(255).optional(),
    purchaseDate: isoDate.optional(),
    originalPurchasePrice: moneyString.optional(),
    loanAmountTaken: moneyString.nullish(),
    outstandingLoan: moneyString.optional(),
    monthlyLoanPayment: moneyString.optional(),
    interestRate: rateString.optional(),
    principalCpfWithdrawn: moneyString.nullish(),
    housingGrantTaken: moneyString.nullish(),
    accruedInterestToDate: moneyString.nullish(),
    paidByCpf: z.boolean().optional(),
    isActive: z.boolean().optional(),
    addToExpenditures: z.boolean().optional(),
    expenseName: z.string().max(255).nullish(),
    expenditureAmount: moneyString.nullish()
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided"
  })
export type UpdatePropertyAssetBody = z.infer<
  typeof updatePropertyAssetBodySchema
>
