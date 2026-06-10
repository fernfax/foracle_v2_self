// All CPF rates / ceilings / limits live in lib/cpf-constants.ts — the single
// source of truth shared with the display brackets and the AI knowledge base.
// This module imports them for the math and re-exports the names existing
// callers already pull from here, so no import paths change.
import {
  CPF_RATES,
  CPF_RATE_BAND_LABELS,
  CPF_RATE_BAND_ORDER,
  CPF_ALLOCATION_RATES,
  CPF_ALLOCATION_BAND_LABELS,
  CPF_ALLOCATION_BAND_ORDER,
  OW_CEILING,
  ANNUAL_WAGE_CEILING,
  CPF_LOW_WAGE_NO_CPF,
  CPF_LOW_WAGE_NO_EMPLOYEE,
  CPF_LOW_WAGE_PHASE_IN_END,
} from "@/lib/cpf-constants";

export {
  CPF_RATES,
  CPF_ALLOCATION_RATES,
  OW_CEILING,
  OW_CEILING_YEAR,
  ANNUAL_WAGE_CEILING,
  CPF_ANNUAL_LIMIT,
  CPF_RATES_VERSION,
  CPF_EFFECTIVE_FROM,
  FRS_2026,
  CPF_LOW_WAGE_NO_CPF,
  CPF_LOW_WAGE_NO_EMPLOYEE,
  CPF_LOW_WAGE_PHASE_IN_END,
} from "@/lib/cpf-constants";
export type { CPFAgeGroup } from "@/lib/cpf-constants";

// Legacy aliases the UI imports (the OW/AW explainer tooltips).
export const OW_CEILING_AMOUNT = OW_CEILING;
export const ANNUAL_WAGE_CEILING_AMOUNT = ANNUAL_WAGE_CEILING;

// Display brackets, DERIVED from the rate constants so they can never drift
// from the engine. *1000/10 kills float dust (0.16*100 === 16.000000000000004).
export const CPF_RATE_BRACKETS = CPF_RATE_BAND_ORDER.map((k) => {
  const employer = Math.round(CPF_RATES[k].employer * 1000) / 10;
  const employee = Math.round(CPF_RATES[k].employee * 1000) / 10;
  return {
    label: CPF_RATE_BAND_LABELS[k],
    employer,
    employee,
    total: Math.round((employer + employee) * 10) / 10,
  };
});

// Index into CPF_RATE_BRACKETS for a given age.
export function getCPFBracketIndex(age: number): number {
  if (age <= 55) return 0;
  if (age <= 60) return 1;
  if (age <= 65) return 2;
  if (age <= 70) return 3;
  return 4;
}

// CPF allocation (OA/SA/MA) brackets for display, DERIVED from the allocation
// rate constants (OA/SA/MA kept as fractions, matching the display consumers).
export const CPF_ALLOCATION_BRACKETS = CPF_ALLOCATION_BAND_ORDER.map((k) => ({
  label: CPF_ALLOCATION_BAND_LABELS[k],
  ...CPF_ALLOCATION_RATES[k],
}));

// Index into CPF_ALLOCATION_BRACKETS for a given age.
export function getCPFAllocationBracketIndex(age: number): number {
  if (age <= 35) return 0;
  if (age <= 45) return 1;
  if (age <= 50) return 2;
  if (age <= 55) return 3;
  if (age <= 60) return 4;
  if (age <= 65) return 5;
  return 6;
}

// Bonus (Additional Wage) CPF. Bonuses attract CPF only on the part of the
// Annual Wage Ceiling left after the year's ordinary-wage CPF (OW capped at
// $8k/month → $96k/yr typical). Returns the CPF-applicable bonus and the
// employee/employer split at the member's age-based rates.
export function computeBonusCPF(
  monthlyGross: number,
  totalBonusGross: number,
  age: number | null
): {
  annualOrdinaryWage: number;
  awCeilingRemaining: number;
  cpfApplicableBonus: number;
  employee: number;
  employer: number;
  employeeRatePct: number;
  employerRatePct: number;
} {
  const annualOrdinaryWage = Math.min(monthlyGross, OW_CEILING) * 12;
  const awCeilingRemaining = Math.max(
    0,
    ANNUAL_WAGE_CEILING - annualOrdinaryWage
  );
  const cpfApplicableBonus = Math.max(
    0,
    Math.min(totalBonusGross, awCeilingRemaining)
  );
  const rates = getCPFRatesByAge(age ?? 30);
  return {
    annualOrdinaryWage,
    awCeilingRemaining,
    cpfApplicableBonus,
    employee: cpfApplicableBonus * rates.employee,
    employer: cpfApplicableBonus * rates.employer,
    employeeRatePct: rates.employee * 100,
    employerRatePct: rates.employer * 100,
  };
}

export interface CPFCalculationResult {
  grossAmount: number;
  cpfApplicableAmount: number; // Amount subject to CPF (capped at OW ceiling)
  employeeCpfContribution: number;
  employerCpfContribution: number;
  totalCpfContribution: number;
  netTakeHome: number;
}

/**
 * Get CPF contribution rate based on user's age
 */
export function getCPFRatesByAge(age: number): { employer: number; employee: number } {
  if (age <= 55) {
    return CPF_RATES["55_and_below"];
  } else if (age <= 60) {
    return CPF_RATES["above_55_to_60"];
  } else if (age <= 65) {
    return CPF_RATES["above_60_to_65"];
  } else if (age <= 70) {
    return CPF_RATES["above_65_to_70"];
  } else {
    return CPF_RATES["above_70"];
  }
}

/**
 * Get CPF allocation rates (OA/SA/MA distribution) based on user's age
 */
export function getCPFAllocationByAge(age: number): { oa: number; sa: number; ma: number } {
  if (age <= 35) {
    return CPF_ALLOCATION_RATES["35_and_below"];
  } else if (age <= 45) {
    return CPF_ALLOCATION_RATES["above_35_to_45"];
  } else if (age <= 50) {
    return CPF_ALLOCATION_RATES["above_45_to_50"];
  } else if (age <= 55) {
    return CPF_ALLOCATION_RATES["above_50_to_55"];
  } else if (age <= 60) {
    return CPF_ALLOCATION_RATES["above_55_to_60"];
  } else if (age <= 65) {
    return CPF_ALLOCATION_RATES["above_60_to_65"];
  } else {
    return CPF_ALLOCATION_RATES["above_65"];
  }
}

/**
 * Apply Singapore's low-wage CPF rules to a CPF-applicable wage.
 *
 * - TW <= $50: no CPF (neither share).
 * - $50 < TW <= $500: employer pays the full rate; employee pays nothing.
 * - $500 < TW <= $750: employer pays the full rate; the employee share is
 *   phased in. The phase-in coefficient is `employeeRate * 3` so that the
 *   phased amount meets the full employee contribution exactly at $750
 *   (employeeRate*3*(750-500) === employeeRate*750). This keeps the curve
 *   continuous for every age band without a per-band lookup table.
 * - TW > $750: full employer and employee rates.
 *
 * `cpfApplicableAmount` is the wage already capped at the OW ceiling; since the
 * thresholds are all well below the ceiling this is equivalent to evaluating on
 * total wages for the affected range.
 */
export function computeCpfContributions(
  cpfApplicableAmount: number,
  rates: { employer: number; employee: number }
): { employee: number; employer: number } {
  if (cpfApplicableAmount <= CPF_LOW_WAGE_NO_CPF) {
    return { employee: 0, employer: 0 };
  }

  const employer = cpfApplicableAmount * rates.employer;

  let employee: number;
  if (cpfApplicableAmount <= CPF_LOW_WAGE_NO_EMPLOYEE) {
    employee = 0;
  } else if (cpfApplicableAmount <= CPF_LOW_WAGE_PHASE_IN_END) {
    employee = rates.employee * 3 * (cpfApplicableAmount - CPF_LOW_WAGE_NO_EMPLOYEE);
  } else {
    employee = cpfApplicableAmount * rates.employee;
  }

  return { employee, employer };
}

/**
 * Calculate CPF contributions for a given gross income.
 *
 * Applies the statutory CPF rounding rule (CPF Board): the TOTAL contribution
 * is rounded to the nearest dollar (50 cents rounds up), the employee share
 * has its cents dropped, and the employer share is total minus employee.
 *
 * @param grossAmount - Monthly gross income
 * @param age - User's age (defaults to 30 for now)
 * @returns CPF calculation breakdown
 */
export function calculateCPF(grossAmount: number, age: number = 30): CPFCalculationResult {
  const rates = getCPFRatesByAge(age);

  // Apply OW ceiling - only the amount up to ceiling is subject to CPF
  const cpfApplicableAmount = Math.min(grossAmount, OW_CEILING);

  // Calculate contributions (low-wage rules adjust the employee share below $750)
  const { employee: employeeRaw, employer: employerRaw } =
    computeCpfContributions(cpfApplicableAmount, rates);

  // Statutory rounding in a single step. The 1e-9 epsilon absorbs IEEE-754
  // dust (e.g. a raw employee share of 44.99999999999999 must floor to 45)
  // without disturbing genuine boundaries — rounding to cents first would
  // double-round and push totals like $370.4951 the wrong way.
  const totalCpfContribution = Math.round(employeeRaw + employerRaw + 1e-9);
  const employeeCpfContribution = Math.floor(employeeRaw + 1e-9);
  const employerCpfContribution = totalCpfContribution - employeeCpfContribution;

  // Net take home = Gross - Employee CPF Contribution
  const netTakeHome = grossAmount - employeeCpfContribution;

  return {
    grossAmount,
    cpfApplicableAmount,
    employeeCpfContribution,
    employerCpfContribution,
    totalCpfContribution,
    netTakeHome: Math.round(netTakeHome * 100) / 100,
  };
}

/**
 * Calculate bonus CPF contributions considering annual wage ceiling
 * @param monthlyIncome - Monthly gross income
 * @param bonusAmount - Total bonus amount
 * @param age - User's age
 * @returns Bonus CPF calculation breakdown
 */
export interface BonusCPFResult {
  bonusAmount: number;
  annualBaseCpf: number; // CPF-applicable amount from 12 months of salary
  remainingAnnualCeiling: number; // How much of annual ceiling is left for bonus
  bonusCpfApplicableAmount: number; // Actual bonus amount subject to CPF
  bonusEmployeeCpf: number;
  bonusEmployerCpf: number;
  bonusTotalCpf: number;
  bonusOaAllocation: number;
  bonusSaAllocation: number;
  bonusMaAllocation: number;
}

export function calculateBonusCPF(
  monthlyIncome: number,
  bonusAmount: number,
  age: number
): BonusCPFResult {
  // Calculate annual base CPF (12 months of salary, capped at OW ceiling)
  const monthlyCpfApplicableAmount = Math.min(monthlyIncome, OW_CEILING);
  const annualBaseCpf = monthlyCpfApplicableAmount * 12;

  // Calculate remaining annual ceiling for bonus
  const remainingAnnualCeiling = Math.max(0, ANNUAL_WAGE_CEILING - annualBaseCpf);

  // Bonus CPF only applies to the remaining ceiling amount
  const bonusCpfApplicableAmount = Math.min(bonusAmount, remainingAnnualCeiling);

  // Get age-based rates
  const rates = getCPFRatesByAge(age);
  const allocation = getCPFAllocationByAge(age);

  // Calculate bonus CPF contributions
  const bonusEmployeeCpf = bonusCpfApplicableAmount * rates.employee;
  const bonusEmployerCpf = bonusCpfApplicableAmount * rates.employer;
  const bonusTotalCpf = bonusEmployeeCpf + bonusEmployerCpf;

  // Calculate bonus OA/SA/MA allocations
  const bonusOaAllocation = bonusTotalCpf * allocation.oa;
  const bonusSaAllocation = bonusTotalCpf * allocation.sa;
  const bonusMaAllocation = bonusTotalCpf * allocation.ma;

  return {
    bonusAmount,
    annualBaseCpf,
    remainingAnnualCeiling,
    bonusCpfApplicableAmount,
    bonusEmployeeCpf: Math.round(bonusEmployeeCpf * 100) / 100,
    bonusEmployerCpf: Math.round(bonusEmployerCpf * 100) / 100,
    bonusTotalCpf: Math.round(bonusTotalCpf * 100) / 100,
    bonusOaAllocation: Math.round(bonusOaAllocation * 100) / 100,
    bonusSaAllocation: Math.round(bonusSaAllocation * 100) / 100,
    bonusMaAllocation: Math.round(bonusMaAllocation * 100) / 100,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
