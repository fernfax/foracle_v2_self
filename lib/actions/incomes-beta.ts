"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import { effectiveIncomeCategory } from "@/lib/income-category";
import {
  createIncome,
  deleteIncome,
  listIncomes,
  toggleIncomeActive,
  updateIncome,
} from "@/lib/services/incomes";

// The IncomesBetaView still passes legacy enum values like "current-recurring"
// when patching incomeCategory. Coerce to the new 3-value taxonomy at the
// boundary so the UI doesn't have to change in lock-step.
function normalizeIncomeCategory(
  v: string | undefined | null
): "past" | "current" | "future" | undefined {
  if (v === undefined || v === null) return undefined;
  if (v === "past" || v === "current" || v === "future") return v;
  if (v === "future-recurring") return "future";
  return "current";
}

/**
 * Read all incomes for the caller's family. Synthesizes `frequency: 'monthly'`
 * and `customMonths: null` on each row so the existing inline `Income` type in
 * `IncomesBetaView` (which still references those fields) continues to
 * compile. Beta rows are always monthly recurring; "one-off" income is
 * modelled as start_date == end_date.
 */
export async function getIncomesBeta() {
  const ctx = await getCurrentUserAndFamily();
  const rows = await listIncomes(ctx);
  return rows.map((r) => ({
    ...r,
    // A "future" income whose start date has arrived reads as "current" (see
    // lib/income-category). Non-destructive — derived fresh on every read.
    incomeCategory: effectiveIncomeCategory(r.incomeCategory, r.startDate),
    frequency: "monthly" as const,
    customMonths: null as string | null,
  }));
}

export async function createIncomeBeta(data: {
  name: string;
  category: string;
  incomeCategory?: string;
  amount: number;
  // Accepted-and-ignored — the existing creator drawer still has a frequency
  // picker. Beta is monthly-only by design (see plan), so these are dropped
  // here. Removing them from the drawer is a separate UI task.
  frequency?: string;
  customMonths?: string | null;
  subjectToCpf: boolean;
  accountForBonus?: boolean;
  bonusGroups?: string;
  startDate: string;
  endDate?: string;
  pastIncomeHistory?: string | null;
  futureMilestones?: string | null;
  accountForFutureChange?: boolean;
  description?: string;
  familyMemberId?: string;
  familyMemberAge?: number;
  cpfOrdinaryAccount?: number;
  cpfSpecialAccount?: number;
  cpfMedisaveAccount?: number;
}) {
  const ctx = await getCurrentUserAndFamily();
  const row = await createIncome(ctx, {
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
    cpfMedisaveAccount: data.cpfMedisaveAccount?.toString(),
  });
  revalidatePath("/user");
  return row;
}

export async function updateIncomeBeta(
  id: string,
  data: {
    name?: string;
    category?: string;
    incomeCategory?: string;
    amount?: number;
    // Accepted-and-ignored. See createIncomeBeta.
    frequency?: string;
    customMonths?: string | null;
    subjectToCpf?: boolean;
    accountForBonus?: boolean;
    bonusGroups?: string | null;
    startDate?: string;
    endDate?: string | null;
    pastIncomeHistory?: string | null;
    futureMilestones?: string | null;
    accountForFutureChange?: boolean;
    description?: string;
    isActive?: boolean;
    familyMemberId?: string | null;
    familyMemberAge?: number;
    cpfOrdinaryAccount?: number;
    cpfSpecialAccount?: number;
    cpfMedisaveAccount?: number;
  }
) {
  const ctx = await getCurrentUserAndFamily();
  const patch: Parameters<typeof updateIncome>[2] = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.category !== undefined) patch.category = data.category;
  if (data.incomeCategory !== undefined) {
    const norm = normalizeIncomeCategory(data.incomeCategory);
    if (norm) patch.incomeCategory = norm;
  }
  if (data.amount !== undefined) patch.amount = data.amount.toString();
  if (data.subjectToCpf !== undefined) patch.subjectToCpf = data.subjectToCpf;
  if (data.accountForBonus !== undefined) patch.accountForBonus = data.accountForBonus;
  if (data.bonusGroups !== undefined) patch.bonusGroups = data.bonusGroups;
  if (data.startDate !== undefined) patch.startDate = data.startDate;
  if (data.endDate !== undefined) patch.endDate = data.endDate;
  if (data.pastIncomeHistory !== undefined) patch.pastIncomeHistory = data.pastIncomeHistory;
  if (data.futureMilestones !== undefined) patch.futureMilestones = data.futureMilestones;
  if (data.accountForFutureChange !== undefined) patch.accountForFutureChange = data.accountForFutureChange;
  if (data.description !== undefined) patch.description = data.description;
  if (data.isActive !== undefined) patch.isActive = data.isActive;
  if (data.familyMemberId !== undefined) patch.familyMemberId = data.familyMemberId;
  if (data.familyMemberAge !== undefined) patch.familyMemberAge = data.familyMemberAge;
  if (data.cpfOrdinaryAccount !== undefined) patch.cpfOrdinaryAccount = data.cpfOrdinaryAccount.toString();
  if (data.cpfSpecialAccount !== undefined) patch.cpfSpecialAccount = data.cpfSpecialAccount.toString();
  if (data.cpfMedisaveAccount !== undefined) patch.cpfMedisaveAccount = data.cpfMedisaveAccount.toString();

  const row = await updateIncome(ctx, id, patch);
  revalidatePath("/user");
  return row;
}

export async function deleteIncomeBeta(id: string) {
  const ctx = await getCurrentUserAndFamily();
  await deleteIncome(ctx, id);
  revalidatePath("/user");
  return { success: true };
}

export async function toggleIncomeBetaStatus(id: string) {
  const ctx = await getCurrentUserAndFamily();
  const row = await toggleIncomeActive(ctx, id);
  revalidatePath("/user");
  return row;
}
