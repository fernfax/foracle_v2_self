"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export type Expense = {
  id: string;
  userId: string;
  name: string;
  category: string;
  expenseCategory: string;
  amount: string;
  frequency: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Get all expenses for the authenticated user
 */
export async function getExpenses(): Promise<Expense[]> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const userExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.userId, userId))
      .orderBy(desc(expenses.createdAt));

    return userExpenses;
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
}

/**
 * Add a new expense
 */
export async function addExpense(data: {
  name: string;
  category: string;
  expenseCategory?: string;
  amount: number;
  frequency: string;
  customMonths?: string;
  startDate: string;
  endDate?: string | null;
  description?: string;
}): Promise<Expense> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const id = randomUUID();

  const [newExpense] = await db
    .insert(expenses)
    .values({
      id,
      userId,
      name: data.name,
      category: data.category,
      expenseCategory: data.expenseCategory || "current-recurring",
      amount: data.amount.toString(),
      frequency: data.frequency,
      customMonths: data.customMonths || null,
      startDate: data.startDate,
      endDate: data.endDate || null,
      description: data.description || null,
      isActive: true,
    })
    .returning();

  return newExpense;
}

/**
 * Update an existing expense
 */
export async function updateExpense(
  id: string,
  data: {
    name?: string;
    category?: string;
    expenseCategory?: string;
    amount?: number;
    frequency?: string;
    customMonths?: string | null;
    startDate?: string;
    endDate?: string | null;
    description?: string;
  }
): Promise<Expense> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await db.query.expenses.findFirst({
    where: and(eq(expenses.id, id), eq(expenses.userId, userId)),
  });

  if (!existing) {
    throw new Error("Expense not found");
  }

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.expenseCategory !== undefined) updateData.expenseCategory = data.expenseCategory;
  if (data.amount !== undefined) updateData.amount = data.amount.toString();
  if (data.frequency !== undefined) updateData.frequency = data.frequency;
  if (data.customMonths !== undefined) updateData.customMonths = data.customMonths;
  if (data.startDate !== undefined) updateData.startDate = data.startDate;
  if (data.endDate !== undefined) updateData.endDate = data.endDate;
  if (data.description !== undefined) updateData.description = data.description;

  const [updatedExpense] = await db
    .update(expenses)
    .set(updateData)
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
    .returning();

  return updatedExpense;
}

/**
 * Delete an expense
 */
export async function deleteExpense(id: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  await db
    .delete(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
}

/**
 * Create an expense from a policy
 * This is used when a policy is added to expenditures
 */
export async function createExpenseFromPolicy(data: {
  policyId: string;
  name?: string;
  policyType: string;
  provider: string;
  premiumAmount: number;
  premiumFrequency: string;
  startDate: string;
  maturityDate?: string | null;
}): Promise<Expense> {
  console.log("=== SERVER: createExpenseFromPolicy called ===");
  console.log("Data received:", JSON.stringify(data, null, 2));

  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  console.log("User ID:", userId);

  const id = randomUUID();

  const expenseData = {
    id,
    userId,
    linkedPolicyId: data.policyId,
    name: data.name || `${data.policyType} - ${data.provider}`,
    category: "Insurance", // Hardcoded as per requirements
    expenseCategory: "current-recurring",
    amount: data.premiumAmount.toString(),
    frequency: data.premiumFrequency,
    customMonths: null,
    startDate: data.startDate,
    endDate: data.maturityDate || null,
    description: `Auto-generated from insurance policy`,
    isActive: true,
  };

  console.log("Inserting expense with data:", JSON.stringify(expenseData, null, 2));

  const [newExpense] = await db
    .insert(expenses)
    .values(expenseData)
    .returning();

  console.log("Expense inserted successfully:", newExpense.id);

  return newExpense;
}

/**
 * Update an expense that is linked to a policy
 * This is used when a policy is updated and needs to sync changes to the linked expense
 */
export async function updateExpenseFromPolicy(
  expenseId: string,
  data: {
    policyType: string;
    provider: string;
    premiumAmount: number;
    premiumFrequency: string;
    startDate: string;
    maturityDate?: string | null;
  }
): Promise<Expense> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await db.query.expenses.findFirst({
    where: and(eq(expenses.id, expenseId), eq(expenses.userId, userId)),
  });

  if (!existing) {
    throw new Error("Expense not found");
  }

  const [updatedExpense] = await db
    .update(expenses)
    .set({
      name: `${data.policyType} - ${data.provider}`,
      amount: data.premiumAmount.toString(),
      frequency: data.premiumFrequency,
      startDate: data.startDate,
      endDate: data.maturityDate || null,
      updatedAt: new Date(),
    })
    .where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)))
    .returning();

  return updatedExpense;
}

/**
 * Delete an expense that is linked to a policy
 * This is used when a policy's "Add to Expenditures" toggle is turned OFF
 */
export async function deleteLinkedExpense(policyId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Find and delete the expense linked to this policy
  await db
    .delete(expenses)
    .where(and(eq(expenses.linkedPolicyId, policyId), eq(expenses.userId, userId)));
}
