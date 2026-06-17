import { z } from "zod"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const moneyString = z.string().regex(/^-?\d+(\.\d{1,2})?$/)

const booleanLike = z
  .union([
    z.boolean(),
    z.literal("true").transform(() => true),
    z.literal("false").transform(() => false)
  ])
  .pipe(z.boolean())

export const listVehicleAssetsQuerySchema = z.object({
  isActive: booleanLike.optional()
})
export type ListVehicleAssetsQuery = z.infer<
  typeof listVehicleAssetsQuerySchema
>

export const createVehicleAssetBodySchema = z.object({
  id: z.string().uuid().optional(),
  vehicleName: z.string().min(1).max(255),
  purchaseDate: isoDate,
  coeExpiryDate: isoDate.nullish(),
  originalPurchasePrice: moneyString,
  loanAmountTaken: moneyString.nullish(),
  loanInterestRate: moneyString.nullish(),
  loanTenureYears: z.number().int().min(0).nullish(),
  loanTenureMonths: z.number().int().min(0).max(11).nullish(),
  loanAmountRepaid: moneyString.nullish(),
  monthlyLoanPayment: moneyString.nullish(),
  addToExpenditures: z.boolean().optional(),
  expenseName: z.string().max(255).nullish()
})
export type CreateVehicleAssetBody = z.infer<
  typeof createVehicleAssetBodySchema
>

export const updateVehicleAssetBodySchema = z
  .object({
    vehicleName: z.string().min(1).max(255).optional(),
    purchaseDate: isoDate.optional(),
    coeExpiryDate: isoDate.nullish(),
    originalPurchasePrice: moneyString.optional(),
    loanAmountTaken: moneyString.nullish(),
    loanInterestRate: moneyString.nullish(),
    loanTenureYears: z.number().int().min(0).nullish(),
    loanTenureMonths: z.number().int().min(0).max(11).nullish(),
    loanAmountRepaid: moneyString.nullish(),
    monthlyLoanPayment: moneyString.nullish(),
    isActive: z.boolean().optional(),
    addToExpenditures: z.boolean().optional(),
    expenseName: z.string().max(255).nullish()
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided"
  })
export type UpdateVehicleAssetBody = z.infer<
  typeof updateVehicleAssetBodySchema
>
