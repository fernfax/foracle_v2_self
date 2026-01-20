"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { expenseCategories, expenses } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

export type ExpenseCategory = {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  isDefault: boolean | null;
  trackedInBudget: boolean | null;
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

export type ExpenseItem = {
  id: string;
  name: string;
  amount: string;
  frequency: string;
  category: string;
  trackedInBudget: boolean | null;
};

/**
 * Get all expenses grouped by category for the authenticated user
 */
export async function getAllExpensesGroupedByCategory(): Promise<Record<string, ExpenseItem[]>> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const allExpenses = await db
    .select({
      id: expenses.id,
      name: expenses.name,
      amount: expenses.amount,
      frequency: expenses.frequency,
      category: expenses.category,
      trackedInBudget: expenses.trackedInBudget,
    })
    .from(expenses)
    .where(and(eq(expenses.userId, userId), eq(expenses.isActive, true)));

  // Group expenses by category
  const grouped: Record<string, ExpenseItem[]> = {};
  for (const expense of allExpenses) {
    if (!grouped[expense.category]) {
      grouped[expense.category] = [];
    }
    grouped[expense.category].push(expense);
  }

  return grouped;
}

/**
 * Update expense category icon
 */
export async function updateExpenseCategoryIcon(
  id: string,
  icon: string | null
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
      icon,
      updatedAt: new Date(),
    })
    .where(and(eq(expenseCategories.id, id), eq(expenseCategories.userId, userId)))
    .returning();

  return updatedCategory;
}

/**
 * Update which categories are tracked in budget
 */
export async function updateTrackedCategories(
  trackedCategoryIds: string[]
): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Get all user categories
  const allCategories = await db
    .select({ id: expenseCategories.id })
    .from(expenseCategories)
    .where(eq(expenseCategories.userId, userId));

  // Update all categories - set tracked to true if in list, false otherwise
  for (const category of allCategories) {
    const isTracked = trackedCategoryIds.includes(category.id);
    await db
      .update(expenseCategories)
      .set({
        trackedInBudget: isTracked,
        updatedAt: new Date(),
      })
      .where(and(eq(expenseCategories.id, category.id), eq(expenseCategories.userId, userId)));
  }

  revalidatePath("/dashboard/budget");
}

/**
 * Update which individual expenses are tracked in budget
 */
export async function updateTrackedExpenses(
  trackedExpenseIds: string[]
): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Get all user expenses with their category
  const allUserExpenses = await db
    .select({ id: expenses.id, category: expenses.category })
    .from(expenses)
    .where(and(eq(expenses.userId, userId), eq(expenses.isActive, true)));

  // Update all expenses - set tracked to true if in list, false otherwise
  for (const expense of allUserExpenses) {
    const isTracked = trackedExpenseIds.includes(expense.id);
    await db
      .update(expenses)
      .set({
        trackedInBudget: isTracked,
        updatedAt: new Date(),
      })
      .where(and(eq(expenses.id, expense.id), eq(expenses.userId, userId)));
  }

  // Also update category.trackedInBudget based on whether any expenses in that category are tracked
  const userCategories = await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.userId, userId));

  // Build a map of category name -> has any tracked expenses
  const trackedExpenseSet = new Set(trackedExpenseIds);
  const categoryHasTracked: Record<string, boolean> = {};

  for (const expense of allUserExpenses) {
    if (trackedExpenseSet.has(expense.id)) {
      categoryHasTracked[expense.category] = true;
    }
  }

  // Update each category's trackedInBudget
  for (const category of userCategories) {
    const shouldTrack = categoryHasTracked[category.name] === true;
    await db
      .update(expenseCategories)
      .set({
        trackedInBudget: shouldTrack,
        updatedAt: new Date(),
      })
      .where(and(eq(expenseCategories.id, category.id), eq(expenseCategories.userId, userId)));
  }

  revalidatePath("/dashboard/budget");
}
