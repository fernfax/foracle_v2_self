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

// CPF Annual Wage Ceiling
const ANNUAL_WAGE_CEILING = 102000;

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

  // Calculate contributions
  const employeeCpfContribution = cpfApplicableAmount * rates.employee;
  const employerCpfContribution = cpfApplicableAmount * rates.employer;
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
