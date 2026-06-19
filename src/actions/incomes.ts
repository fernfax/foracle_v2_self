"use server"

import { revalidatePath } from "next/cache"

import { getCurrentUserAndFamily } from "@/lib/auth-context"
import { effectiveIncomeCategory } from "@/lib/finance/income-category"
import {
  createIncome as createIncomeService,
  deleteIncome as deleteIncomeService,
  listIncomes,
  toggleIncomeActive,
  updateIncome as updateIncomeService
} from "@/lib/services/incomes"

// The income UI still passes legacy enum values like "current-recurring" when
// patching incomeCategory. Coerce to the new 3-value taxonomy at the boundary
// so the UI doesn't have to change in lock-step.
function normalizeIncomeCategory(
  v: string | undefined | null
): "past" | "current" | "future" | undefined {
  if (v === undefined || v === null) return undefined
  if (v === "past" || v === "current" || v === "future") return v
  if (v === "future-recurring") return "future"
  return "current"
}

/**
 * Read all incomes for the caller's family. Income rows are always monthly
 * recurring; "one-off" income is modelled as start_date == end_date. The
 * monthly `frequency`/`customMonths` are synthesized so income rows satisfy the
 * shared monthly-allocation calculators (income-month, balance-calculator,
 * cashflow-sankey, household-summary) that also serve expenses — those fields
 * are load-bearing on the read path, never user-set on the income write path.
 */
export async function getIncomes() {
  const ctx = await getCurrentUserAndFamily()
  const rows = await listIncomes(ctx)
  return rows.map((r) => ({
    ...r,
    // A "future" income whose start date has arrived reads as "current" (see
    // lib/income-category). Non-destructive — derived fresh on every read.
    incomeCategory: effectiveIncomeCategory(r.incomeCategory, r.startDate),
    frequency: "monthly" as string,
    customMonths: null as string | null
  }))
}

export async function createIncome(data: {
  name: string
  category: string
  incomeCategory?: string
  amount: number
  subjectToCpf: boolean
  accountForBonus?: boolean
  bonusGroups?: string
  startDate: string
  endDate?: string
  pastIncomeHistory?: string | null
  futureMilestones?: string | null
  accountForFutureChange?: boolean
  description?: string
  familyMemberId?: string
  familyMemberAge?: number
  cpfOrdinaryAccount?: number
  cpfSpecialAccount?: number
  cpfMedisaveAccount?: number
}) {
  const ctx = await getCurrentUserAndFamily()
  const row = await createIncomeService(ctx, {
    name: data.name,
    category: data.category,
    incomeCategory: normalizeIncomeCategory(data.incomeCategory),
    amount: data.amount.toString(),
    startDate: data.startDate,
    endDate: data.endDate,
    subjectToCpf: data.subjectToCpf,
    accountForBonus: data.accountForBonus,
    bonusGroups: data.bonusGroups,
    description: data.description,
    familyMemberId: data.familyMemberId,
    familyMemberAge: data.familyMemberAge,
    pastIncomeHistory: data.pastIncomeHistory,
    futureMilestones: data.futureMilestones,
    accountForFutureChange: data.accountForFutureChange,
    cpfOrdinaryAccount: data.cpfOrdinaryAccount?.toString(),
    cpfSpecialAccount: data.cpfSpecialAccount?.toString(),
    cpfMedisaveAccount: data.cpfMedisaveAccount?.toString()
  })
  revalidatePath("/user", "layout")
  return row
}

export async function updateIncome(
  id: string,
  data: {
    name?: string
    category?: string
    incomeCategory?: string
    amount?: number
    subjectToCpf?: boolean
    accountForBonus?: boolean
    bonusGroups?: string | null
    startDate?: string
    endDate?: string | null
    pastIncomeHistory?: string | null
    futureMilestones?: string | null
    accountForFutureChange?: boolean
    description?: string
    isActive?: boolean
    familyMemberId?: string | null
    familyMemberAge?: number
    cpfOrdinaryAccount?: number
    cpfSpecialAccount?: number
    cpfMedisaveAccount?: number
  }
) {
  const ctx = await getCurrentUserAndFamily()
  const patch: Parameters<typeof updateIncomeService>[2] = {}
  if (data.name !== undefined) patch.name = data.name
  if (data.category !== undefined) patch.category = data.category
  if (data.incomeCategory !== undefined) {
    const norm = normalizeIncomeCategory(data.incomeCategory)
    if (norm) patch.incomeCategory = norm
  }
  if (data.amount !== undefined) patch.amount = data.amount.toString()
  if (data.subjectToCpf !== undefined) patch.subjectToCpf = data.subjectToCpf
  if (data.accountForBonus !== undefined)
    patch.accountForBonus = data.accountForBonus
  if (data.bonusGroups !== undefined) patch.bonusGroups = data.bonusGroups
  if (data.startDate !== undefined) patch.startDate = data.startDate
  if (data.endDate !== undefined) patch.endDate = data.endDate
  if (data.pastIncomeHistory !== undefined)
    patch.pastIncomeHistory = data.pastIncomeHistory
  if (data.futureMilestones !== undefined)
    patch.futureMilestones = data.futureMilestones
  if (data.accountForFutureChange !== undefined)
    patch.accountForFutureChange = data.accountForFutureChange
  if (data.description !== undefined) patch.description = data.description
  if (data.isActive !== undefined) patch.isActive = data.isActive
  if (data.familyMemberId !== undefined)
    patch.familyMemberId = data.familyMemberId
  if (data.familyMemberAge !== undefined)
    patch.familyMemberAge = data.familyMemberAge
  if (data.cpfOrdinaryAccount !== undefined)
    patch.cpfOrdinaryAccount = data.cpfOrdinaryAccount.toString()
  if (data.cpfSpecialAccount !== undefined)
    patch.cpfSpecialAccount = data.cpfSpecialAccount.toString()
  if (data.cpfMedisaveAccount !== undefined)
    patch.cpfMedisaveAccount = data.cpfMedisaveAccount.toString()

  const row = await updateIncomeService(ctx, id, patch)
  revalidatePath("/user", "layout")
  return row
}

export async function deleteIncome(id: string) {
  const ctx = await getCurrentUserAndFamily()
  await deleteIncomeService(ctx, id)
  revalidatePath("/user", "layout")
  return { success: true }
}

export async function toggleIncomeStatus(id: string) {
  const ctx = await getCurrentUserAndFamily()
  const row = await toggleIncomeActive(ctx, id)
  revalidatePath("/user", "layout")
  return row
}
