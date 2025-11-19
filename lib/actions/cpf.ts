"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { incomes, familyMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCPFRatesByAge, getCPFAllocationByAge } from "@/lib/cpf-calculator";

export interface CpfByFamilyMember {
  familyMemberId: string;
  familyMemberName: string;
  age: number | null;
  monthlyGrossIncome: number;
  monthlyNettIncome: number;
  monthlyTotalCpf: number;
  monthlyEmployeeCpf: number;
  monthlyEmployerCpf: number;
  employeeCpfRate: number;
  employerCpfRate: number;
  monthlyOaContribution: number;
  monthlySaContribution: number;
  monthlyMaContribution: number;
  oaPercentage: number;
  saPercentage: number;
  maPercentage: number;
  // CPF allocation amounts (based on age-specific allocation rates)
  monthlyOaAllocation: number;
  monthlySaAllocation: number;
  monthlyMaAllocation: number;
  oaAllocationRate: number;
  saAllocationRate: number;
  maAllocationRate: number;
}

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
 * Normalize income amount to monthly based on frequency
 */
function normalizeToMonthly(amount: number, frequency: string): number {
  switch (frequency.toLowerCase()) {
    case "monthly":
      return amount;
    case "yearly":
    case "annual":
      return amount / 12;
    case "weekly":
      return (amount * 52) / 12;
    case "bi-weekly":
    case "biweekly":
      return (amount * 26) / 12;
    case "one-time":
    default:
      return 0; // Don't include one-time payments in monthly calculations
  }
}

/**
 * Get aggregated CPF data grouped by family member
 */
export async function getCpfByFamilyMember(): Promise<CpfByFamilyMember[]> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Fetch all family members for this user
  const members = await db
    .select()
    .from(familyMembers)
    .where(
      and(
        eq(familyMembers.userId, userId),
        eq(familyMembers.isContributing, true)
      )
    );

  // Fetch all incomes for this user
  const allIncomes = await db
    .select()
    .from(incomes)
    .where(eq(incomes.userId, userId));

  const cpfData: CpfByFamilyMember[] = [];

  // Process each contributing family member
  for (const member of members) {
    // Get all active incomes linked to this family member that are subject to CPF
    const memberIncomes = allIncomes.filter(
      (income) =>
        income.familyMemberId === member.id &&
        income.subjectToCpf === true &&
        income.isActive === true
    );

    // Skip if no CPF-eligible incomes
    if (memberIncomes.length === 0) {
      continue;
    }

    // Get CPF rates based on family member's age
    let memberAge: number | null = null;
    let employeeCpfRate = 20; // Default for age 55 and below
    let employerCpfRate = 17; // Default for age 55 and below
    let oaAllocationRate = 62.17; // Default for age 35 and below
    let saAllocationRate = 16.22;
    let maAllocationRate = 21.62;

    if (member.dateOfBirth) {
      const age = calculateAge(new Date(member.dateOfBirth));
      memberAge = age;
      const rates = getCPFRatesByAge(age);
      employeeCpfRate = rates.employee * 100;
      employerCpfRate = rates.employer * 100;

      // Get CPF allocation rates based on age
      const allocation = getCPFAllocationByAge(age);
      oaAllocationRate = allocation.oa * 100;
      saAllocationRate = allocation.sa * 100;
      maAllocationRate = allocation.ma * 100;
    }

    // Aggregate all income data
    let totalGross = 0;
    let totalEmployeeCpf = 0;
    let totalEmployerCpf = 0;
    let totalOa = 0;
    let totalSa = 0;
    let totalMa = 0;

    for (const income of memberIncomes) {
      const monthlyGross = normalizeToMonthly(
        parseFloat(income.amount),
        income.frequency
      );

      // Recalculate CPF contributions using correct age-based rates
      const cpfApplicableAmount = Math.min(monthlyGross, 8000);
      const monthlyEmployeeCpf = cpfApplicableAmount * (employeeCpfRate / 100);
      const monthlyEmployerCpf = cpfApplicableAmount * (employerCpfRate / 100);

      const monthlyOa = normalizeToMonthly(
        parseFloat(income.cpfOrdinaryAccount || "0"),
        income.frequency
      );
      const monthlySa = normalizeToMonthly(
        parseFloat(income.cpfSpecialAccount || "0"),
        income.frequency
      );
      const monthlyMa = normalizeToMonthly(
        parseFloat(income.cpfMedisaveAccount || "0"),
        income.frequency
      );

      totalGross += monthlyGross;
      totalEmployeeCpf += monthlyEmployeeCpf;
      totalEmployerCpf += monthlyEmployerCpf;
      totalOa += monthlyOa;
      totalSa += monthlySa;
      totalMa += monthlyMa;
    }

    const totalCpf = totalEmployeeCpf + totalEmployerCpf;
    const nettIncome = totalGross - totalEmployeeCpf;

    // Calculate OA/SA/MA percentages (from stored values)
    const oaPercentage = totalCpf > 0 ? (totalOa / totalCpf) * 100 : 0;
    const saPercentage = totalCpf > 0 ? (totalSa / totalCpf) * 100 : 0;
    const maPercentage = totalCpf > 0 ? (totalMa / totalCpf) * 100 : 0;

    // Calculate CPF allocation amounts based on age-specific rates
    const monthlyOaAllocation = totalCpf * (oaAllocationRate / 100);
    const monthlySaAllocation = totalCpf * (saAllocationRate / 100);
    const monthlyMaAllocation = totalCpf * (maAllocationRate / 100);

    cpfData.push({
      familyMemberId: member.id,
      familyMemberName: member.name,
      age: memberAge,
      monthlyGrossIncome: parseFloat(totalGross.toFixed(2)),
      monthlyNettIncome: parseFloat(nettIncome.toFixed(2)),
      monthlyTotalCpf: parseFloat(totalCpf.toFixed(2)),
      monthlyEmployeeCpf: parseFloat(totalEmployeeCpf.toFixed(2)),
      monthlyEmployerCpf: parseFloat(totalEmployerCpf.toFixed(2)),
      employeeCpfRate: parseFloat(employeeCpfRate.toFixed(2)),
      employerCpfRate: parseFloat(employerCpfRate.toFixed(2)),
      monthlyOaContribution: parseFloat(totalOa.toFixed(2)),
      monthlySaContribution: parseFloat(totalSa.toFixed(2)),
      monthlyMaContribution: parseFloat(totalMa.toFixed(2)),
      oaPercentage: parseFloat(oaPercentage.toFixed(2)),
      saPercentage: parseFloat(saPercentage.toFixed(2)),
      maPercentage: parseFloat(maPercentage.toFixed(2)),
      monthlyOaAllocation: parseFloat(monthlyOaAllocation.toFixed(2)),
      monthlySaAllocation: parseFloat(monthlySaAllocation.toFixed(2)),
      monthlyMaAllocation: parseFloat(monthlyMaAllocation.toFixed(2)),
      oaAllocationRate: parseFloat(oaAllocationRate.toFixed(2)),
      saAllocationRate: parseFloat(saAllocationRate.toFixed(2)),
      maAllocationRate: parseFloat(maAllocationRate.toFixed(2)),
    });
  }

  // Sort by family member name
  cpfData.sort((a, b) => a.familyMemberName.localeCompare(b.familyMemberName));

  return cpfData;
}
