"use server";

import { db } from "@/db";
import { incomesBeta, familyMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  getCPFRatesByAge,
  getCPFAllocationByAge,
  calculateBonusCPF,
  computeCpfContributions,
} from "@/lib/cpf-calculator";
import { effectiveIncomeCategory } from "@/lib/income-category";
import { getCurrentUserAndFamily } from "@/lib/auth-context";

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
  // Bonus CPF fields
  bonusAmount: number;
  bonusCpfApplicableAmount: number;
  bonusEmployeeCpf: number;
  bonusEmployerCpf: number;
  bonusTotalCpf: number;
  bonusOaAllocation: number;
  bonusSaAllocation: number;
  bonusMaAllocation: number;
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
 * Get aggregated CPF data grouped by family member.
 *
 * Reads the `incomes_beta` table (the canonical income source). Beta rows are
 * monthly by design, so amounts are used as-is. Only income that is *currently*
 * active counts toward monthly CPF: subject-to-CPF, active, and with an
 * effective category of "current" (a future income whose start date has already
 * passed reads as current — see lib/income-category).
 */
export async function getCpfByFamilyMember(): Promise<CpfByFamilyMember[]> {
  const { familyId } = await getCurrentUserAndFamily();

  // Fetch all contributing family members in this family
  const members = await db
    .select()
    .from(familyMembers)
    .where(
      and(
        eq(familyMembers.familyId, familyId),
        eq(familyMembers.isContributing, true)
      )
    );

  // Fetch all incomes in this family (canonical incomes_beta table)
  const allIncomes = await db
    .select()
    .from(incomesBeta)
    .where(eq(incomesBeta.familyId, familyId));

  const cpfData: CpfByFamilyMember[] = [];

  // Process each contributing family member
  for (const member of members) {
    // Get all currently-active incomes linked to this member that attract CPF
    const memberIncomes = allIncomes.filter(
      (income) =>
        income.familyMemberId === member.id &&
        income.subjectToCpf === true &&
        income.isActive === true &&
        effectiveIncomeCategory(income.incomeCategory, income.startDate) ===
          "current"
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
    let totalBonusAmount = 0;

    for (const income of memberIncomes) {
      // Beta incomes are monthly by design — use the amount directly.
      const monthlyGross = parseFloat(income.amount);

      // Aggregate bonus amounts from bonusGroups
      if (income.bonusGroups) {
        try {
          let bonusGroups;
          let validBonusData = true;

          // Handle different formats of bonusGroups
          if (typeof income.bonusGroups === 'string') {
            // Skip bonus calculation if it's corrupted data like "[object Object]"
            if (income.bonusGroups.startsWith('[object')) {
              console.warn('Skipping corrupted bonusGroups data for income:', income.id);
              validBonusData = false;
            } else {
              bonusGroups = JSON.parse(income.bonusGroups);
            }
          } else if (Array.isArray(income.bonusGroups)) {
            bonusGroups = income.bonusGroups;
          } else {
            // Invalid bonus data format
            validBonusData = false;
          }

          // Only process bonus if we have valid array data
          if (validBonusData && Array.isArray(bonusGroups)) {
            // Sum all bonus months from all bonus groups
            const totalBonusMonths = bonusGroups.reduce((sum: number, group: { month: number; amount: string }) => {
              return sum + (parseFloat(group.amount) || 0);
            }, 0);

            // Calculate actual bonus amount
            const actualBonusAmount = monthlyGross * totalBonusMonths;
            totalBonusAmount += actualBonusAmount;
          }
        } catch (error) {
          console.error('Error parsing bonusGroups for income', income.id, ':', error);
        }
      }

      // Recalculate CPF contributions using correct age-based rates, applying
      // the low-wage rules (employee share reduced/nil below $750).
      const cpfApplicableAmount = Math.min(monthlyGross, 8000);
      const { employee: monthlyEmployeeCpf, employer: monthlyEmployerCpf } =
        computeCpfContributions(cpfApplicableAmount, {
          employee: employeeCpfRate / 100,
          employer: employerCpfRate / 100,
        });

      const monthlyOa = parseFloat(income.cpfOrdinaryAccount || "0");
      const monthlySa = parseFloat(income.cpfSpecialAccount || "0");
      const monthlyMa = parseFloat(income.cpfMedisaveAccount || "0");

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

    // Calculate bonus CPF (if there's a bonus amount)
    let bonusCpfData = {
      bonusAmount: 0,
      bonusCpfApplicableAmount: 0,
      bonusEmployeeCpf: 0,
      bonusEmployerCpf: 0,
      bonusTotalCpf: 0,
      bonusOaAllocation: 0,
      bonusSaAllocation: 0,
      bonusMaAllocation: 0,
    };

    if (totalBonusAmount > 0 && memberAge !== null) {
      bonusCpfData = calculateBonusCPF(totalGross, totalBonusAmount, memberAge);
    }

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
      // Bonus CPF fields
      bonusAmount: parseFloat(bonusCpfData.bonusAmount.toFixed(2)),
      bonusCpfApplicableAmount: parseFloat(bonusCpfData.bonusCpfApplicableAmount.toFixed(2)),
      bonusEmployeeCpf: parseFloat(bonusCpfData.bonusEmployeeCpf.toFixed(2)),
      bonusEmployerCpf: parseFloat(bonusCpfData.bonusEmployerCpf.toFixed(2)),
      bonusTotalCpf: parseFloat(bonusCpfData.bonusTotalCpf.toFixed(2)),
      bonusOaAllocation: parseFloat(bonusCpfData.bonusOaAllocation.toFixed(2)),
      bonusSaAllocation: parseFloat(bonusCpfData.bonusSaAllocation.toFixed(2)),
      bonusMaAllocation: parseFloat(bonusCpfData.bonusMaAllocation.toFixed(2)),
    });
  }

  // Sort by family member name
  cpfData.sort((a, b) => a.familyMemberName.localeCompare(b.familyMemberName));

  return cpfData;
}
