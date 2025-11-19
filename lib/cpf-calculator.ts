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
 * Get CPF rate based on user's age
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
