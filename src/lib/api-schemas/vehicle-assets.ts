import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

import { vehicleAssets } from "@/db/schema"

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

// Field schemas derived from the vehicle_assets table — types and nullability
// flow from the columns; domain rules (money/date format, COE month range)
// layered per field. A provided schema replaces the column verbatim, so each
// carries its own optionality (NOT NULL vs nullable).
const vehicleInsert = createInsertSchema(vehicleAssets, {
  vehicleName: (s) => s.min(1).max(255),
  purchaseDate: isoDate,
  coeExpiryDate: isoDate.nullish(),
  originalPurchasePrice: moneyString,
  loanAmountTaken: moneyString.nullish(),
  loanInterestRate: moneyString.nullish(),
  loanTenureYears: z.number().int().min(0).nullish(),
  loanTenureMonths: z.number().int().min(0).max(11).nullish(),
  loanAmountRepaid: moneyString.nullish(),
  monthlyLoanPayment: moneyString.nullish()
})

// User-supplied table fields + form extras. `id` is accepted for idempotent
// upsert; addToExpenditures/expenseName drive the linked Loan-Payment expense.
export const createVehicleAssetBodySchema = vehicleInsert
  .pick({
    vehicleName: true,
    purchaseDate: true,
    coeExpiryDate: true,
    originalPurchasePrice: true,
    loanAmountTaken: true,
    loanInterestRate: true,
    loanTenureYears: true,
    loanTenureMonths: true,
    loanAmountRepaid: true,
    monthlyLoanPayment: true
  })
  .extend({
    id: z.string().uuid().optional(),
    addToExpenditures: z.boolean().optional(),
    expenseName: z.string().max(255).nullish()
  })
export type CreateVehicleAssetBody = z.infer<
  typeof createVehicleAssetBodySchema
>

export const updateVehicleAssetBodySchema = createVehicleAssetBodySchema
  .omit({ id: true })
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided"
  })
export type UpdateVehicleAssetBody = z.infer<
  typeof updateVehicleAssetBodySchema
>
