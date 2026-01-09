"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { expenseCategories, expenses } from "@/db/schema";
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
  "Insurance",
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

    // If no categories exist, create default ones (only for new users)
    if (categories.length === 0) {
      await initializeDefaultCategories(userId);
      return getExpenseCategories();
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

/**
 * Get expenses by category name
 */
export async function getExpensesByCategory(categoryName: string): Promise<{
  id: string;
  name: string;
  amount: string;
}[]> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const categoryExpenses = await db
    .select({
      id: expenses.id,
      name: expenses.name,
      amount: expenses.amount,
    })
    .from(expenses)
    .where(and(eq(expenses.userId, userId), eq(expenses.category, categoryName)));

  return categoryExpenses;
}
