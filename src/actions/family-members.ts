"use server"

import { revalidatePath } from "next/cache"

import { getCurrentUserAndFamily } from "@/lib/auth-context"
import {
  createFamilyMember as createFamilyMemberService,
  deleteFamilyMember as deleteFamilyMemberService,
  getFamilyMemberIncomes as getFamilyMemberIncomesService,
  getOrCreateSelfMember as getOrCreateSelfMemberService,
  listFamilyMembersOrSelf,
  updateFamilyMember as updateFamilyMemberService
} from "@/lib/services/family"

/**
 * Create a new family member
 */
export async function createFamilyMember(data: {
  name: string
  relationship: string
  dateOfBirth?: string
  isContributing?: boolean
  notes?: string
}) {
  const ctx = await getCurrentUserAndFamily()
  const row = await createFamilyMemberService(ctx, {
    name: data.name,
    relationship: data.relationship,
    dateOfBirth: data.dateOfBirth,
    isContributing: data.isContributing,
    notes: data.notes
  })
  revalidatePath("/user", "layout")
  return row
}

/**
 * Update an existing family member
 */
export async function updateFamilyMember(
  id: string,
  data: {
    name?: string
    relationship?: string
    dateOfBirth?: string | null
    isContributing?: boolean
    notes?: string | null
  }
) {
  const ctx = await getCurrentUserAndFamily()
  const patch: Parameters<typeof updateFamilyMemberService>[2] = {}
  if (data.name !== undefined) patch.name = data.name
  if (data.relationship !== undefined) patch.relationship = data.relationship
  if (data.dateOfBirth !== undefined) patch.dateOfBirth = data.dateOfBirth
  if (data.isContributing !== undefined)
    patch.isContributing = data.isContributing
  if (data.notes !== undefined) patch.notes = data.notes

  if (Object.keys(patch).length === 0) {
    throw new Error("At least one field must be provided")
  }

  const row = await updateFamilyMemberService(ctx, id, patch)
  revalidatePath("/user", "layout")
  return row
}

/**
 * Get linked incomes for a family member
 */
export async function getFamilyMemberIncomes(id: string) {
  const ctx = await getCurrentUserAndFamily()
  return getFamilyMemberIncomesService(ctx, id)
}

/**
 * Delete a family member and all linked incomes
 */
export async function deleteFamilyMember(id: string) {
  const ctx = await getCurrentUserAndFamily()
  const result = await deleteFamilyMemberService(ctx, id)
  revalidatePath("/user", "layout")
  return { success: true, deletedIncomes: result.deletedIncomes }
}

/**
 * Get or create the "Self" family member for onboarding
 */
export async function getOrCreateSelfMember(data: {
  name: string
  dateOfBirth: string
}) {
  const ctx = await getCurrentUserAndFamily()
  const row = await getOrCreateSelfMemberService(ctx, data)
  revalidatePath("/user", "layout")
  return row
}

/**
 * Get all family members; auto-creates a Self entry if none exist.
 */
export async function getFamilyMembers() {
  const ctx = await getCurrentUserAndFamily()
  return listFamilyMembersOrSelf(ctx)
}
