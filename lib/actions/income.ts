"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { incomes, familyMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { calculateCPF } from "@/lib/cpf-calculator";
import { format } from "date-fns";

/**
 * Calculate age from date of birth
 */
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
 * Get the current authenticated user's ID
 */
async function getCurrentUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
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
  description?: string;
  familyMemberId?: string;
  familyMemberAge?: number;
  cpfOrdinaryAccount?: number;
  cpfSpecialAccount?: number;
  cpfMedisaveAccount?: number;
}) {
  const userId = await getCurrentUserId();

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
    description: data.description || null,
    isActive: true,
  }).returning();

  revalidatePath("/dashboard/user");
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
    description?: string;
    isActive?: boolean;
    familyMemberAge?: number;
    cpfOrdinaryAccount?: number;
    cpfSpecialAccount?: number;
    cpfMedisaveAccount?: number;
  }
) {
  const userId = await getCurrentUserId();

  // Verify ownership
  const existing = await db.query.incomes.findFirst({
    where: and(eq(incomes.id, id), eq(incomes.userId, userId)),
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
  if (data.description !== undefined) updateData.description = data.description;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
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
    if (!data.familyMemberAge && existing.familyMemberId) {
      const familyMember = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.id, existing.familyMemberId),
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
    .where(and(eq(incomes.id, id), eq(incomes.userId, userId)))
    .returning();

  revalidatePath("/dashboard/user");
  return updated[0];
}

/**
 * Delete an income record
 */
export async function deleteIncome(id: string) {
  const userId = await getCurrentUserId();

  // Verify ownership and get income with family member details
  const existing = await db.query.incomes.findFirst({
    where: and(eq(incomes.id, id), eq(incomes.userId, userId)),
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

  await db.delete(incomes).where(and(eq(incomes.id, id), eq(incomes.userId, userId)));

  revalidatePath("/dashboard/user");
  return { success: true };
}

/**
 * Toggle income active status
 */
export async function toggleIncomeStatus(id: string) {
  const userId = await getCurrentUserId();

  const existing = await db.query.incomes.findFirst({
    where: and(eq(incomes.id, id), eq(incomes.userId, userId)),
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
    .where(and(eq(incomes.id, id), eq(incomes.userId, userId)))
    .returning();

  revalidatePath("/dashboard/user");
  return updated[0];
}

/**
 * Get all incomes for the current user
 */
export async function getIncomes() {
  const userId = await getCurrentUserId();

  const userIncomes = await db.query.incomes.findMany({
    where: eq(incomes.userId, userId),
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

  return userIncomes;
}
