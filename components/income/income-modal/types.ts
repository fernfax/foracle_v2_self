// Types for Income Modal with Past/Present/Future tabs

export interface PastIncomeEntry {
  period: string;                    // "2024" (yearly) or "2024-01" (monthly)
  granularity: "yearly" | "monthly";
  amount: number;
  notes?: string;
}

export interface FutureMilestone {
  id: string;
  targetMonth: string;  // "2025-06" (YYYY-MM format)
  amount: number;
  reason?: string;      // "Promotion", "Annual Increment", etc.
  notes?: string;
}

export interface BonusGroup {
  month: number;
  amount: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string | null;
  dateOfBirth: string | null;
  isContributing: boolean | null;
}

export interface Income {
  id: string;
  userId: string;
  familyMemberId: string | null;
  name: string;
  category: string;
  incomeCategory: string | null;
  amount: string;
  frequency: string;
  customMonths: string | null;
  subjectToCpf: boolean | null;
  accountForBonus: boolean | null;
  bonusGroups: string | null;
  employeeCpfContribution: string | null;
  employerCpfContribution: string | null;
  netTakeHome: string | null;
  cpfOrdinaryAccount: string | null;
  cpfSpecialAccount: string | null;
  cpfMedisaveAccount: string | null;
  description: string | null;
  startDate: string;
  endDate: string | null;
  pastIncomeHistory: string | null;  // JSON string
  futureMilestones: string | null;   // JSON string
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  familyMember?: FamilyMember | null;
}

export interface IncomeFormData {
  // Present tab fields
  name: string;
  category: string;
  incomeCategory: string;
  amount: string;
  frequency: string;
  customMonths: number[];
  subjectToCpf: boolean;
  accountForBonus: boolean;
  bonusGroups: BonusGroup[];
  startDate: Date | undefined;
  endDate: Date | undefined;
  notes: string;

  // Past tab fields
  pastIncomeHistory: PastIncomeEntry[];
  pastGranularity: "yearly" | "monthly";

  // Future tab fields
  futureMilestones: FutureMilestone[];

  // CPF fields (populated in CPF step)
  cpfOrdinaryAccount?: number;
  cpfSpecialAccount?: number;
  cpfMedisaveAccount?: number;
}

export type TabValue = "past" | "present" | "future";

export const INCOME_CATEGORIES = [
  { value: "salary", label: "Salary" },
  { value: "freelance", label: "Freelance" },
  { value: "business", label: "Business" },
  { value: "investment", label: "Investment" },
  { value: "rental", label: "Rental" },
  { value: "dividend", label: "Dividend" },
  { value: "other", label: "Other" },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-Weekly" },
  { value: "one-time", label: "One-Time" },
  { value: "custom", label: "Custom" },
] as const;

export const MILESTONE_REASONS = [
  { value: "promotion", label: "Promotion" },
  { value: "annual_increment", label: "Annual Increment" },
  { value: "job_change", label: "Job Change" },
  { value: "salary_review", label: "Salary Review" },
  { value: "bonus_structure", label: "Bonus Structure Change" },
  { value: "other", label: "Other" },
] as const;

export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;
