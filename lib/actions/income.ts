"use server";

import { db } from "@/db";
import { incomesBeta } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { resolveCpfFields } from "@/lib/services/incomes";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import { effectiveIncomeCategory } from "@/lib/income-category";

// `incomes_beta` is the canonical income table: a 3-value category
// (past / current / future) and monthly-only. Map the legacy enum; the
// frequency/customMonths fields the old table carried are dropped.
function toBetaIncomeCategory(
  v: string | undefined | null
): "past" | "current" | "future" {
  if (v === "past" || v === "current" || v === "future") return v;
  if (v === "future-recurring") return "future";
  return "current";
}

/**
 * Create a new income record
 */
export async function createIncome(data: {
  name: string;
  category: string;
  incomeCategory?: string;
  amount: number;
  frequency: string;
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
  const { userId, familyId } = await getCurrentUserAndFamily();

  // Reject non-positive / NaN amounts (the legacy modal sends a number, not the
  // zod schema the beta path enforces).
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  // CPF via the shared member+DOB resolver (no member / no DOB → CPF off; age
  // from the member's DOB, never the client). Same path the beta action uses.
  const cpf = await resolveCpfFields({
    subjectToCpf: data.subjectToCpf,
    amount: data.amount,
    familyId,
    familyMemberId: data.familyMemberId || null,
  });

  const newIncome = await db.insert(incomesBeta).values({
    id: nanoid(),
    userId,
    familyId,
    familyMemberId: data.familyMemberId || null,
    name: data.name,
    category: data.category,
    incomeCategory: toBetaIncomeCategory(data.incomeCategory),
    amount: data.amount.toString(),
    subjectToCpf: data.subjectToCpf,
    accountForBonus: data.accountForBonus || false,
    bonusGroups: data.bonusGroups || null,
    employeeCpfContribution: cpf.employeeCpfContribution,
    employerCpfContribution: cpf.employerCpfContribution,
    netTakeHome: cpf.netTakeHome,
    cpfRatesVersion: cpf.cpfRatesVersion,
    cpfOrdinaryAccount: data.cpfOrdinaryAccount ? data.cpfOrdinaryAccount.toString() : null,
    cpfSpecialAccount: data.cpfSpecialAccount ? data.cpfSpecialAccount.toString() : null,
    cpfMedisaveAccount: data.cpfMedisaveAccount ? data.cpfMedisaveAccount.toString() : null,
    startDate: data.startDate,
    endDate: data.endDate || null,
    pastIncomeHistory: data.pastIncomeHistory || null,
    futureMilestones: data.futureMilestones || null,
    accountForFutureChange: data.accountForFutureChange || false,
    description: data.description || null,
    isActive: true,
  }).returning();

  revalidatePath("/user");
  return { ...newIncome[0], frequency: "monthly" as string, customMonths: null as string | null };
}

/**
 * Update an existing income record
 */
export async function updateIncome(
  id: string,
  data: {
    name?: string;
    category?: string;
    incomeCategory?: string;
    amount?: number;
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
  const { familyId } = await getCurrentUserAndFamily();

  // Reject a non-positive / NaN amount when one is supplied.
  if (
    data.amount !== undefined &&
    (!Number.isFinite(data.amount) || data.amount <= 0)
  ) {
    throw new Error("Amount must be greater than 0");
  }

  // Verify the row belongs to caller's family
  const existing = await db.query.incomesBeta.findFirst({
    where: and(eq(incomesBeta.id, id), eq(incomesBeta.familyId, familyId)),
  });

  if (!existing) {
    throw new Error("Income not found or access denied");
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.incomeCategory !== undefined) updateData.incomeCategory = toBetaIncomeCategory(data.incomeCategory);
  if (data.amount !== undefined) updateData.amount = data.amount.toString();
  if (data.subjectToCpf !== undefined) updateData.subjectToCpf = data.subjectToCpf;
  if (data.accountForBonus !== undefined) updateData.accountForBonus = data.accountForBonus;
  if (data.bonusGroups !== undefined) updateData.bonusGroups = data.bonusGroups;
  if (data.startDate !== undefined) updateData.startDate = data.startDate;
  if (data.endDate !== undefined) updateData.endDate = data.endDate;
  if (data.pastIncomeHistory !== undefined) updateData.pastIncomeHistory = data.pastIncomeHistory;
  if (data.futureMilestones !== undefined) updateData.futureMilestones = data.futureMilestones;
  if (data.accountForFutureChange !== undefined) updateData.accountForFutureChange = data.accountForFutureChange;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.familyMemberId !== undefined) updateData.familyMemberId = data.familyMemberId || null;
  if (data.cpfOrdinaryAccount !== undefined) updateData.cpfOrdinaryAccount = data.cpfOrdinaryAccount.toString();
  if (data.cpfSpecialAccount !== undefined) updateData.cpfSpecialAccount = data.cpfSpecialAccount.toString();
  if (data.cpfMedisaveAccount !== undefined) updateData.cpfMedisaveAccount = data.cpfMedisaveAccount.toString();

  // Recompute CPF via the shared member+DOB resolver (no member / no DOB → off;
  // age from the member's DOB only). Recompute on every update so an amount or
  // member change is always reflected.
  const finalAmount = data.amount !== undefined ? data.amount : parseFloat(existing.amount);
  const finalSubjectToCpf =
    data.subjectToCpf !== undefined ? data.subjectToCpf : existing.subjectToCpf;
  const effectiveFamilyMemberId =
    data.familyMemberId !== undefined ? data.familyMemberId : existing.familyMemberId;

  const cpf = await resolveCpfFields({
    subjectToCpf: !!finalSubjectToCpf,
    amount: finalAmount,
    familyId,
    familyMemberId: effectiveFamilyMemberId ?? null,
  });
  updateData.employeeCpfContribution = cpf.employeeCpfContribution;
  updateData.employerCpfContribution = cpf.employerCpfContribution;
  updateData.netTakeHome = cpf.netTakeHome;
  updateData.cpfRatesVersion = cpf.cpfRatesVersion;

  const updated = await db
    .update(incomesBeta)
    .set(updateData)
    .where(and(eq(incomesBeta.id, id), eq(incomesBeta.familyId, familyId)))
    .returning();

  revalidatePath("/user");
  return { ...updated[0], frequency: "monthly" as string, customMonths: null as string | null };
}

/**
 * Delete an income record
 */
export async function deleteIncome(id: string) {
  const { familyId } = await getCurrentUserAndFamily();

  // Verify the row belongs to caller's family and get family member details
  const existing = await db.query.incomesBeta.findFirst({
    where: and(eq(incomesBeta.id, id), eq(incomesBeta.familyId, familyId)),
    with: {
      familyMember: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error("Income not found or access denied");
  }

  // Block deletion if income is linked to a family member
  if (existing.familyMemberId && existing.familyMember) {
    throw new Error(`This income is linked to ${existing.familyMember.name} and cannot be deleted independently. Please delete the family member to remove their associated incomesBeta.`);
  }

  await db.delete(incomesBeta).where(and(eq(incomesBeta.id, id), eq(incomesBeta.familyId, familyId)));

  revalidatePath("/user");
  return { success: true };
}

/**
 * Toggle income active status
 */
export async function toggleIncomeStatus(id: string) {
  const { familyId } = await getCurrentUserAndFamily();

  const existing = await db.query.incomesBeta.findFirst({
    where: and(eq(incomesBeta.id, id), eq(incomesBeta.familyId, familyId)),
  });

  if (!existing) {
    throw new Error("Income not found or access denied");
  }

  const updated = await db
    .update(incomesBeta)
    .set({
      isActive: !existing.isActive,
      updatedAt: new Date(),
    })
    .where(and(eq(incomesBeta.id, id), eq(incomesBeta.familyId, familyId)))
    .returning();

  revalidatePath("/user");
  return { ...updated[0], frequency: "monthly" as string, customMonths: null as string | null };
}

/**
 * Get all incomesBeta for the current family
 */
export async function getIncomes() {
  const { familyId } = await getCurrentUserAndFamily();

  const familyIncomes = await db.query.incomesBeta.findMany({
    where: eq(incomesBeta.familyId, familyId),
    orderBy: (incomesBeta, { desc }) => [desc(incomesBeta.createdAt)],
    with: {
      familyMember: {
        columns: {
          id: true,
          name: true,
          relationship: true,
          dateOfBirth: true,
          isContributing: true,
        },
      },
    },
  });

  // Synthesize the legacy row shape (monthly frequency, derived category) so
  // existing callers keep compiling/behaving while reading incomes_beta.
  return familyIncomes.map((r) => ({
    ...r,
    incomeCategory: effectiveIncomeCategory(r.incomeCategory, r.startDate),
    frequency: "monthly" as string,
    customMonths: null as string | null,
  }));
}
