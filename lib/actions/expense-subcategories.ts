"use server"

import { revalidatePath } from "next/cache"

import { getCurrentUserAndFamily } from "@/lib/auth-context"
import {
  createExpenseSubcategory,
  deleteExpenseSubcategory as deleteSubcategoryService,
  listExpenseSubcategories,
  updateExpenseSubcategory as updateSubcategoryService
} from "@/lib/services/expense-subcategories"

export type ExpenseSubcategory = {
  id: string
  userId: string
  categoryId: string
  name: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Get all subcategories for a specific category
 */
export async function getSubcategoriesByCategory(
  categoryId: string
): Promise<ExpenseSubcategory[]> {
  try {
    const ctx = await getCurrentUserAndFamily()
    return await listExpenseSubcategories(ctx, { categoryId })
  } catch (error) {
    console.error("Error fetching subcategories:", error)
    return []
  }
}

/**
 * Get all subcategories for the authenticated user
 */
export async function getAllSubcategories(): Promise<ExpenseSubcategory[]> {
  try {
    const ctx = await getCurrentUserAndFamily()
    return await listExpenseSubcategories(ctx)
  } catch (error) {
    console.error("Error fetching all subcategories:", error)
    return []
  }
}

/**
 * Add a new subcategory to a category
 */
export async function addSubcategory(
  categoryId: string,
  name: string
): Promise<ExpenseSubcategory> {
  const ctx = await getCurrentUserAndFamily()
  const row = await createExpenseSubcategory(ctx, { categoryId, name })
  revalidatePath("/budget")
  return row
}

/**
 * Update an existing subcategory
 */
export async function updateSubcategory(
  id: string,
  name: string
): Promise<ExpenseSubcategory> {
  const ctx = await getCurrentUserAndFamily()
  const row = await updateSubcategoryService(ctx, id, { name })
  revalidatePath("/budget")
  return row
}

/**
 * Delete a subcategory
 */
export async function deleteSubcategory(id: string): Promise<void> {
  const ctx = await getCurrentUserAndFamily()
  await deleteSubcategoryService(ctx, id)
  revalidatePath("/budget")
}
