"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { goals, expenses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

/**
 * Get the current authenticated user's ID
 */
async function getCurrentUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

/**
 * Create a new goal
 */
export async function createGoal(data: {
  goalName: string;
  goalType: "primary" | "secondary";
  targetAmount: number;
  targetDate: string;
  currentAmountSaved?: number;
  monthlyContribution?: number;
  description?: string;
  addToExpenditures?: boolean;
  expenseName?: string;
}) {
  const userId = await getCurrentUserId();

  const goalId = nanoid();
  let linkedExpenseId: string | null = null;

  // If addToExpenditures is true and monthlyContribution is set, create an expense record
  if (data.addToExpenditures && data.monthlyContribution && data.monthlyContribution > 0) {
    const expenseId = nanoid();
    await db.insert(expenses).values({
      id: expenseId,
      userId,
      linkedGoalId: goalId,
      name: data.expenseName || `${data.goalName} - Monthly Savings`,
      category: "Savings",
      expenseCategory: "current-recurring",
      amount: data.monthlyContribution.toString(),
      frequency: "Monthly",
      description: `Auto-generated from goal: ${data.goalName}`,
      isActive: true,
    });
    linkedExpenseId = expenseId;
  }

  const newGoal = await db.insert(goals).values({
    id: goalId,
    userId,
    linkedExpenseId,
    goalName: data.goalName,
    goalType: data.goalType,
    targetAmount: data.targetAmount.toString(),
    targetDate: data.targetDate,
    currentAmountSaved: (data.currentAmountSaved || 0).toString(),
    monthlyContribution: data.monthlyContribution?.toString() || null,
    description: data.description || null,
    isAchieved: false,
    isActive: true,
  }).returning();

  revalidatePath("/dashboard/goals");
  revalidatePath("/dashboard/user/expenses");
  revalidatePath("/dashboard");
  return newGoal[0];
}

/**
 * Get all goals for the current user
 */
export async function getGoals() {
  const userId = await getCurrentUserId();

  const userGoals = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, userId))
    .orderBy(goals.createdAt);

  return userGoals;
}

/**
 * Get active goals (not achieved and active)
 */
export async function getActiveGoals() {
  const userId = await getCurrentUserId();

  const activeGoals = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        eq(goals.isActive, true),
        eq(goals.isAchieved, false)
      )
    )
    .orderBy(goals.targetDate);

  return activeGoals;
}

/**
 * Get achieved goals
 */
export async function getAchievedGoals() {
  const userId = await getCurrentUserId();

  const achievedGoals = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        eq(goals.isAchieved, true)
      )
    )
    .orderBy(goals.updatedAt);

  return achievedGoals;
}

/**
 * Update an existing goal
 */
export async function updateGoal(
  id: string,
  data: {
    goalName: string;
    goalType: "primary" | "secondary";
    targetAmount: number;
    targetDate: string;
    currentAmountSaved?: number;
    monthlyContribution?: number;
    description?: string;
    isAchieved?: boolean;
    addToExpenditures?: boolean;
    expenseName?: string;
  }
) {
  const userId = await getCurrentUserId();

  // Get the existing goal to check for linked expense
  const existing = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .limit(1);

  if (!existing.length) {
    throw new Error("Goal not found");
  }

  const existingGoal = existing[0];
  let linkedExpenseId = existingGoal.linkedExpenseId;

  // Handle expense integration
  if (data.addToExpenditures && data.monthlyContribution && data.monthlyContribution > 0) {
    if (linkedExpenseId) {
      // Update existing expense
      await db.update(expenses)
        .set({
          name: data.expenseName || `${data.goalName} - Monthly Savings`,
          amount: data.monthlyContribution.toString(),
          updatedAt: new Date(),
        })
        .where(eq(expenses.id, linkedExpenseId));
    } else {
      // Create new expense
      const expenseId = nanoid();
      await db.insert(expenses).values({
        id: expenseId,
        userId,
        linkedGoalId: id,
        name: data.expenseName || `${data.goalName} - Monthly Savings`,
        category: "Savings",
        expenseCategory: "current-recurring",
        amount: data.monthlyContribution.toString(),
        frequency: "Monthly",
        description: `Auto-generated from goal: ${data.goalName}`,
        isActive: true,
      });
      linkedExpenseId = expenseId;
    }
  } else if (!data.addToExpenditures && linkedExpenseId) {
    // Remove linked expense if toggle is turned off
    await db.delete(expenses).where(eq(expenses.id, linkedExpenseId));
    linkedExpenseId = null;
  }

  const updated = await db.update(goals)
    .set({
      linkedExpenseId,
      goalName: data.goalName,
      goalType: data.goalType,
      targetAmount: data.targetAmount.toString(),
      targetDate: data.targetDate,
      currentAmountSaved: (data.currentAmountSaved || 0).toString(),
      monthlyContribution: data.monthlyContribution?.toString() || null,
      description: data.description || null,
      isAchieved: data.isAchieved || false,
      updatedAt: new Date(),
    })
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning();

  revalidatePath("/dashboard/goals");
  revalidatePath("/dashboard/user/expenses");
  revalidatePath("/dashboard");
  return updated[0];
}

/**
 * Mark a goal as achieved
 */
export async function markGoalAchieved(id: string) {
  const userId = await getCurrentUserId();

  const updated = await db.update(goals)
    .set({
      isAchieved: true,
      updatedAt: new Date(),
    })
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning();

  if (!updated.length) {
    throw new Error("Goal not found");
  }

  revalidatePath("/dashboard/goals");
  revalidatePath("/dashboard");
  return updated[0];
}

/**
 * Delete a goal
 */
export async function deleteGoal(id: string) {
  const userId = await getCurrentUserId();

  // Get the goal to check for linked expense
  const existing = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .limit(1);

  if (!existing.length) {
    throw new Error("Goal not found");
  }

  // Delete linked expense if exists
  if (existing[0].linkedExpenseId) {
    await db.delete(expenses).where(eq(expenses.id, existing[0].linkedExpenseId));
  }

  await db.delete(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)));

  revalidatePath("/dashboard/goals");
  revalidatePath("/dashboard/user/expenses");
  revalidatePath("/dashboard");
}
