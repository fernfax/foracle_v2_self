"use server";

import { db } from "@/db";
import { incomes, familyMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { calculateCPF } from "@/lib/cpf-calculator";
import { getCurrentUserAndFamily } from "@/lib/auth-context";

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }

  return age;
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

  // Calculate CPF if applicable
  let employeeCpfContribution: string | null = null;
  let employerCpfContribution: string | null = null;
  let netTakeHome: string | null = null;

  if (data.subjectToCpf) {
    // Use family member's age if provided, otherwise default to 30
    const userAge = data.familyMemberAge ?? 30;
    const cpfResult = calculateCPF(data.amount, userAge);
    employeeCpfContribution = cpfResult.employeeCpfContribution.toString();
    employerCpfContribution = cpfResult.employerCpfContribution.toString();
    netTakeHome = cpfResult.netTakeHome.toString();
  }

  const newIncome = await db.insert(incomes).values({
    id: nanoid(),
    userId,
    familyId,
    familyMemberId: data.familyMemberId || null,
    name: data.name,
    category: data.category,
    incomeCategory: data.incomeCategory || "current-recurring",
    amount: data.amount.toString(),
    frequency: data.frequency,
    customMonths: data.customMonths || null,
    subjectToCpf: data.subjectToCpf,
    accountForBonus: data.accountForBonus || false,
    bonusGroups: data.bonusGroups || null,
    employeeCpfContribution,
    employerCpfContribution,
    netTakeHome,
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
  return newIncome[0];
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

  // Verify the row belongs to caller's family
  const existing = await db.query.incomes.findFirst({
    where: and(eq(incomes.id, id), eq(incomes.familyId, familyId)),
  });

  if (!existing) {
    throw new Error("Income not found or access denied");
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.incomeCategory !== undefined) updateData.incomeCategory = data.incomeCategory;
  if (data.amount !== undefined) updateData.amount = data.amount.toString();
  if (data.frequency !== undefined) updateData.frequency = data.frequency;
  if (data.customMonths !== undefined) updateData.customMonths = data.customMonths;
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

  // Recalculate CPF if subject to CPF or amount changed
  const finalAmount = data.amount !== undefined ? data.amount : parseFloat(existing.amount);
  const finalSubjectToCpf = data.subjectToCpf !== undefined ? data.subjectToCpf : existing.subjectToCpf;

  if (finalSubjectToCpf) {
    // Determine user age for CPF calculation
    let userAge = data.familyMemberAge ?? 30; // Use provided age or default to 30

    // If age not provided but income is linked to a family member, fetch their age
    const effectiveFamilyMemberId =
      data.familyMemberId !== undefined ? data.familyMemberId : existing.familyMemberId;
    if (!data.familyMemberAge && effectiveFamilyMemberId) {
      const familyMember = await db.query.familyMembers.findFirst({
        where: and(
          eq(familyMembers.id, effectiveFamilyMemberId),
          eq(familyMembers.familyId, familyId)
        ),
      });

      if (familyMember?.dateOfBirth) {
        userAge = calculateAge(new Date(familyMember.dateOfBirth));
      }
    }

    const cpfResult = calculateCPF(finalAmount, userAge);
    updateData.employeeCpfContribution = cpfResult.employeeCpfContribution.toString();
    updateData.employerCpfContribution = cpfResult.employerCpfContribution.toString();
    updateData.netTakeHome = cpfResult.netTakeHome.toString();
  } else {
    // Clear CPF fields if not subject to CPF
    updateData.employeeCpfContribution = null;
    updateData.employerCpfContribution = null;
    updateData.netTakeHome = null;
  }

  const updated = await db
    .update(incomes)
    .set(updateData)
    .where(and(eq(incomes.id, id), eq(incomes.familyId, familyId)))
    .returning();

  revalidatePath("/user");
  return updated[0];
}

/**
 * Delete an income record
 */
export async function deleteIncome(id: string) {
  const { familyId } = await getCurrentUserAndFamily();

  // Verify the row belongs to caller's family and get family member details
  const existing = await db.query.incomes.findFirst({
    where: and(eq(incomes.id, id), eq(incomes.familyId, familyId)),
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
    throw new Error(`This income is linked to ${existing.familyMember.name} and cannot be deleted independently. Please delete the family member to remove their associated incomes.`);
  }

  await db.delete(incomes).where(and(eq(incomes.id, id), eq(incomes.familyId, familyId)));

  revalidatePath("/user");
  return { success: true };
}

/**
 * Toggle income active status
 */
export async function toggleIncomeStatus(id: string) {
  const { familyId } = await getCurrentUserAndFamily();

  const existing = await db.query.incomes.findFirst({
    where: and(eq(incomes.id, id), eq(incomes.familyId, familyId)),
  });

  if (!existing) {
    throw new Error("Income not found or access denied");
  }

  const updated = await db
    .update(incomes)
    .set({
      isActive: !existing.isActive,
      updatedAt: new Date(),
    })
    .where(and(eq(incomes.id, id), eq(incomes.familyId, familyId)))
    .returning();

  revalidatePath("/user");
  return updated[0];
}

/**
 * Get all incomes for the current family
 */
export async function getIncomes() {
  const { familyId } = await getCurrentUserAndFamily();

  const familyIncomes = await db.query.incomes.findMany({
    where: eq(incomes.familyId, familyId),
    orderBy: (incomes, { desc }) => [desc(incomes.createdAt)],
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

  return familyIncomes;
}
