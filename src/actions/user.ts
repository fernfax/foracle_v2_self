"use server"

import { db } from "@/db"
import { eq } from "drizzle-orm"

import { getCurrentUserAndFamily } from "@/lib/auth-context"
import {
  expenses,
  familyMembers,
  goals,
  incomes,
  policies,
  propertyAssets,
  vehicleAssets
} from "@/db/schema"

/**
 * Get the current authenticated user's Clerk ID.
 * Throws error if user is not authenticated.
 */
export async function getCurrentUserId() {
  const { userId } = await getCurrentUserAndFamily()
  return userId
}

/**
 * Get all incomes for the caller's family.
 */
export async function getUserIncomes() {
  const { familyId } = await getCurrentUserAndFamily()
  // Canonical income source is incomes (monthly-only). Synthesize the
  // legacy frequency/customMonths fields so dashboard metrics keep working.
  const rows = await db.query.incomes.findMany({
    where: eq(incomes.familyId, familyId),
    orderBy: (incomes, { desc }) => [desc(incomes.createdAt)]
  })
  return rows.map((r) => ({
    ...r,
    frequency: "monthly" as string,
    customMonths: null as string | null
  }))
}

/**
 * Get all expenses for the caller's family.
 */
export async function getUserExpenses() {
  const { familyId } = await getCurrentUserAndFamily()
  return db.query.expenses.findMany({
    where: eq(expenses.familyId, familyId),
    orderBy: (expenses, { desc }) => [desc(expenses.createdAt)]
  })
}

/**
 * Get all property assets for the caller's family.
 */
export async function getUserPropertyAssets() {
  const { familyId } = await getCurrentUserAndFamily()
  return db.query.propertyAssets.findMany({
    where: eq(propertyAssets.familyId, familyId),
    orderBy: (propertyAssets, { desc }) => [desc(propertyAssets.createdAt)]
  })
}

/**
 * Get all vehicle assets for the caller's family.
 */
export async function getUserVehicleAssets() {
  const { familyId } = await getCurrentUserAndFamily()
  return db.query.vehicleAssets.findMany({
    where: eq(vehicleAssets.familyId, familyId),
    orderBy: (vehicleAssets, { desc }) => [desc(vehicleAssets.createdAt)]
  })
}

/**
 * Get all policies for the caller's family.
 */
export async function getUserPolicies() {
  const { familyId } = await getCurrentUserAndFamily()
  return db.query.policies.findMany({
    where: eq(policies.familyId, familyId),
    orderBy: (policies, { desc }) => [desc(policies.createdAt)]
  })
}

/**
 * Get all goals for the caller's family.
 */
export async function getUserGoals() {
  const { familyId } = await getCurrentUserAndFamily()
  return db.query.goals.findMany({
    where: eq(goals.familyId, familyId),
    orderBy: (goals, { desc }) => [desc(goals.createdAt)]
  })
}

/**
 * Get all family members for the caller's family.
 */
export async function getUserFamilyMembers() {
  const { familyId } = await getCurrentUserAndFamily()
  return db.query.familyMembers.findMany({
    where: eq(familyMembers.familyId, familyId),
    orderBy: (familyMembers, { desc }) => [desc(familyMembers.createdAt)]
  })
}

/**
 * Get dashboard metrics for the caller's family.
 * Calculates aggregated financial data across all family members.
 */
export async function getDashboardMetrics() {
  // Get all family data
  const [
    userIncomes,
    userExpenses,
    userPropertyAssets,
    userVehicleAssets,
    userGoals,
    userFamily
  ] = await Promise.all([
    getUserIncomes(),
    getUserExpenses(),
    getUserPropertyAssets(),
    getUserVehicleAssets(),
    getUserGoals(),
    getUserFamilyMembers()
  ])

  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1 // 1-12

  // Calculate monthly net income (after CPF, only active incomes)
  const monthlyNetIncome = userIncomes
    .filter((income) => {
      if (!income.isActive) return false

      // Check if income is active in current month
      const startDate = new Date(income.startDate)
      const endDate = income.endDate ? new Date(income.endDate) : null

      if (currentDate < startDate) return false
      if (endDate && currentDate > endDate) return false

      // Check frequency (case-insensitive)
      const frequency = income.frequency.toLowerCase()
      if (frequency === "monthly") return true
      if (frequency === "custom" && income.customMonths) {
        try {
          const customMonths = JSON.parse(income.customMonths)
          return customMonths.includes(currentMonth)
        } catch {
          return false
        }
      }

      return false
    })
    .reduce((sum, income) => {
      // Use net take home if subject to CPF, otherwise use full amount
      if (income.subjectToCpf && income.netTakeHome) {
        return sum + parseFloat(income.netTakeHome)
      }
      return sum + parseFloat(income.amount)
    }, 0)

  // Calculate current month expenses (only active expenses in current month)
  // Includes: monthly, custom (if current month selected), one-time (if in current month)
  const monthlyExpenses = userExpenses
    .filter((expense) => {
      if (!expense.isActive) return false

      // Check if expense is active in current month
      // For recurring expenses (current-recurring), startDate may be null - treat as always valid
      const startDate = expense.startDate ? new Date(expense.startDate) : null
      const endDate = expense.endDate ? new Date(expense.endDate) : null

      // Skip check if no startDate - always valid (recurring expenses)
      if (startDate && currentDate < startDate) return false
      if (endDate && currentDate > endDate) return false

      // Check frequency (case-insensitive)
      const frequency = expense.frequency.toLowerCase()
      if (frequency === "monthly") return true
      if (frequency === "custom" && expense.customMonths) {
        try {
          const customMonths = JSON.parse(expense.customMonths)
          return customMonths.includes(currentMonth)
        } catch {
          return false
        }
      }
      if (frequency === "one-time" && startDate) {
        // Check if one-time expense is in current month
        const expenseMonth = startDate.getMonth() + 1
        const expenseYear = startDate.getFullYear()
        const currentYear = currentDate.getFullYear()
        return expenseMonth === currentMonth && expenseYear === currentYear
      }

      return false
    })
    .reduce((sum, expense) => sum + parseFloat(expense.amount), 0)

  // Calculate total assets value (equity-based)
  // Property equity = Original purchase price - Outstanding loan
  const propertyEquity = userPropertyAssets
    .filter((property) => property.isActive !== false)
    .reduce((sum, property) => {
      const purchasePrice = parseFloat(property.originalPurchasePrice)
      const outstandingLoan = parseFloat(property.outstandingLoan)
      const equity = purchasePrice - outstandingLoan
      return sum + equity
    }, 0)

  // Vehicle equity = Original purchase price - Remaining loan (loan taken - loan repaid)
  const vehicleEquity = userVehicleAssets
    .filter((vehicle) => vehicle.isActive !== false)
    .reduce((sum, vehicle) => {
      const purchasePrice = parseFloat(vehicle.originalPurchasePrice)
      const loanTaken = parseFloat(vehicle.loanAmountTaken || "0")
      const loanRepaid = parseFloat(vehicle.loanAmountRepaid || "0")
      const remainingLoan = loanTaken - loanRepaid
      const equity = purchasePrice - remainingLoan
      return sum + equity
    }, 0)

  const totalAssets = propertyEquity + vehicleEquity

  // Count active goals (not achieved and active)
  const activeGoals = userGoals.filter(
    (goal) => goal.isAchieved !== true && goal.isActive !== false
  ).length

  return {
    totalIncome: monthlyNetIncome,
    totalExpenses: monthlyExpenses,
    netSavings: monthlyNetIncome - monthlyExpenses,
    totalAssets,
    activeGoals,
    familyMembers: userFamily.length
  }
}
