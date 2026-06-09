// CPF Contribution Rates based on age group
const CPF_RATES = {
  "55_and_below": { employer: 0.17, employee: 0.20 },
  "above_55_to_60": { employer: 0.155, employee: 0.17 },
  "above_60_to_65": { employer: 0.12, employee: 0.115 },
  "above_65_to_70": { employer: 0.09, employee: 0.075 },
  "above_70": { employer: 0.075, employee: 0.05 },
};

// CPF Ordinary Wage Ceiling
const OW_CEILING = 8000;

// Exposed for UI (the OW-ceiling explainer tooltip).
export const OW_CEILING_AMOUNT = OW_CEILING;
export const OW_CEILING_YEAR = 2026;

// CPF contribution rate brackets (as % of wage) for display, mirroring
// CPF_RATES. Effective 1 Jan 2025. Keep in sync with CPF_RATES above.
export const CPF_RATE_BRACKETS = [
  { label: "55 and below", employer: 17, employee: 20, total: 37 },
  { label: "Above 55 to 60", employer: 15.5, employee: 17, total: 32.5 },
  { label: "Above 60 to 65", employer: 12, employee: 11.5, total: 23.5 },
  { label: "Above 65 to 70", employer: 9, employee: 7.5, total: 16.5 },
  { label: "Above 70", employer: 7.5, employee: 5, total: 12.5 },
] as const;

// Index into CPF_RATE_BRACKETS for a given age.
export function getCPFBracketIndex(age: number): number {
  if (age <= 55) return 0;
  if (age <= 60) return 1;
  if (age <= 65) return 2;
  if (age <= 70) return 3;
  return 4;
}

// CPF allocation (OA/SA/MA) brackets for display, mirroring
// CPF_ALLOCATION_RATES. Keep in sync.
export const CPF_ALLOCATION_BRACKETS = [
  { label: "35 & below", oa: 0.6217, sa: 0.1622, ma: 0.2162 },
  { label: "Above 35 to 45", oa: 0.5676, sa: 0.2162, ma: 0.2162 },
  { label: "Above 45 to 50", oa: 0.5135, sa: 0.2703, ma: 0.2162 },
  { label: "Above 50 to 55", oa: 0.4324, sa: 0.3514, ma: 0.2162 },
  { label: "Above 55 to 60", oa: 0.4308, sa: 0.2462, ma: 0.3231 },
  { label: "Above 60 to 65", oa: 0.3404, sa: 0.1489, ma: 0.5106 },
  { label: "Above 65", oa: 0.3333, sa: 0.0909, ma: 0.5758 },
] as const;

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

// CPF Annual Wage Ceiling
const ANNUAL_WAGE_CEILING = 102000;

// Annual (Additional Wage) ceiling — exposed for the bonus-tab explainer.
export const ANNUAL_WAGE_CEILING_AMOUNT = ANNUAL_WAGE_CEILING;

// CPF Allocation Rates (how total CPF is distributed across OA, SA, MA) based on age
const CPF_ALLOCATION_RATES = {
  "35_and_below": { oa: 0.6217, sa: 0.1622, ma: 0.2162 },
  "above_35_to_45": { oa: 0.5676, sa: 0.2162, ma: 0.2162 },
  "above_45_to_50": { oa: 0.5135, sa: 0.2703, ma: 0.2162 },
  "above_50_to_55": { oa: 0.4324, sa: 0.3514, ma: 0.2162 },
  "above_55_to_60": { oa: 0.4308, sa: 0.2462, ma: 0.3231 },
  "above_60_to_65": { oa: 0.3404, sa: 0.1489, ma: 0.5106 },
  "above_65": { oa: 0.3333, sa: 0.0909, ma: 0.5758 },
};

export type CPFAgeGroup = keyof typeof CPF_RATES;

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

// Low-wage thresholds (Total Wages per month). Below/at these, the employee
// share is reduced or nil even though the employer still contributes.
export const CPF_LOW_WAGE_NO_CPF = 50; // TW <= $50: no CPF at all
export const CPF_LOW_WAGE_NO_EMPLOYEE = 500; // TW <= $500: employer-only, employee nil
export const CPF_LOW_WAGE_PHASE_IN_END = 750; // $500 < TW <= $750: employee phased in

/** CPF Full Retirement Sum for members turning 55 in 2026 (CPF Board). */
export const FRS_2026 = 205_800;

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
 * Calculate CPF contributions for a given gross income
 * @param grossAmount - Monthly gross income
 * @param age - User's age (defaults to 30 for now)
 * @returns CPF calculation breakdown
 */
export function calculateCPF(grossAmount: number, age: number = 30): CPFCalculationResult {
  const rates = getCPFRatesByAge(age);

  // Apply OW ceiling - only the amount up to ceiling is subject to CPF
  const cpfApplicableAmount = Math.min(grossAmount, OW_CEILING);

  // Calculate contributions (low-wage rules adjust the employee share below $750)
  const { employee: employeeCpfContribution, employer: employerCpfContribution } =
    computeCpfContributions(cpfApplicableAmount, rates);
  const totalCpfContribution = employeeCpfContribution + employerCpfContribution;

  // Net take home = Gross - Employee CPF Contribution
  const netTakeHome = grossAmount - employeeCpfContribution;

  return {
    grossAmount,
    cpfApplicableAmount,
    employeeCpfContribution: Math.round(employeeCpfContribution * 100) / 100,
    employerCpfContribution: Math.round(employerCpfContribution * 100) / 100,
    totalCpfContribution: Math.round(totalCpfContribution * 100) / 100,
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
