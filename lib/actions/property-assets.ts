"use server"

import { revalidatePath } from "next/cache"

import { getCurrentUserAndFamily } from "@/lib/auth-context"
import {
  createPropertyAsset as createPropertyAssetService,
  deletePropertyAsset as deletePropertyAssetService,
  listPropertyAssets,
  updatePropertyAsset as updatePropertyAssetService
} from "@/lib/services/property-assets"

/**
 * Create a new property asset
 */
export async function createPropertyAsset(data: {
  propertyName: string
  purchaseDate: string
  originalPurchasePrice: number
  loanAmountTaken?: number
  outstandingLoan: number
  monthlyLoanPayment: number
  interestRate: number
  principalCpfWithdrawn?: number
  housingGrantTaken?: number
  accruedInterestToDate?: number
  paidByCpf?: boolean
  addToExpenditures?: boolean
  expenseName?: string
  expenditureAmount?: number
}) {
  const ctx = await getCurrentUserAndFamily()
  const result = await createPropertyAssetService(ctx, {
    propertyName: data.propertyName,
    purchaseDate: data.purchaseDate,
    originalPurchasePrice: data.originalPurchasePrice.toString(),
    loanAmountTaken: data.loanAmountTaken?.toString(),
    outstandingLoan: data.outstandingLoan.toString(),
    monthlyLoanPayment: data.monthlyLoanPayment.toString(),
    interestRate: data.interestRate.toString(),
    principalCpfWithdrawn: data.principalCpfWithdrawn?.toString(),
    housingGrantTaken: data.housingGrantTaken?.toString(),
    accruedInterestToDate: data.accruedInterestToDate?.toString(),
    paidByCpf: data.paidByCpf,
    addToExpenditures: data.addToExpenditures,
    expenseName: data.expenseName,
    expenditureAmount: data.expenditureAmount?.toString()
  })
  revalidatePath("/assets")
  revalidatePath("/expenses")
  revalidatePath("/user")
  return result.row
}

/**
 * Get all property assets for the current user
 */
export async function getPropertyAssets() {
  const ctx = await getCurrentUserAndFamily()
  return listPropertyAssets(ctx)
}

/**
 * Update an existing property asset
 */
export async function updatePropertyAsset(
  id: string,
  data: {
    propertyName: string
    purchaseDate: string
    originalPurchasePrice: number
    loanAmountTaken?: number
    outstandingLoan: number
    monthlyLoanPayment: number
    interestRate: number
    principalCpfWithdrawn?: number
    housingGrantTaken?: number
    accruedInterestToDate?: number
    paidByCpf?: boolean
    addToExpenditures?: boolean
    expenseName?: string
    expenditureAmount?: number
  }
) {
  const ctx = await getCurrentUserAndFamily()
  const row = await updatePropertyAssetService(ctx, id, {
    propertyName: data.propertyName,
    purchaseDate: data.purchaseDate,
    originalPurchasePrice: data.originalPurchasePrice.toString(),
    loanAmountTaken: data.loanAmountTaken?.toString() ?? null,
    outstandingLoan: data.outstandingLoan.toString(),
    monthlyLoanPayment: data.monthlyLoanPayment.toString(),
    interestRate: data.interestRate.toString(),
    principalCpfWithdrawn: data.principalCpfWithdrawn?.toString() ?? null,
    housingGrantTaken: data.housingGrantTaken?.toString() ?? null,
    accruedInterestToDate: data.accruedInterestToDate?.toString() ?? null,
    paidByCpf: data.paidByCpf ?? false,
    addToExpenditures: data.addToExpenditures,
    expenseName: data.expenseName,
    expenditureAmount: data.expenditureAmount?.toString() ?? null
  })
  revalidatePath("/assets")
  revalidatePath("/expenses")
  revalidatePath("/user")
  return row
}

/**
 * Delete a property asset
 */
export async function deletePropertyAsset(id: string) {
  const ctx = await getCurrentUserAndFamily()
  await deletePropertyAssetService(ctx, id)
  revalidatePath("/assets")
  revalidatePath("/expenses")
  revalidatePath("/user")
}
