"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { expenseSubcategories } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

export type ExpenseSubcategory = {
  id: string;
  userId: string;
  categoryId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Get all subcategories for a specific category
 */
export async function getSubcategoriesByCategory(categoryId: string): Promise<ExpenseSubcategory[]> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const subcategories = await db
      .select()
      .from(expenseSubcategories)
      .where(
        and(
          eq(expenseSubcategories.userId, userId),
          eq(expenseSubcategories.categoryId, categoryId)
        )
      )
      .orderBy(asc(expenseSubcategories.name));

    return subcategories;
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    return [];
  }
}

/**
 * Get all subcategories for the authenticated user
 */
export async function getAllSubcategories(): Promise<ExpenseSubcategory[]> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const subcategories = await db
      .select()
      .from(expenseSubcategories)
      .where(eq(expenseSubcategories.userId, userId))
      .orderBy(asc(expenseSubcategories.name));

    return subcategories;
  } catch (error) {
    console.error("Error fetching all subcategories:", error);
    return [];
  }
}

/**
 * Add a new subcategory to a category
 */
export async function addSubcategory(
  categoryId: string,
  name: string
): Promise<ExpenseSubcategory> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const id = randomUUID();

  const [newSubcategory] = await db
    .insert(expenseSubcategories)
    .values({
      id,
      userId,
      categoryId,
      name,
    })
    .returning();

  revalidatePath("/dashboard/budget");
  return newSubcategory;
}

/**
 * Update an existing subcategory
 */
export async function updateSubcategory(
  id: string,
  name: string
): Promise<ExpenseSubcategory> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await db.query.expenseSubcategories.findFirst({
    where: and(
      eq(expenseSubcategories.id, id),
      eq(expenseSubcategories.userId, userId)
    ),
  });

  if (!existing) {
    throw new Error("Subcategory not found");
  }

  const [updatedSubcategory] = await db
    .update(expenseSubcategories)
    .set({
      name,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(expenseSubcategories.id, id),
        eq(expenseSubcategories.userId, userId)
      )
    )
    .returning();

  revalidatePath("/dashboard/budget");
  return updatedSubcategory;
}

/**
 * Delete a subcategory
 */
export async function deleteSubcategory(id: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  await db
    .delete(expenseSubcategories)
    .where(
      and(
        eq(expenseSubcategories.id, id),
        eq(expenseSubcategories.userId, userId)
      )
    );

  revalidatePath("/dashboard/budget");
}
