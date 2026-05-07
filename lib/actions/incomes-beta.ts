"use server";

import { db } from "@/db";
import { incomesBeta, familyMembers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { calculateCPF } from "@/lib/cpf-calculator";
import { getCurrentUserAndFamily } from "@/lib/auth-context";

function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

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
  const { familyId } = await getCurrentUserAndFamily();

  const rows = await db.query.incomesBeta.findMany({
    where: eq(incomesBeta.familyId, familyId),
    orderBy: [desc(incomesBeta.createdAt)],
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

  return rows.map((r) => ({
    ...r,
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
  const { userId, familyId } = await getCurrentUserAndFamily();

  let employeeCpfContribution: string | null = null;
  let employerCpfContribution: string | null = null;
  let netTakeHome: string | null = null;

  if (data.subjectToCpf) {
    const userAge = data.familyMemberAge ?? 30;
    const cpfResult = calculateCPF(data.amount, userAge);
    employeeCpfContribution = cpfResult.employeeCpfContribution.toString();
    employerCpfContribution = cpfResult.employerCpfContribution.toString();
    netTakeHome = cpfResult.netTakeHome.toString();
  }

  const inserted = await db
    .insert(incomesBeta)
    .values({
      id: nanoid(),
      userId,
      familyId,
      familyMemberId: data.familyMemberId || null,
      name: data.name,
      category: data.category,
      incomeCategory: normalizeIncomeCategory(data.incomeCategory) ?? "current",
      amount: data.amount.toString(),
      subjectToCpf: data.subjectToCpf,
      accountForBonus: data.accountForBonus ?? false,
      bonusGroups: data.bonusGroups || null,
      employeeCpfContribution,
      employerCpfContribution,
      netTakeHome,
      cpfOrdinaryAccount: data.cpfOrdinaryAccount
        ? data.cpfOrdinaryAccount.toString()
        : null,
      cpfSpecialAccount: data.cpfSpecialAccount
        ? data.cpfSpecialAccount.toString()
        : null,
      cpfMedisaveAccount: data.cpfMedisaveAccount
        ? data.cpfMedisaveAccount.toString()
        : null,
      startDate: data.startDate,
      endDate: data.endDate || null,
      pastIncomeHistory: data.pastIncomeHistory || null,
      futureMilestones: data.futureMilestones || null,
      accountForFutureChange: data.accountForFutureChange ?? false,
      description: data.description || null,
      isActive: true,
    })
    .returning();

  revalidatePath("/user");
  return inserted[0];
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
  const { familyId } = await getCurrentUserAndFamily();

  const existing = await db.query.incomesBeta.findFirst({
    where: and(eq(incomesBeta.id, id), eq(incomesBeta.familyId, familyId)),
  });
  if (!existing) throw new Error("Income not found or access denied");

  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (data.name !== undefined) update.name = data.name;
  if (data.category !== undefined) update.category = data.category;
  if (data.incomeCategory !== undefined) {
    const norm = normalizeIncomeCategory(data.incomeCategory);
    if (norm) update.incomeCategory = norm;
  }
  if (data.amount !== undefined) update.amount = data.amount.toString();
  if (data.subjectToCpf !== undefined) update.subjectToCpf = data.subjectToCpf;
  if (data.accountForBonus !== undefined)
    update.accountForBonus = data.accountForBonus;
  if (data.bonusGroups !== undefined) update.bonusGroups = data.bonusGroups;
  if (data.startDate !== undefined) update.startDate = data.startDate;
  if (data.endDate !== undefined) update.endDate = data.endDate;
  if (data.pastIncomeHistory !== undefined)
    update.pastIncomeHistory = data.pastIncomeHistory;
  if (data.futureMilestones !== undefined)
    update.futureMilestones = data.futureMilestones;
  if (data.accountForFutureChange !== undefined)
    update.accountForFutureChange = data.accountForFutureChange;
  if (data.description !== undefined) update.description = data.description;
  if (data.isActive !== undefined) update.isActive = data.isActive;
  if (data.familyMemberId !== undefined)
    update.familyMemberId = data.familyMemberId || null;
  if (data.cpfOrdinaryAccount !== undefined)
    update.cpfOrdinaryAccount = data.cpfOrdinaryAccount.toString();
  if (data.cpfSpecialAccount !== undefined)
    update.cpfSpecialAccount = data.cpfSpecialAccount.toString();
  if (data.cpfMedisaveAccount !== undefined)
    update.cpfMedisaveAccount = data.cpfMedisaveAccount.toString();

  // Recompute CPF whenever subjectToCpf or amount could be affected. Mirrors
  // lib/actions/income.ts's logic so behavior stays consistent.
  const finalAmount =
    data.amount !== undefined ? data.amount : Number(existing.amount);
  const finalSubject =
    data.subjectToCpf !== undefined
      ? data.subjectToCpf
      : (existing.subjectToCpf ?? false);

  if (finalSubject) {
    let userAge = data.familyMemberAge ?? 30;
    const effectiveFamilyMemberId =
      data.familyMemberId !== undefined
        ? data.familyMemberId
        : existing.familyMemberId;
    if (!data.familyMemberAge && effectiveFamilyMemberId) {
      const fm = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.id, effectiveFamilyMemberId),
      });
      if (fm?.dateOfBirth) userAge = calculateAge(new Date(fm.dateOfBirth));
    }
    const cpf = calculateCPF(finalAmount, userAge);
    update.employeeCpfContribution = cpf.employeeCpfContribution.toString();
    update.employerCpfContribution = cpf.employerCpfContribution.toString();
    update.netTakeHome = cpf.netTakeHome.toString();
  } else {
    update.employeeCpfContribution = null;
    update.employerCpfContribution = null;
    update.netTakeHome = null;
  }

  const updated = await db
    .update(incomesBeta)
    .set(update)
    .where(and(eq(incomesBeta.id, id), eq(incomesBeta.familyId, familyId)))
    .returning();

  revalidatePath("/user");
  return updated[0];
}

export async function deleteIncomeBeta(id: string) {
  const { familyId } = await getCurrentUserAndFamily();

  const existing = await db.query.incomesBeta.findFirst({
    where: and(eq(incomesBeta.id, id), eq(incomesBeta.familyId, familyId)),
  });
  if (!existing) throw new Error("Income not found or access denied");

  await db
    .delete(incomesBeta)
    .where(and(eq(incomesBeta.id, id), eq(incomesBeta.familyId, familyId)));

  revalidatePath("/user");
  return { success: true };
}

export async function toggleIncomeBetaStatus(id: string) {
  const { familyId } = await getCurrentUserAndFamily();

  const existing = await db.query.incomesBeta.findFirst({
    where: and(eq(incomesBeta.id, id), eq(incomesBeta.familyId, familyId)),
  });
  if (!existing) throw new Error("Income not found or access denied");

  const updated = await db
    .update(incomesBeta)
    .set({ isActive: !existing.isActive, updatedAt: new Date() })
    .where(and(eq(incomesBeta.id, id), eq(incomesBeta.familyId, familyId)))
    .returning();

  revalidatePath("/user");
  return updated[0];
}
