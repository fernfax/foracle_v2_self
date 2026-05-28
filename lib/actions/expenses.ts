"use server";

import { db } from "@/db";
import { expenses, expenseCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  createExpense as createExpenseService,
  hardDeleteExpense as hardDeleteExpenseService,
  listExpenses,
  updateExpense as updateExpenseService,
} from "@/lib/services/expenses";

export type Expense = {
  id: string;
  userId: string;
  linkedPolicyId: string | null;
  name: string;
  category: string;
  expenseCategory: string | null;
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string | null;
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
    const ctx = await getCurrentUserAndFamily();
    return await listExpenses(ctx);
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
  startDate?: string | null;
  endDate?: string | null;
  description?: string;
}): Promise<Expense> {
  const ctx = await getCurrentUserAndFamily();
  const result = await createExpenseService(ctx, {
    name: data.name,
    category: data.category,
    expenseCategory: data.expenseCategory as
      | "current-recurring"
      | "future-recurring"
      | "temporary"
      | "one-off"
      | undefined,
    amount: data.amount.toString(),
    frequency: data.frequency as
      | "monthly"
      | "yearly"
      | "one-time"
      | "weekly"
      | "bi-weekly"
      | "custom",
    customMonths: data.customMonths,
    startDate: data.startDate,
    endDate: data.endDate,
    description: data.description,
  });
  return result.row;
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
    startDate?: string | null;
    endDate?: string | null;
    description?: string;
  }
): Promise<Expense> {
  const ctx = await getCurrentUserAndFamily();
  const patch: Parameters<typeof updateExpenseService>[2] = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.category !== undefined) patch.category = data.category;
  if (data.expenseCategory !== undefined)
    patch.expenseCategory = data.expenseCategory as
      | "current-recurring"
      | "future-recurring"
      | "temporary"
      | "one-off";
  if (data.amount !== undefined) patch.amount = data.amount.toString();
  if (data.frequency !== undefined)
    patch.frequency = data.frequency as
      | "monthly"
      | "yearly"
      | "one-time"
      | "weekly"
      | "bi-weekly"
      | "custom";
  if (data.customMonths !== undefined) patch.customMonths = data.customMonths;
  if (data.startDate !== undefined) patch.startDate = data.startDate;
  if (data.endDate !== undefined) patch.endDate = data.endDate;
  if (data.description !== undefined) patch.description = data.description;
  return updateExpenseService(ctx, id, patch);
}

/**
 * Delete an expense
 */
export async function deleteExpense(id: string): Promise<void> {
  const ctx = await getCurrentUserAndFamily();
  await hardDeleteExpenseService(ctx, id);
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
  customMonths?: string | null;
  startDate: string;
  maturityDate?: string | null;
}): Promise<Expense> {
  console.log("=== SERVER: createExpenseFromPolicy called ===");
  console.log("Data received:", JSON.stringify(data, null, 2));

  const { userId, familyId } = await getCurrentUserAndFamily();

  console.log("User ID:", userId, "Family ID:", familyId);

  // Ensure the Insurance category exists for this family
  const existingCategory = await db.query.expenseCategories.findFirst({
    where: and(
      eq(expenseCategories.familyId, familyId),
      eq(expenseCategories.name, "Insurance")
    ),
  });

  if (!existingCategory) {
    await db.insert(expenseCategories).values({
      id: randomUUID(),
      userId,
      familyId,
      name: "Insurance",
      isDefault: true,
    });
  }

  const id = randomUUID();

  const expenseData = {
    id,
    userId,
    familyId,
    linkedPolicyId: data.policyId,
    name: data.name || `${data.policyType} - ${data.provider}`,
    category: "Insurance", // Hardcoded as per requirements
    expenseCategory: "current-recurring",
    amount: data.premiumAmount.toString(),
    frequency: data.premiumFrequency,
    customMonths: data.customMonths || null,
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
    name?: string;
    policyType: string;
    provider: string;
    premiumAmount: number;
    premiumFrequency: string;
    customMonths?: string | null;
    startDate: string;
    maturityDate?: string | null;
  }
): Promise<Expense> {
  const { familyId } = await getCurrentUserAndFamily();

  // Verify the expense belongs to caller's family
  const existing = await db.query.expenses.findFirst({
    where: and(eq(expenses.id, expenseId), eq(expenses.familyId, familyId)),
  });

  if (!existing) {
    throw new Error("Expense not found");
  }

  const [updatedExpense] = await db
    .update(expenses)
    .set({
      name: data.name || `${data.policyType} - ${data.provider}`,
      amount: data.premiumAmount.toString(),
      frequency: data.premiumFrequency,
      customMonths: data.customMonths || null,
      startDate: data.startDate,
      endDate: data.maturityDate || null,
      updatedAt: new Date(),
    })
    .where(and(eq(expenses.id, expenseId), eq(expenses.familyId, familyId)))
    .returning();

  return updatedExpense;
}

/**
 * Delete an expense that is linked to a policy
 * This is used when a policy's "Add to Expenditures" toggle is turned OFF
 */
export async function deleteLinkedExpense(policyId: string): Promise<void> {
  const { familyId } = await getCurrentUserAndFamily();

  // Find and delete the expense linked to this policy
  await db
    .delete(expenses)
    .where(and(eq(expenses.linkedPolicyId, policyId), eq(expenses.familyId, familyId)));
}
