"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, incomes, expenses, assets, propertyAssets, vehicleAssets, policies, goals, familyMembers } from "@/db/schema";
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
    orderBy: (expenses, { desc }) => [desc(expenses.createdAt)],
  });

  return userExpenses;
}

/**
 * Get all assets for the current user (generic assets table)
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
 * Get all property assets for the current user
 */
export async function getUserPropertyAssets() {
  const userId = await getCurrentUserId();

  const userPropertyAssets = await db.query.propertyAssets.findMany({
    where: eq(propertyAssets.userId, userId),
    orderBy: (propertyAssets, { desc }) => [desc(propertyAssets.createdAt)],
  });

  return userPropertyAssets;
}

/**
 * Get all vehicle assets for the current user
 */
export async function getUserVehicleAssets() {
  const userId = await getCurrentUserId();

  const userVehicleAssets = await db.query.vehicleAssets.findMany({
    where: eq(vehicleAssets.userId, userId),
    orderBy: (vehicleAssets, { desc }) => [desc(vehicleAssets.createdAt)],
  });

  return userVehicleAssets;
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
  const [userIncomes, userExpenses, userPropertyAssets, userVehicleAssets, userGoals, userFamily] = await Promise.all([
    getUserIncomes(),
    getUserExpenses(),
    getUserPropertyAssets(),
    getUserVehicleAssets(),
    getUserGoals(),
    getUserFamilyMembers(),
  ]);

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12

  // Calculate monthly net income (after CPF, only active incomes)
  const monthlyNetIncome = userIncomes
    .filter(income => {
      if (!income.isActive) return false;

      // Check if income is active in current month
      const startDate = new Date(income.startDate);
      const endDate = income.endDate ? new Date(income.endDate) : null;

      if (currentDate < startDate) return false;
      if (endDate && currentDate > endDate) return false;

      // Check frequency (case-insensitive)
      const frequency = income.frequency.toLowerCase();
      if (frequency === 'monthly') return true;
      if (frequency === 'custom' && income.customMonths) {
        try {
          const customMonths = JSON.parse(income.customMonths);
          return customMonths.includes(currentMonth);
        } catch {
          return false;
        }
      }

      return false;
    })
    .reduce((sum, income) => {
      // Use net take home if subject to CPF, otherwise use full amount
      if (income.subjectToCpf && income.netTakeHome) {
        return sum + parseFloat(income.netTakeHome);
      }
      return sum + parseFloat(income.amount);
    }, 0);

  // Calculate current month expenses (only active expenses in current month)
  // Includes: monthly, custom (if current month selected), one-time (if in current month)
  const monthlyExpenses = userExpenses
    .filter(expense => {
      if (!expense.isActive) return false;

      // Check if expense is active in current month
      // For recurring expenses (current-recurring), startDate may be null - treat as always valid
      const startDate = expense.startDate ? new Date(expense.startDate) : null;
      const endDate = expense.endDate ? new Date(expense.endDate) : null;

      // Skip check if no startDate - always valid (recurring expenses)
      if (startDate && currentDate < startDate) return false;
      if (endDate && currentDate > endDate) return false;

      // Check frequency (case-insensitive)
      const frequency = expense.frequency.toLowerCase();
      if (frequency === 'monthly') return true;
      if (frequency === 'custom' && expense.customMonths) {
        try {
          const customMonths = JSON.parse(expense.customMonths);
          return customMonths.includes(currentMonth);
        } catch {
          return false;
        }
      }
      if (frequency === 'one-time' && startDate) {
        // Check if one-time expense is in current month
        const expenseMonth = startDate.getMonth() + 1;
        const expenseYear = startDate.getFullYear();
        const currentYear = currentDate.getFullYear();
        return expenseMonth === currentMonth && expenseYear === currentYear;
      }

      return false;
    })
    .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

  // Calculate total assets value (equity-based)
  // Property equity = Original purchase price - Outstanding loan
  const propertyEquity = userPropertyAssets
    .filter(property => property.isActive !== false)
    .reduce((sum, property) => {
      const purchasePrice = parseFloat(property.originalPurchasePrice);
      const outstandingLoan = parseFloat(property.outstandingLoan);
      const equity = purchasePrice - outstandingLoan;
      return sum + equity;
    }, 0);

  // Vehicle equity = Original purchase price - Remaining loan (loan taken - loan repaid)
  const vehicleEquity = userVehicleAssets
    .filter(vehicle => vehicle.isActive !== false)
    .reduce((sum, vehicle) => {
      const purchasePrice = parseFloat(vehicle.originalPurchasePrice);
      const loanTaken = parseFloat(vehicle.loanAmountTaken || "0");
      const loanRepaid = parseFloat(vehicle.loanAmountRepaid || "0");
      const remainingLoan = loanTaken - loanRepaid;
      const equity = purchasePrice - remainingLoan;
      return sum + equity;
    }, 0);

  const totalAssets = propertyEquity + vehicleEquity;

  // Count active goals (not achieved and active)
  const activeGoals = userGoals.filter(goal => goal.isAchieved !== true && goal.isActive !== false).length;

  return {
    totalIncome: monthlyNetIncome,
    totalExpenses: monthlyExpenses,
    netSavings: monthlyNetIncome - monthlyExpenses,
    totalAssets,
    activeGoals,
    familyMembers: userFamily.length,
  };
}
