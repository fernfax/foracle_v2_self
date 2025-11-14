"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, incomes, expenses, assets, policies, goals, familyMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the current authenticated user's ID
 * Throws error if user is not authenticated
 */
export async function getCurrentUserId() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}

/**
 * Get the current user's profile from the database
 */
export async function getCurrentUser() {
  const userId = await getCurrentUserId();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  return user;
}

/**
 * Get all incomes for the current user
 * Ensures data isolation - users can only see their own data
 */
export async function getUserIncomes() {
  const userId = await getCurrentUserId();

  const userIncomes = await db.query.incomes.findMany({
    where: eq(incomes.userId, userId),
    orderBy: (incomes, { desc }) => [desc(incomes.createdAt)],
  });

  return userIncomes;
}

/**
 * Get all expenses for the current user
 * Ensures data isolation - users can only see their own data
 */
export async function getUserExpenses() {
  const userId = await getCurrentUserId();

  const userExpenses = await db.query.expenses.findMany({
    where: eq(expenses.userId, userId),
    orderBy: (expenses, { desc }) => [desc(expenses.date)],
  });

  return userExpenses;
}

/**
 * Get all assets for the current user
 * Ensures data isolation - users can only see their own data
 */
export async function getUserAssets() {
  const userId = await getCurrentUserId();

  const userAssets = await db.query.assets.findMany({
    where: eq(assets.userId, userId),
    orderBy: (assets, { desc }) => [desc(assets.createdAt)],
  });

  return userAssets;
}

/**
 * Get all policies for the current user
 * Ensures data isolation - users can only see their own data
 */
export async function getUserPolicies() {
  const userId = await getCurrentUserId();

  const userPolicies = await db.query.policies.findMany({
    where: eq(policies.userId, userId),
    orderBy: (policies, { desc }) => [desc(policies.createdAt)],
  });

  return userPolicies;
}

/**
 * Get all goals for the current user
 * Ensures data isolation - users can only see their own data
 */
export async function getUserGoals() {
  const userId = await getCurrentUserId();

  const userGoals = await db.query.goals.findMany({
    where: eq(goals.userId, userId),
    orderBy: (goals, { desc }) => [desc(goals.createdAt)],
  });

  return userGoals;
}

/**
 * Get all family members for the current user
 * Ensures data isolation - users can only see their own data
 */
export async function getUserFamilyMembers() {
  const userId = await getCurrentUserId();

  const userFamily = await db.query.familyMembers.findMany({
    where: eq(familyMembers.userId, userId),
    orderBy: (familyMembers, { desc }) => [desc(familyMembers.createdAt)],
  });

  return userFamily;
}

/**
 * Get dashboard metrics for the current user
 * Calculates aggregated financial data
 */
export async function getDashboardMetrics() {
  const userId = await getCurrentUserId();

  // Get all user data
  const [userIncomes, userExpenses, userAssets, userGoals, userFamily] = await Promise.all([
    getUserIncomes(),
    getUserExpenses(),
    getUserAssets(),
    getUserGoals(),
    getUserFamilyMembers(),
  ]);

  // Calculate monthly income (only active incomes)
  const monthlyIncome = userIncomes
    .filter(income => income.isActive && income.frequency === 'monthly')
    .reduce((sum, income) => sum + parseFloat(income.amount), 0);

  // Calculate monthly expenses (recurring only)
  const monthlyExpenses = userExpenses
    .filter(expense => expense.isRecurring && expense.frequency === 'monthly')
    .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

  // Calculate total assets value
  const totalAssets = userAssets
    .reduce((sum, asset) => sum + parseFloat(asset.currentValue), 0);

  // Count active goals (not achieved)
  const activeGoals = userGoals.filter(goal => !goal.isAchieved).length;

  return {
    totalIncome: monthlyIncome,
    totalExpenses: monthlyExpenses,
    netSavings: monthlyIncome - monthlyExpenses,
    totalAssets,
    activeGoals,
    familyMembers: userFamily.length,
  };
}
