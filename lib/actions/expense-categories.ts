"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { expenseCategories } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

export type ExpenseCategory = {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

// Default categories that will be created for new users
// These must match the categories used in onboarding (ExpensesStep.tsx)
const DEFAULT_CATEGORIES = [
  "Housing",
  "Food",
  "Transportation",
  "Utilities",
  "Healthcare",
  "Children",
  "Entertainment",
  "Allowances",
  "Vehicle",
  "Shopping",
];

/**
 * Get all expense categories for the authenticated user
 */
export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    let categories = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.userId, userId))
      .orderBy(asc(expenseCategories.name));

    // If no categories exist, create default ones
    if (categories.length === 0) {
      await initializeDefaultCategories(userId);
      return getExpenseCategories();
    }

    // Check for missing default categories and add them
    const existingNames = new Set(categories.map((c) => c.name));
    const missingCategories = DEFAULT_CATEGORIES.filter(
      (name) => !existingNames.has(name)
    );

    if (missingCategories.length > 0) {
      await addMissingCategories(userId, missingCategories);
      // Re-fetch to include the newly added categories
      categories = await db
        .select()
        .from(expenseCategories)
        .where(eq(expenseCategories.userId, userId))
        .orderBy(asc(expenseCategories.name));
    }

    return categories;
  } catch (error) {
    console.error("Error fetching expense categories:", error);
    return [];
  }
}

/**
 * Initialize default categories for a user
 */
async function initializeDefaultCategories(userId: string): Promise<void> {
  const defaultCategories = DEFAULT_CATEGORIES.map((name) => ({
    id: randomUUID(),
    userId,
    name,
    isDefault: true,
  }));

  await db.insert(expenseCategories).values(defaultCategories);
}

/**
 * Add missing default categories for existing users
 */
async function addMissingCategories(
  userId: string,
  missingNames: string[]
): Promise<void> {
  const newCategories = missingNames.map((name) => ({
    id: randomUUID(),
    userId,
    name,
    isDefault: true,
  }));

  await db.insert(expenseCategories).values(newCategories);
}

/**
 * Add a new expense category
 */
export async function addExpenseCategory(name: string): Promise<ExpenseCategory> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const id = randomUUID();

  const [newCategory] = await db
    .insert(expenseCategories)
    .values({
      id,
      userId,
      name,
      isDefault: false,
    })
    .returning();

  return newCategory;
}

/**
 * Update an existing expense category
 */
export async function updateExpenseCategory(
  id: string,
  name: string
): Promise<ExpenseCategory> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await db.query.expenseCategories.findFirst({
    where: and(eq(expenseCategories.id, id), eq(expenseCategories.userId, userId)),
  });

  if (!existing) {
    throw new Error("Category not found");
  }

  const [updatedCategory] = await db
    .update(expenseCategories)
    .set({
      name,
      updatedAt: new Date(),
    })
    .where(and(eq(expenseCategories.id, id), eq(expenseCategories.userId, userId)))
    .returning();

  return updatedCategory;
}

/**
 * Delete an expense category
 */
export async function deleteExpenseCategory(id: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  await db
    .delete(expenseCategories)
    .where(and(eq(expenseCategories.id, id), eq(expenseCategories.userId, userId)));
}
