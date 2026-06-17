"use server"

import { revalidatePath } from "next/cache"

import { getCurrentUserAndFamily } from "@/lib/auth-context"
import {
  createPolicy as createPolicyService,
  deletePolicy as deletePolicyService,
  listPolicies,
  updatePolicy as updatePolicyService
} from "@/lib/services/policies"

/**
 * Get all policies for the current user.
 *
 * NOTE: signature changed from getUserPolicies(userId) to getUserPolicies()
 * — the userId is now resolved via Clerk auth inside the service. Callers
 * should drop the explicit argument.
 */
export async function getUserPolicies() {
  const ctx = await getCurrentUserAndFamily()
  return listPolicies(ctx)
}

/**
 * Create a new policy. Auth is resolved internally; do not pass userId.
 */
export async function createPolicy(data: {
  familyMemberId?: string
  linkedExpenseId?: string
  provider: string
  planName?: string
  policyNumber?: string
  policyType: string
  status?: string
  startDate: string
  maturityDate?: string
  coverageUntilAge?: number
  premiumAmount: string
  premiumAmountCPF?: string
  premiumFrequency: string
  customMonths?: string
  totalPremiumDuration?: number
  coverageOptions?: string
  cashValue?: string
  cashValueDate?: string
  description?: string
}) {
  const ctx = await getCurrentUserAndFamily()
  const result = await createPolicyService(ctx, {
    familyMemberId: data.familyMemberId,
    linkedExpenseId: data.linkedExpenseId,
    provider: data.provider,
    planName: data.planName,
    policyNumber: data.policyNumber,
    policyType: data.policyType,
    status: data.status as
      | "active"
      | "lapsed"
      | "cancelled"
      | "matured"
      | undefined,
    startDate: data.startDate,
    maturityDate: data.maturityDate,
    coverageUntilAge: data.coverageUntilAge,
    premiumAmount: data.premiumAmount,
    premiumAmountCPF: data.premiumAmountCPF,
    premiumFrequency: data.premiumFrequency,
    customMonths: data.customMonths,
    totalPremiumDuration: data.totalPremiumDuration,
    coverageOptions: data.coverageOptions,
    cashValue: data.cashValue,
    cashValueDate: data.cashValueDate,
    description: data.description
  })
  revalidatePath("/policies")
  return result.row
}

/**
 * Update an existing policy. Now scoped to the caller — previously this
 * function had no auth at all, allowing cross-user policy modification.
 */
export async function updatePolicy(
  policyId: string,
  data: Partial<{
    familyMemberId: string
    linkedExpenseId: string
    provider: string
    planName: string
    policyNumber: string
    policyType: string
    status: string
    startDate: string
    maturityDate: string
    coverageUntilAge: number
    premiumAmount: string
    premiumAmountCPF: string | null
    premiumFrequency: string
    customMonths: string
    totalPremiumDuration: number
    coverageOptions: string
    cashValue: string | null
    cashValueDate: string | null
    description: string
    isActive: boolean
  }>
) {
  const ctx = await getCurrentUserAndFamily()
  const patch: Parameters<typeof updatePolicyService>[2] = {}
  if (data.familyMemberId !== undefined)
    patch.familyMemberId = data.familyMemberId
  if (data.linkedExpenseId !== undefined)
    patch.linkedExpenseId = data.linkedExpenseId
  if (data.provider !== undefined) patch.provider = data.provider
  if (data.planName !== undefined) patch.planName = data.planName
  if (data.policyNumber !== undefined) patch.policyNumber = data.policyNumber
  if (data.policyType !== undefined) patch.policyType = data.policyType
  if (data.status !== undefined)
    patch.status = data.status as "active" | "lapsed" | "cancelled" | "matured"
  if (data.startDate !== undefined) patch.startDate = data.startDate
  if (data.maturityDate !== undefined) patch.maturityDate = data.maturityDate
  if (data.coverageUntilAge !== undefined)
    patch.coverageUntilAge = data.coverageUntilAge
  if (data.premiumAmount !== undefined) patch.premiumAmount = data.premiumAmount
  if (data.premiumAmountCPF !== undefined)
    patch.premiumAmountCPF = data.premiumAmountCPF
  if (data.premiumFrequency !== undefined)
    patch.premiumFrequency = data.premiumFrequency
  if (data.customMonths !== undefined) patch.customMonths = data.customMonths
  if (data.totalPremiumDuration !== undefined)
    patch.totalPremiumDuration = data.totalPremiumDuration
  if (data.coverageOptions !== undefined)
    patch.coverageOptions = data.coverageOptions
  if (data.cashValue !== undefined) patch.cashValue = data.cashValue
  if (data.cashValueDate !== undefined) patch.cashValueDate = data.cashValueDate
  if (data.description !== undefined) patch.description = data.description
  if (data.isActive !== undefined) patch.isActive = data.isActive

  // If the patch is empty (e.g. caller only passed undefined values), the
  // service refuses with an empty-update guard. Match that contract here.
  if (Object.keys(patch).length === 0) {
    throw new Error("At least one field must be provided")
  }

  const row = await updatePolicyService(ctx, policyId, patch)
  revalidatePath("/policies")
  return row
}

/**
 * Delete a policy. Now scoped to the caller; cascades the linked expense.
 */
export async function deletePolicy(policyId: string) {
  const ctx = await getCurrentUserAndFamily()
  await deletePolicyService(ctx, policyId)
  revalidatePath("/policies")
}
