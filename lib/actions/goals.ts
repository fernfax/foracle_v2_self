"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  createGoal as createGoalService,
  deleteGoal as deleteGoalService,
  listGoals,
  markGoalAchieved as markGoalAchievedService,
  updateGoal as updateGoalService,
} from "@/lib/services/goals";

/**
 * Create a new goal. When addToExpenditures + monthlyContribution>0, the
 * service auto-creates a linked recurring "Savings" expense.
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
  const ctx = await getCurrentUserAndFamily();
  const row = await createGoalService(ctx, {
    goalName: data.goalName,
    goalType: data.goalType,
    targetAmount: data.targetAmount.toString(),
    targetDate: data.targetDate,
    currentAmountSaved: data.currentAmountSaved?.toString(),
    monthlyContribution: data.monthlyContribution?.toString(),
    description: data.description,
    addToExpenditures: data.addToExpenditures,
    expenseName: data.expenseName,
  });
  revalidatePath("/goals");
  revalidatePath("/expenses");
  revalidatePath("/overview");
  return row;
}

/**
 * Get all goals for the current user
 */
export async function getGoals() {
  const ctx = await getCurrentUserAndFamily();
  return listGoals(ctx);
}

/**
 * Get active goals (not achieved and active)
 */
export async function getActiveGoals() {
  const ctx = await getCurrentUserAndFamily();
  return listGoals(ctx, { isActive: true, isAchieved: false });
}

/**
 * Get achieved goals
 */
export async function getAchievedGoals() {
  const ctx = await getCurrentUserAndFamily();
  return listGoals(ctx, { isAchieved: true });
}

/**
 * Update an existing goal. Syncs the linked Savings expense based on
 * addToExpenditures + monthlyContribution.
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
  const ctx = await getCurrentUserAndFamily();
  const row = await updateGoalService(ctx, id, {
    goalName: data.goalName,
    goalType: data.goalType,
    targetAmount: data.targetAmount.toString(),
    targetDate: data.targetDate,
    currentAmountSaved: (data.currentAmountSaved ?? 0).toString(),
    monthlyContribution: data.monthlyContribution?.toString() ?? null,
    description: data.description ?? null,
    isAchieved: data.isAchieved ?? false,
    addToExpenditures: data.addToExpenditures,
    expenseName: data.expenseName,
  });
  revalidatePath("/goals");
  revalidatePath("/expenses");
  revalidatePath("/overview");
  return row;
}

/**
 * Mark a goal as achieved
 */
export async function markGoalAchieved(id: string) {
  const ctx = await getCurrentUserAndFamily();
  const row = await markGoalAchievedService(ctx, id);
  revalidatePath("/goals");
  revalidatePath("/overview");
  return row;
}

/**
 * Delete a goal (and any linked Savings expense)
 */
export async function deleteGoal(id: string) {
  const ctx = await getCurrentUserAndFamily();
  await deleteGoalService(ctx, id);
  revalidatePath("/goals");
  revalidatePath("/expenses");
  revalidatePath("/overview");
}
