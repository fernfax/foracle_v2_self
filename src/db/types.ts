/**
 * Entity types inferred from the Drizzle schema — the single source of truth.
 *
 * Import these instead of hand-declaring `interface VehicleAsset { ... }` in
 * components. Add or rename a column in `schema.ts` and every consumer updates
 * (or fails to compile) automatically — no silent drift.
 *
 * `<Table>` is the row shape (`$inferSelect`); `New<Table>` is the insert shape
 * (`$inferInsert`). For rows that come back from an action with JOINed columns
 * (e.g. an income with its family member), derive from the action instead:
 *   type IncomeRow = Awaited<ReturnType<typeof getIncomes>>[number]
 */
import type {
  currentHoldings,
  expenses,
  familyMembers,
  goals,
  incomes,
  investmentPolicies,
  policies,
  propertyAssets,
  users,
  vehicleAssets
} from "@/db/schema"

export type User = typeof users.$inferSelect

export type FamilyMember = typeof familyMembers.$inferSelect
export type NewFamilyMember = typeof familyMembers.$inferInsert

export type Expense = typeof expenses.$inferSelect
export type NewExpense = typeof expenses.$inferInsert

export type Income = typeof incomes.$inferSelect
export type NewIncome = typeof incomes.$inferInsert

export type PropertyAsset = typeof propertyAssets.$inferSelect
export type NewPropertyAsset = typeof propertyAssets.$inferInsert

export type VehicleAsset = typeof vehicleAssets.$inferSelect
export type NewVehicleAsset = typeof vehicleAssets.$inferInsert

export type Policy = typeof policies.$inferSelect
export type NewPolicy = typeof policies.$inferInsert

export type Goal = typeof goals.$inferSelect
export type NewGoal = typeof goals.$inferInsert

export type CurrentHolding = typeof currentHoldings.$inferSelect
export type NewCurrentHolding = typeof currentHoldings.$inferInsert

export type Investment = typeof investmentPolicies.$inferSelect
export type NewInvestment = typeof investmentPolicies.$inferInsert
