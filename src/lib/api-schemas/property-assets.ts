import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

import { propertyAssets } from "@/db/schema"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const moneyString = z.string().regex(/^-?\d+(\.\d{1,2})?$/)

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

// Field schemas derived from the property_assets table — types and nullability
// flow from the columns. outstandingLoan / monthlyLoanPayment / interestRate are
// NOT NULL (required); loan/CPF fields are nullable (nullish). A provided schema
// replaces the column verbatim, carrying its own optionality.
const propertyInsert = createInsertSchema(propertyAssets, {
  propertyName: (s) => s.min(1).max(255),
  purchaseDate: isoDate,
  originalPurchasePrice: moneyString,
  loanAmountTaken: moneyString.nullish(),
  outstandingLoan: moneyString,
  monthlyLoanPayment: moneyString,
  interestRate: moneyString,
  principalCpfWithdrawn: moneyString.nullish(),
  housingGrantTaken: moneyString.nullish(),
  accruedInterestToDate: moneyString.nullish(),
  paidByCpf: z.boolean().optional()
})

// User-supplied table fields + form extras. `id` for idempotent upsert;
// addToExpenditures/expenseName/expenditureAmount drive the linked Housing
// expense (expenditureAmount overrides monthlyLoanPayment as the expense value).
export const createPropertyAssetBodySchema = propertyInsert
  .pick({
    propertyName: true,
    purchaseDate: true,
    originalPurchasePrice: true,
    loanAmountTaken: true,
    outstandingLoan: true,
    monthlyLoanPayment: true,
    interestRate: true,
    principalCpfWithdrawn: true,
    housingGrantTaken: true,
    accruedInterestToDate: true,
    paidByCpf: true
  })
  .extend({
    id: z.string().uuid().optional(),
    addToExpenditures: z.boolean().optional(),
    expenseName: z.string().max(255).nullish(),
    expenditureAmount: moneyString.nullish()
  })
export type CreatePropertyAssetBody = z.infer<
  typeof createPropertyAssetBodySchema
>

export const updatePropertyAssetBodySchema = createPropertyAssetBodySchema
  .omit({ id: true })
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided"
  })
export type UpdatePropertyAssetBody = z.infer<
  typeof updatePropertyAssetBodySchema
>
