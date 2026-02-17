import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { expenses, incomes, familyMembers, expenseCategories, currentHoldings, propertyAssets, vehicleAssets, assets, policies, dailyExpenses, expenseSubcategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateCPF, getCPFAllocationByAge } from "@/lib/cpf-calculator";
import {
  getToolRegistry,
  type ToolName,
  type MonthParams,
  type FamilySummaryParams,
  type BalanceSummaryParams,
  type SearchKnowledgeParams,
  type HoldingsSummaryParams,
  type PropertyAssetsSummaryParams,
  type VehicleAssetsSummaryParams,
  type OtherAssetsSummaryParams,
  type InsuranceSummaryParams,
  type DailyExpenseSummaryParams,
  type HypotheticalItem,
} from "./registry";
import { searchKnowledgeBase, type SearchResult } from "@/lib/vectors";

// =============================================================================
// Future Milestone Type
// =============================================================================

interface FutureMilestone {
  id: string;
  targetMonth: string; // "YYYY-MM" format
  amount: number;
  reason?: string;
  notes?: string;
}

// =============================================================================
// Types
// =============================================================================

export interface ToolExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  toolName: ToolName;
  durationMs: number;
}

export interface AuditRecord {
  toolName: ToolName;
  userId: string;
  timestamp: Date;
  durationMs: number;
  status: "success" | "error" | "unauthorized" | "validation_error";
  errorMessage?: string;
}

// In-memory audit log (in production, persist to database)
const auditLog: AuditRecord[] = [];

// =============================================================================
// Audit Logger
// =============================================================================

function logAudit(record: AuditRecord): void {
  auditLog.push(record);

  // Safe console log (no sensitive data)
  console.log(
    `[AI Tool Audit] ${record.timestamp.toISOString()} | ${record.toolName} | ${record.status} | ${record.durationMs}ms | user:${record.userId.slice(0, 8)}...`
  );
}

export function getAuditLog(): AuditRecord[] {
  return [...auditLog];
}

export function clearAuditLog(): void {
  auditLog.length = 0;
}

// =============================================================================
// Tool Result Types
// =============================================================================

export interface CpfBreakdown {
  subjectToCpf: boolean;
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  netTakeHome: number;
  // CPF account allocations
  ordinaryAccount: number;
  specialAccount: number;
  medisaveAccount: number;
}

export interface IncomeSourceItem {
  name: string;
  category: string;
  grossAmount: number;
  monthlyAmount: number;
  frequency: string;
  familyMember: string | null;
  status: string;
  // CPF details (null if not subject to CPF)
  cpf: CpfBreakdown | null;
}

export interface IncomeSummaryResult {
  month: string;
  // Totals
  totalGrossIncome: number;
  totalNetIncome: number;
  // CPF totals
  totalEmployeeCpf: number;
  totalEmployerCpf: number;
  totalCpfContribution: number;
  // CPF account totals
  totalOrdinaryAccount: number;
  totalSpecialAccount: number;
  totalMedisaveAccount: number;
  // Sources
  incomeSources: IncomeSourceItem[];
  incomeSourceCount: number;
}

export interface ExpenseCategoryBreakdown {
  categoryName: string;
  monthlyAmount: number;
  expenseCount: number;
  percentOfTotal: number;
}

export interface RecurringExpenseItem {
  name: string;
  category: string;
  expenseType: string;
  amount: number;
  monthlyAmount: number;
  frequency: string;
  isActive: boolean;
  trackedInBudget: boolean;
}

export interface ExpenseCategoryInfo {
  id: string;
  name: string;
  icon: string | null;
  isDefault: boolean;
  trackedInBudget: boolean;
}

export interface ExpensesSummaryResult {
  // Period info
  month: string;
  // Totals
  totalMonthlyExpenses: number;
  expenseCount: number;
  // Category breakdown (sorted by amount, top 5)
  categoryBreakdown: ExpenseCategoryBreakdown[];
  categoryCount: number;
  // All expense items
  expenses: RecurringExpenseItem[];
  // User's expense categories
  availableCategories: ExpenseCategoryInfo[];
}

// Holdings Summary Types
export interface HoldingItem {
  id: string;
  bankName: string;
  amount: number;
  familyMember: string | null;
  updatedAt: string;
}

export interface HoldingsSummaryResult {
  // Total liquid assets
  totalHoldings: number;
  holdingsCount: number;
  // Individual holdings
  holdings: HoldingItem[];
  // Family member breakdown (if applicable)
  holdingsByMember: Array<{
    memberName: string | null;
    totalAmount: number;
    accountCount: number;
  }>;
  // Notes
  notes: string[];
}

// Property Assets Summary Types
export interface PropertyAssetItem {
  id: string;
  propertyName: string;
  purchaseDate: string;
  originalPurchasePrice: number;
  loanAmountTaken: number | null;
  outstandingLoan: number;
  monthlyLoanPayment: number;
  interestRate: number;
  // CPF details
  principalCpfWithdrawn: number | null;
  housingGrantTaken: number | null;
  accruedInterestToDate: number | null;
  // Calculated fields
  equityOwned: number; // originalPurchasePrice - outstandingLoan
  loanProgress: number | null; // percentage of loan paid off
  isActive: boolean;
}

export interface PropertyAssetsSummaryResult {
  propertyCount: number;
  totalPropertyValue: number;
  totalOutstandingLoans: number;
  totalEquity: number;
  totalMonthlyPayments: number;
  properties: PropertyAssetItem[];
  notes: string[];
}

// Vehicle Assets Summary Types
export interface VehicleAssetItem {
  id: string;
  vehicleName: string;
  purchaseDate: string;
  coeExpiryDate: string | null;
  originalPurchasePrice: number;
  loanAmountTaken: number | null;
  loanAmountRepaid: number | null;
  monthlyLoanPayment: number | null;
  // Calculated fields
  outstandingLoan: number | null;
  loanProgress: number | null; // percentage of loan paid off
  coeYearsRemaining: number | null;
  isActive: boolean;
}

export interface VehicleAssetsSummaryResult {
  vehicleCount: number;
  totalVehicleValue: number;
  totalOutstandingLoans: number;
  totalMonthlyPayments: number;
  vehicles: VehicleAssetItem[];
  notes: string[];
}

// Other Assets Summary Types
export interface OtherAssetItem {
  id: string;
  name: string;
  type: string;
  currentValue: number;
  purchaseValue: number | null;
  purchaseDate: string | null;
  description: string | null;
  // Calculated
  gainLoss: number | null;
  gainLossPercent: number | null;
}

export interface OtherAssetsSummaryResult {
  assetCount: number;
  totalCurrentValue: number;
  totalPurchaseValue: number;
  totalGainLoss: number;
  // Breakdown by type
  assetsByType: Array<{
    type: string;
    count: number;
    totalValue: number;
  }>;
  assets: OtherAssetItem[];
  appliedFilter: string | null;
  notes: string[];
}

// Insurance Summary Types
export interface CoverageDetails {
  death: number | null;
  tpd: number | null;
  criticalIllness: number | null;
  earlyCriticalIllness: number | null;
  hospitalisationPlan: number | null;
}

export interface InsurancePolicyItem {
  id: string;
  provider: string;
  policyNumber: string | null;
  policyType: string;
  status: string;
  // Policy holder
  familyMember: string | null;
  // Dates
  startDate: string;
  maturityDate: string | null;
  coverageUntilAge: number | null;
  yearsActive: number;
  // Premium
  premiumAmount: number;
  premiumFrequency: string;
  annualPremium: number;
  totalPremiumDuration: number | null;
  // Coverage
  coverage: CoverageDetails | null;
  totalCoverage: number;
  description: string | null;
}

export interface InsuranceSummaryResult {
  policyCount: number;
  activePolicyCount: number;
  // Premium totals
  totalAnnualPremiums: number;
  totalMonthlyPremiums: number;
  // Coverage totals
  totalDeathCoverage: number;
  totalCriticalIllnessCoverage: number;
  // Breakdown by type
  policiesByType: Array<{
    type: string;
    count: number;
    annualPremium: number;
  }>;
  // Breakdown by provider
  policiesByProvider: Array<{
    provider: string;
    count: number;
    annualPremium: number;
  }>;
  // All policies
  policies: InsurancePolicyItem[];
  // Filters applied
  appliedTypeFilter: string | null;
  appliedStatusFilter: string;
  notes: string[];
}

// Daily Expense Summary Types
export interface DailyExpenseItem {
  id: string;
  date: string;
  categoryName: string;
  subcategoryName: string | null;
  amount: number;
  note: string | null;
  // Foreign currency details (if applicable)
  originalCurrency: string | null;
  originalAmount: number | null;
  exchangeRate: number | null;
}

export interface DailyExpenseCategoryBreakdown {
  categoryName: string;
  totalAmount: number;
  expenseCount: number;
  percentOfTotal: number;
  // Subcategory breakdown within this category
  subcategories: Array<{
    subcategoryName: string;
    totalAmount: number;
    expenseCount: number;
  }>;
}

export interface DailyExpenseSummaryResult {
  // Date range
  fromDate: string;
  toDate: string;
  daysCovered: number;
  // Totals
  totalSpent: number;
  expenseCount: number;
  averagePerDay: number;
  // Category breakdown
  categoryBreakdown: DailyExpenseCategoryBreakdown[];
  categoryCount: number;
  // All expense items (sorted by date descending)
  expenses: DailyExpenseItem[];
  // Filters applied
  appliedCategoryFilter: string | null;
  appliedSubcategoryFilter: string | null;
  // Available categories and subcategories for context
  availableCategories: string[];
  availableSubcategories: Array<{
    categoryName: string;
    subcategoryName: string;
  }>;
  notes: string[];
}

// Family Summary Types
export interface FamilyMemberSummary {
  memberId: string;
  displayName: string;
  relationship: string | null;
  includeInIncomeTotals: boolean;
  incomeSourceCount: number;
  incomeIdentityHint: string | null; // e.g., "Evan Lee's Salary"
  dateOfBirth: string | null;
}

export interface IncomeChangeSignal {
  memberId: string;
  memberName: string;
  type: "scheduled" | "detected";
  effectiveDate: string | null;
  description: string;
  confidence: "high" | "medium" | "low";
}

export interface FamilySummaryResult {
  // Query context
  scope: "household" | "member";
  month: string | null;
  // Family structure
  householdMembers: FamilyMemberSummary[];
  memberCount: number;
  // Inclusion breakdown
  includedMembers: Array<{ memberId: string; name: string }>;
  excludedMembers: Array<{ memberId: string; name: string }>;
  includedMemberCount: number;
  excludedMemberCount: number;
  // If member-specific query
  targetMember: FamilyMemberSummary | null;
  // Income change signals
  incomeChangeSignals: IncomeChangeSignal[];
  // Notes and assumptions
  notes: string[];
}

// Balance Summary Types
export interface MonthlyBalanceProjection {
  month: string; // "YYYY-MM" format
  monthLabel: string; // "Jan 2025" format
  income: number;
  expenses: number;
  netBalance: number; // income - expenses for this month
  cumulativeBalance: number; // running total from starting balance
  // New: track hypotheticals applied to this month
  hypotheticalsApplied?: Array<{ type: "income" | "expense"; amount: number; label?: string }>;
}

export interface HypotheticalImpact {
  type: "expense" | "income";
  amount: number;
  month: string;
  balanceWithout: number; // final balance without the hypothetical
  balanceWith: number; // final balance with the hypothetical
  impact: number; // difference
  percentOfMonthlyBalance: number | null; // only for expenses: what % of that month's net balance
}

// New: Affordability analysis result
export interface AffordabilityAnalysis {
  targetMonth: string; // "YYYY-MM"
  maxAffordableOneTimeExpense: number;
  bindingMonth: string; // the month where balance becomes tight
  minimumProjectedBalance: number;
  assumptions: string[];
}

// New: Constraints evaluation result
export interface ConstraintsEvaluation {
  minEndBalanceBreached: boolean;
  minMonthlyBalanceBreached: boolean;
  firstBreachMonth?: string; // "YYYY-MM"
  minEndBalanceRequired?: number;
  minMonthlyBalanceRequired?: number;
}

// New: Scenario summary for multi-hypotheticals
export interface ScenarioSummary {
  hypotheticalCount: number;
  monthsAffected: number;
  netImpact: number; // positive = net income, negative = net expense
  totalHypotheticalIncome: number;
  totalHypotheticalExpense: number;
}

// New: Safety assessment with traffic light system
export type SafetyStatus = "green" | "yellow" | "red";

export interface SafetyAssessment {
  // Traffic light status
  status: SafetyStatus;
  statusLabel: string; // "Safe", "Caution", "At Risk"
  // Emergency fund analysis
  emergencyFundMonths: number; // How many months of net income the minimum balance represents
  monthlyNetIncome: number; // Average monthly net income used for calculation
  // Thresholds
  greenThreshold: number; // 9 months of net income
  yellowThreshold: number; // 6 months of net income
  // Minimum balance details
  minimumBalance: number;
  minimumBalanceMonth: string; // "YYYY-MM"
  minimumBalanceMonthLabel: string; // "Aug 2026"
  // Recommendation
  recommendation: string;
}

// New: Safe purchase timing recommendation
export interface SafePurchaseRecommendation {
  expenseAmount: number;
  safetyThresholdMonths: number; // 6 months
  recommendedMonth: string | null; // "YYYY-MM" or null if never safe within projection
  recommendedMonthLabel: string | null; // "Aug 2026"
  balanceAfterPurchase: number | null;
  emergencyFundMonthsAfter: number | null;
  monthsToWait: number; // 0 if already safe, or number of months to wait
  isSafeNow: boolean;
  recommendation: string;
}

export interface BalanceSummaryResult {
  // Period info
  fromMonth: string;
  toMonth: string;
  monthCount: number;
  // Starting balance (from current holdings)
  startingBalance: number;
  // Monthly projections
  monthlyProjections: MonthlyBalanceProjection[];
  // Period totals
  totalIncome: number;
  totalExpenses: number;
  totalNetSavings: number;
  // Final balance
  finalBalance: number;
  // Hypothetical impact (if provided) - kept for backwards compatibility
  hypotheticalImpact: HypotheticalImpact | null;
  // Notes - kept for backwards compatibility
  notes: string[];

  // ===== NEW FIELDS (v2 enhancements) =====
  // Top-level assumptions for transparency
  assumptions: string[];
  // Affordability analysis (if computeMaxAffordableExpenseMonth was provided)
  affordabilityAnalysis?: AffordabilityAnalysis;
  // Constraints evaluation (if minEndBalance or minMonthlyBalance was provided)
  constraintsEvaluation?: ConstraintsEvaluation;
  // Scenario summary (if hypotheticals[] was provided)
  scenarioSummary?: ScenarioSummary;
  // Safety assessment (always included) - traffic light system based on emergency fund
  safetyAssessment: SafetyAssessment;
  // Safe purchase recommendation (if findSafeMonthForExpense was provided)
  safePurchaseRecommendation?: SafePurchaseRecommendation;
}

// =============================================================================
// Helper Functions
// =============================================================================

function parseMonth(monthStr: string): { year: number; month: number } {
  const [yearStr, monthStr2] = monthStr.split("-");
  return {
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr2, 10),
  };
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId;
  } catch {
    return null;
  }
}

/**
 * Get the number of months between two YYYY-MM strings (inclusive)
 */
function getMonthsBetween(fromMonth: string, toMonth: string): number {
  const from = parseMonth(fromMonth);
  const to = parseMonth(toMonth);
  return (to.year - from.year) * 12 + (to.month - from.month) + 1;
}

/**
 * Format a month for display (e.g., "2025-02" -> "Feb 2025")
 */
function formatMonthLabel(monthStr: string): string {
  const { year, month } = parseMonth(monthStr);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[month - 1]} ${year}`;
}

/**
 * Add N months to a YYYY-MM string
 */
function addMonthsToString(monthStr: string, offset: number): string {
  const { year, month } = parseMonth(monthStr);
  const totalMonths = year * 12 + (month - 1) + offset;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

// =============================================================================
// Tool Executor: get_income_summary
// =============================================================================

async function executeGetIncomeSummary(
  params: MonthParams,
  userId: string
): Promise<IncomeSummaryResult> {
  const { year, month } = parseMonth(params.month);

  // Get all active incomes for the user
  const userIncomes = await db
    .select()
    .from(incomes)
    .where(
      and(
        eq(incomes.userId, userId),
        eq(incomes.isActive, true)
      )
    );

  // Get family members to map IDs to names
  const userFamilyMembers = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.userId, userId));

  const familyMemberMap: Record<string, string> = {};
  userFamilyMembers.forEach((fm) => {
    familyMemberMap[fm.id] = fm.name;
  });

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  const incomeSources: IncomeSourceItem[] = [];

  // Totals
  let totalGrossIncome = 0;
  let totalNetIncome = 0;
  let totalEmployeeCpf = 0;
  let totalEmployerCpf = 0;
  let totalOrdinaryAccount = 0;
  let totalSpecialAccount = 0;
  let totalMedisaveAccount = 0;

  const targetPeriod = params.month; // "YYYY-MM" format
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const isHistoricalMonth = monthStart < currentMonthStart;

  for (const income of userIncomes) {
    let grossAmount = parseFloat(income.amount);
    const frequency = income.frequency.toLowerCase();
    const incomeStartDate = income.startDate ? new Date(income.startDate) : null;
    let incomeEndDate = income.endDate ? new Date(income.endDate) : null;
    let isUsingMilestone = false;
    let isUsingHistorical = false;
    let milestoneReason: string | undefined;

    // Check if income is active during this month (skip startDate check if null)
    if (incomeStartDate && incomeStartDate > monthEnd) continue;
    if (incomeEndDate && incomeEndDate < monthStart) continue;

    // Check for pastIncomeHistory for historical months
    if (isHistoricalMonth && income.pastIncomeHistory) {
      try {
        const history = JSON.parse(income.pastIncomeHistory) as Array<{
          period: string;
          granularity: "yearly" | "monthly";
          amount: number;
        }>;

        // Check for monthly granularity match first
        const monthlyEntry = history.find(
          h => h.granularity === "monthly" && h.period === targetPeriod
        );
        if (monthlyEntry) {
          grossAmount = monthlyEntry.amount;
          isUsingHistorical = true;
        } else {
          // Check for yearly granularity match
          const yearlyEntry = history.find(
            h => h.granularity === "yearly" && h.period === String(year)
          );
          if (yearlyEntry) {
            grossAmount = yearlyEntry.amount / 12;
            isUsingHistorical = true;
          }
        }
      } catch {
        // Fall through to current calculation
      }
    }

    // Check if income has future milestones (used to ignore endDate)
    let hasFutureMilestones = false;
    let parsedMilestones: FutureMilestone[] = [];
    if (income.futureMilestones) {
      try {
        parsedMilestones = JSON.parse(income.futureMilestones);
        hasFutureMilestones = parsedMilestones.length > 0;
      } catch {
        // ignore
      }
    }

    // Check for future milestones (salary changes) - only if not using historical data
    if (!isUsingHistorical && hasFutureMilestones && income.accountForFutureChange) {
      // Find the most recent milestone that applies to this month
      const applicableMilestones = parsedMilestones
        .filter(m => m.targetMonth <= targetPeriod)
        .sort((a, b) => b.targetMonth.localeCompare(a.targetMonth));

      if (applicableMilestones.length > 0) {
        grossAmount = applicableMilestones[0].amount;
        milestoneReason = applicableMilestones[0].reason;
        isUsingMilestone = true;
      }

      // If there are future milestones, the income continues indefinitely
      if (incomeEndDate) {
        incomeEndDate = null;
      }
    }

    // If using historical or milestone data with known amount, skip frequency calculation
    // and use the amount directly (it's already monthly)
    if (isUsingHistorical) {
      // Historical data is already the monthly amount, process it directly below
    }

    // Calculate frequency multiplier for monthly amount
    let frequencyMultiplier = 1;
    let appliesThisMonth = true;

    if (frequency === "monthly") {
      frequencyMultiplier = 1;
    } else if (frequency === "yearly") {
      frequencyMultiplier = 1 / 12;
    } else if (frequency === "weekly") {
      frequencyMultiplier = 4.33;
    } else if (frequency === "bi-weekly") {
      frequencyMultiplier = 2.17;
    } else if (frequency === "custom" && income.customMonths) {
      // Custom frequency: only include if this month is in the customMonths array
      try {
        const customMonths = JSON.parse(income.customMonths) as number[];
        appliesThisMonth = customMonths.includes(month);
        frequencyMultiplier = appliesThisMonth ? 1 : 0;
      } catch {
        appliesThisMonth = false;
        frequencyMultiplier = 0;
      }
    } else if (frequency === "one-time") {
      // One-time income: include full amount only if it falls in this month
      if (incomeStartDate &&
          incomeStartDate.getFullYear() === year &&
          incomeStartDate.getMonth() + 1 === month) {
        frequencyMultiplier = 1;
      } else {
        continue; // Skip this income if one-time and not in this month
      }
    } else if (frequency === "quarterly") {
      frequencyMultiplier = 1 / 3;
    }

    // Skip if this income doesn't apply this month (for custom frequency)
    if (!appliesThisMonth) continue;

    // Calculate monthly gross
    // For historical data, grossAmount is already the monthly amount
    const monthlyGross = isUsingHistorical ? grossAmount : grossAmount * frequencyMultiplier;

    // Get CPF data - recalculate if using milestone or historical amount
    const subjectToCpf = income.subjectToCpf || false;
    let employeeCpf: number;
    let employerCpf: number;
    let netTakeHome: number;
    let cpfOA: number;
    let cpfSA: number;
    let cpfMA: number;

    if ((isUsingMilestone || isUsingHistorical) && subjectToCpf) {
      // Dynamically recalculate CPF for the new amount
      const cpfResult = calculateCPF(monthlyGross);
      const allocations = getCPFAllocationByAge(30); // Default age 30
      const totalCpf = cpfResult.employeeCpfContribution + cpfResult.employerCpfContribution;

      employeeCpf = cpfResult.employeeCpfContribution;
      employerCpf = cpfResult.employerCpfContribution;
      netTakeHome = cpfResult.netTakeHome;
      cpfOA = totalCpf * allocations.oa;
      cpfSA = totalCpf * allocations.sa;
      cpfMA = totalCpf * allocations.ma;
    } else {
      // Use stored CPF values
      employeeCpf = income.employeeCpfContribution ? parseFloat(income.employeeCpfContribution) : 0;
      employerCpf = income.employerCpfContribution ? parseFloat(income.employerCpfContribution) : 0;
      netTakeHome = income.netTakeHome ? parseFloat(income.netTakeHome) : monthlyGross;
      cpfOA = income.cpfOrdinaryAccount ? parseFloat(income.cpfOrdinaryAccount) : 0;
      cpfSA = income.cpfSpecialAccount ? parseFloat(income.cpfSpecialAccount) : 0;
      cpfMA = income.cpfMedisaveAccount ? parseFloat(income.cpfMedisaveAccount) : 0;
    }

    // Add to totals
    totalGrossIncome += monthlyGross;
    totalNetIncome += subjectToCpf ? netTakeHome : monthlyGross;
    totalEmployeeCpf += employeeCpf;
    totalEmployerCpf += employerCpf;
    totalOrdinaryAccount += cpfOA;
    totalSpecialAccount += cpfSA;
    totalMedisaveAccount += cpfMA;

    // Get family member name if linked
    const familyMemberName = income.familyMemberId
      ? familyMemberMap[income.familyMemberId] || null
      : null;

    // Determine status based on incomeCategory and milestone
    let status = income.incomeCategory || "current-recurring";
    if (isUsingMilestone && milestoneReason) {
      status = `${status} (${milestoneReason})`;
    }

    // Build CPF breakdown if subject to CPF
    const cpfBreakdown: CpfBreakdown | null = subjectToCpf ? {
      subjectToCpf: true,
      employeeContribution: Math.round(employeeCpf * 100) / 100,
      employerContribution: Math.round(employerCpf * 100) / 100,
      totalContribution: Math.round((employeeCpf + employerCpf) * 100) / 100,
      netTakeHome: Math.round(netTakeHome * 100) / 100,
      ordinaryAccount: Math.round(cpfOA * 100) / 100,
      specialAccount: Math.round(cpfSA * 100) / 100,
      medisaveAccount: Math.round(cpfMA * 100) / 100,
    } : null;

    incomeSources.push({
      name: income.name,
      category: income.category,
      grossAmount: Math.round(monthlyGross * 100) / 100,
      monthlyAmount: Math.round((subjectToCpf ? netTakeHome : monthlyGross) * 100) / 100,
      frequency: income.frequency,
      familyMember: familyMemberName,
      status,
      cpf: cpfBreakdown,
    });
  }

  // Sort by gross amount (highest first)
  incomeSources.sort((a, b) => b.grossAmount - a.grossAmount);

  return {
    month: params.month,
    // Totals
    totalGrossIncome: Math.round(totalGrossIncome * 100) / 100,
    totalNetIncome: Math.round(totalNetIncome * 100) / 100,
    // CPF totals
    totalEmployeeCpf: Math.round(totalEmployeeCpf * 100) / 100,
    totalEmployerCpf: Math.round(totalEmployerCpf * 100) / 100,
    totalCpfContribution: Math.round((totalEmployeeCpf + totalEmployerCpf) * 100) / 100,
    // CPF account totals
    totalOrdinaryAccount: Math.round(totalOrdinaryAccount * 100) / 100,
    totalSpecialAccount: Math.round(totalSpecialAccount * 100) / 100,
    totalMedisaveAccount: Math.round(totalMedisaveAccount * 100) / 100,
    // Sources
    incomeSources,
    incomeSourceCount: incomeSources.length,
  };
}

// =============================================================================
// Tool Executor: get_expenses_summary
// =============================================================================

async function executeGetExpensesSummary(
  params: MonthParams,
  userId: string
): Promise<ExpensesSummaryResult> {
  const { year, month } = parseMonth(params.month);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  // Fetch active expenses for the user
  const userExpenses = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.isActive, true)
      )
    );

  // Fetch user's expense categories
  const userExpenseCategories = await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.userId, userId));

  // Process expenses and calculate monthly amounts
  const expenseItems: RecurringExpenseItem[] = [];
  const categoryTotals: Record<string, { amount: number; count: number }> = {};
  let totalMonthlyExpenses = 0;

  for (const expense of userExpenses) {
    const amount = parseFloat(expense.amount);
    const frequency = expense.frequency.toLowerCase();
    const expenseStartDate = expense.startDate ? new Date(expense.startDate) : null;
    const expenseEndDate = expense.endDate ? new Date(expense.endDate) : null;

    // Check if expense is active during this month
    if (expenseStartDate && expenseStartDate > monthEnd) continue;
    if (expenseEndDate && expenseEndDate < monthStart) continue;

    // Calculate monthly amount based on frequency
    let monthlyAmount = 0;
    let appliesThisMonth = true;

    if (frequency === "monthly") {
      monthlyAmount = amount;
    } else if (frequency === "yearly") {
      monthlyAmount = amount / 12;
    } else if (frequency === "weekly") {
      monthlyAmount = amount * 4.33;
    } else if (frequency === "bi-weekly") {
      monthlyAmount = amount * 2.17;
    } else if (frequency === "custom" && expense.customMonths) {
      // Custom frequency: only include if this month is in the customMonths array
      try {
        const customMonths = JSON.parse(expense.customMonths) as number[];
        appliesThisMonth = customMonths.includes(month);
        monthlyAmount = appliesThisMonth ? amount : 0;
      } catch {
        appliesThisMonth = false;
        monthlyAmount = 0;
      }
    } else if (frequency === "one-time") {
      // One-time expense: include full amount only if it falls in this month
      if (expenseStartDate &&
          expenseStartDate.getFullYear() === year &&
          expenseStartDate.getMonth() + 1 === month) {
        monthlyAmount = amount;
      } else {
        continue; // Skip if one-time and not in this month
      }
    } else if (frequency === "quarterly") {
      monthlyAmount = amount / 3;
    } else {
      // Default to the stated amount
      monthlyAmount = amount;
    }

    // Skip if expense doesn't apply this month
    if (!appliesThisMonth) continue;

    if (monthlyAmount > 0) {
      totalMonthlyExpenses += monthlyAmount;

      // Category breakdown
      const catName = expense.category;
      if (!categoryTotals[catName]) {
        categoryTotals[catName] = { amount: 0, count: 0 };
      }
      categoryTotals[catName].amount += monthlyAmount;
      categoryTotals[catName].count += 1;

      // Add to expense items
      expenseItems.push({
        name: expense.name,
        category: expense.category,
        expenseType: expense.expenseCategory || "current-recurring",
        amount: Math.round(amount * 100) / 100,
        monthlyAmount: Math.round(monthlyAmount * 100) / 100,
        frequency: expense.frequency,
        isActive: expense.isActive || false,
        trackedInBudget: expense.trackedInBudget || false,
      });
    }
  }

  // Build category breakdown (sorted by amount, highest first)
  const categoryBreakdown: ExpenseCategoryBreakdown[] = Object.entries(categoryTotals)
    .map(([categoryName, data]) => ({
      categoryName,
      monthlyAmount: Math.round(data.amount * 100) / 100,
      expenseCount: data.count,
      percentOfTotal: totalMonthlyExpenses > 0
        ? Math.round((data.amount / totalMonthlyExpenses) * 1000) / 10
        : 0,
    }))
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  // Sort expenses by monthly amount (highest first)
  expenseItems.sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  // Build available categories list
  const availableCategories: ExpenseCategoryInfo[] = userExpenseCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    isDefault: cat.isDefault || false,
    trackedInBudget: cat.trackedInBudget || true,
  }));

  return {
    month: params.month,
    totalMonthlyExpenses: Math.round(totalMonthlyExpenses * 100) / 100,
    expenseCount: expenseItems.length,
    categoryBreakdown,
    categoryCount: categoryBreakdown.length,
    expenses: expenseItems,
    availableCategories,
  };
}

// =============================================================================
// Tool Executor: get_family_summary
// =============================================================================

async function executeGetFamilySummary(
  params: FamilySummaryParams,
  userId: string
): Promise<FamilySummaryResult> {
  // Determine effective scope
  const effectiveScope: "household" | "member" =
    params.scope === "auto"
      ? (params.memberId || params.memberName ? "member" : "household")
      : params.scope;

  // Get all family members for this user
  const userFamilyMembers = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.userId, userId));

  // Get all incomes for this user (to link to family members)
  const userIncomes = await db
    .select()
    .from(incomes)
    .where(and(
      eq(incomes.userId, userId),
      eq(incomes.isActive, true)
    ));

  // Build family member summaries
  const householdMembers: FamilyMemberSummary[] = [];
  const includedMembers: Array<{ memberId: string; name: string }> = [];
  const excludedMembers: Array<{ memberId: string; name: string }> = [];
  const notes: string[] = [];
  const incomeChangeSignals: IncomeChangeSignal[] = [];
  let targetMember: FamilyMemberSummary | null = null;

  for (const member of userFamilyMembers) {
    // Find incomes associated with this family member
    const memberIncomes = userIncomes.filter(
      (inc) => inc.familyMemberId === member.id
    );

    // Get income identity hint (first income name associated with this member)
    const incomeIdentityHint = memberIncomes.length > 0
      ? memberIncomes[0].name
      : null;

    const memberSummary: FamilyMemberSummary = {
      memberId: member.id,
      displayName: member.name,
      relationship: member.relationship || null,
      includeInIncomeTotals: member.isContributing || false,
      incomeSourceCount: memberIncomes.length,
      incomeIdentityHint,
      dateOfBirth: member.dateOfBirth || null,
    };

    householdMembers.push(memberSummary);

    // Track inclusion/exclusion
    if (member.isContributing) {
      includedMembers.push({ memberId: member.id, name: member.name });
    } else {
      excludedMembers.push({ memberId: member.id, name: member.name });
      notes.push(`${member.name} is excluded from household income totals per family settings`);
    }

    // Check for income change signals via futureMilestones
    for (const income of memberIncomes) {
      if (income.futureMilestones) {
        try {
          const milestones: FutureMilestone[] = JSON.parse(income.futureMilestones);
          for (const milestone of milestones) {
            incomeChangeSignals.push({
              memberId: member.id,
              memberName: member.name,
              type: "scheduled",
              effectiveDate: milestone.targetMonth,
              description: `${member.name}'s income (${income.name}) scheduled to change to $${milestone.amount.toLocaleString()} in ${milestone.targetMonth}${milestone.reason ? ` (${milestone.reason})` : ""}`,
              confidence: "high",
            });
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    // Check if this is the target member for member-specific queries
    if (effectiveScope === "member") {
      const nameMatch = params.memberName
        ? member.name.toLowerCase().includes(params.memberName.toLowerCase()) ||
          (params.memberName.toLowerCase() === "spouse" && member.relationship?.toLowerCase() === "spouse") ||
          (params.memberName.toLowerCase() === "wife" && member.relationship?.toLowerCase() === "spouse") ||
          (params.memberName.toLowerCase() === "husband" && member.relationship?.toLowerCase() === "spouse")
        : false;
      const idMatch = params.memberId === member.id;

      if (idMatch || nameMatch) {
        targetMember = memberSummary;
      }
    }
  }

  // Add note if no family members found
  if (householdMembers.length === 0) {
    notes.push("No family members have been added yet. Income totals include all user incomes.");
  }

  // Add note about scope
  if (effectiveScope === "member" && !targetMember && (params.memberId || params.memberName)) {
    notes.push(`Could not find family member matching '${params.memberName || params.memberId}'. Showing all household members.`);
  }

  return {
    scope: effectiveScope,
    month: params.month || null,
    householdMembers,
    memberCount: householdMembers.length,
    includedMembers,
    excludedMembers,
    includedMemberCount: includedMembers.length,
    excludedMemberCount: excludedMembers.length,
    targetMember,
    incomeChangeSignals,
    notes,
  };
}

// =============================================================================
// Tool Executor: get_balance_summary
// =============================================================================

/**
 * Helper: Calculate base income for a month (without hypotheticals)
 */
function calculateMonthlyIncomeForMonth(
  userIncomes: Array<{
    amount: string;
    frequency: string;
    startDate: string;
    endDate: string | null;
    customMonths: string | null;
    futureMilestones: string | null;
    accountForFutureChange: boolean | null;
    subjectToCpf: boolean | null;
    netTakeHome: string | null;
  }>,
  currentMonth: string,
  year: number,
  month: number,
  monthStart: Date,
  monthEnd: Date
): number {
  let monthlyIncome = 0;

  for (const income of userIncomes) {
    let amount = parseFloat(income.amount);
    const frequency = income.frequency.toLowerCase();
    const incomeStartDate = income.startDate ? new Date(income.startDate) : null;
    let incomeEndDate = income.endDate ? new Date(income.endDate) : null;

    if (incomeStartDate && incomeStartDate > monthEnd) continue;
    if (incomeEndDate && incomeEndDate < monthStart) continue;

    let isUsingMilestone = false;
    if (income.futureMilestones && income.accountForFutureChange) {
      try {
        const milestones: FutureMilestone[] = JSON.parse(income.futureMilestones);
        const applicableMilestones = milestones
          .filter(m => m.targetMonth <= currentMonth)
          .sort((a, b) => b.targetMonth.localeCompare(a.targetMonth));

        if (applicableMilestones.length > 0) {
          amount = applicableMilestones[0].amount;
          isUsingMilestone = true;
        }

        if (milestones.length > 0 && incomeEndDate) {
          incomeEndDate = null;
        }
      } catch {
        // Fall through
      }
    }

    let effectiveAmount = amount;
    if (income.subjectToCpf) {
      if (isUsingMilestone) {
        const cpfResult = calculateCPF(amount);
        effectiveAmount = cpfResult.netTakeHome;
      } else {
        effectiveAmount = income.netTakeHome ? parseFloat(income.netTakeHome) : amount;
      }
    }

    let allocatedAmount = 0;
    if (frequency === "monthly") {
      allocatedAmount = effectiveAmount;
    } else if (frequency === "yearly") {
      const startMonth = incomeStartDate ? incomeStartDate.getMonth() + 1 : 1;
      if (month === startMonth) {
        allocatedAmount = effectiveAmount;
      }
    } else if (frequency === "custom" && income.customMonths) {
      try {
        const customMonths = JSON.parse(income.customMonths) as number[];
        if (customMonths.includes(month)) {
          allocatedAmount = effectiveAmount;
        }
      } catch {
        // Skip
      }
    } else if (frequency === "one-time") {
      if (incomeStartDate &&
          incomeStartDate.getFullYear() === year &&
          incomeStartDate.getMonth() + 1 === month) {
        allocatedAmount = effectiveAmount;
      }
    } else if (frequency === "quarterly") {
      if (incomeStartDate) {
        const monthsSinceStart = (year - incomeStartDate.getFullYear()) * 12 +
                                 (month - 1 - incomeStartDate.getMonth());
        if (monthsSinceStart >= 0 && monthsSinceStart % 3 === 0) {
          allocatedAmount = effectiveAmount;
        }
      }
    }

    monthlyIncome += allocatedAmount;
  }

  return monthlyIncome;
}

/**
 * Helper: Calculate base expenses for a month (without hypotheticals)
 */
function calculateMonthlyExpensesForMonth(
  userExpenses: Array<{
    amount: string;
    frequency: string;
    startDate: string | null;
    endDate: string | null;
    customMonths: string | null;
  }>,
  year: number,
  month: number,
  monthStart: Date,
  monthEnd: Date
): number {
  let monthlyExpense = 0;

  for (const expense of userExpenses) {
    const amount = parseFloat(expense.amount);
    const frequency = expense.frequency.toLowerCase();
    const expenseStartDate = expense.startDate ? new Date(expense.startDate) : null;
    const expenseEndDate = expense.endDate ? new Date(expense.endDate) : null;

    if (expenseStartDate && expenseStartDate > monthEnd) continue;
    if (expenseEndDate && expenseEndDate < monthStart) continue;

    let allocatedAmount = 0;
    if (frequency === "monthly") {
      allocatedAmount = amount;
    } else if (frequency === "yearly") {
      const startMonth = expenseStartDate ? expenseStartDate.getMonth() + 1 : 1;
      if (month === startMonth) {
        allocatedAmount = amount;
      }
    } else if (frequency === "custom" && expense.customMonths) {
      try {
        const customMonths = JSON.parse(expense.customMonths) as number[];
        if (customMonths.includes(month)) {
          allocatedAmount = amount;
        }
      } catch {
        // Skip
      }
    } else if (frequency === "one-time") {
      if (expenseStartDate &&
          expenseStartDate.getFullYear() === year &&
          expenseStartDate.getMonth() + 1 === month) {
        allocatedAmount = amount;
      }
    } else if (frequency === "quarterly") {
      if (expenseStartDate) {
        const monthsSinceStart = (year - expenseStartDate.getFullYear()) * 12 +
                                 (month - 1 - expenseStartDate.getMonth());
        if (monthsSinceStart >= 0 && monthsSinceStart % 3 === 0) {
          allocatedAmount = amount;
        }
      }
    }

    monthlyExpense += allocatedAmount;
  }

  return monthlyExpense;
}

async function executeGetBalanceSummary(
  params: BalanceSummaryParams,
  userId: string
): Promise<BalanceSummaryResult> {
  const notes: string[] = [];
  const assumptions: string[] = [];
  const monthCount = getMonthsBetween(params.fromMonth, params.toMonth);

  // Validate date range
  if (monthCount <= 0) {
    throw new Error("toMonth must be after or equal to fromMonth");
  }

  // Fetch starting balance from current holdings
  const holdings = await db
    .select()
    .from(currentHoldings)
    .where(eq(currentHoldings.userId, userId));

  const startingBalance = holdings.reduce((total, holding) => {
    return total + parseFloat(holding.holdingAmount);
  }, 0);

  if (holdings.length === 0) {
    notes.push("No current holdings found. Starting balance is $0.");
  } else {
    notes.push(`Starting balance calculated from ${holdings.length} holding(s).`);
  }
  assumptions.push("Starting balance taken from current_holdings table");

  // Fetch all active incomes and expenses
  const userIncomes = await db
    .select()
    .from(incomes)
    .where(and(eq(incomes.userId, userId), eq(incomes.isActive, true)));

  const userExpenses = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.userId, userId), eq(expenses.isActive, true)));

  assumptions.push("Future income estimated using current active income sources");
  assumptions.push("Recurring expenses assumed constant unless end date specified");
  assumptions.push("No investment growth included");
  assumptions.push("CPF contributions calculated based on current rates");

  // Normalize hypotheticals: use new array format if provided, else convert legacy params
  let effectiveHypotheticals: HypotheticalItem[] = [];
  const usingNewHypotheticalsFormat = params.hypotheticals && params.hypotheticals.length > 0;

  if (usingNewHypotheticalsFormat) {
    effectiveHypotheticals = params.hypotheticals!;
    assumptions.push(`Using ${effectiveHypotheticals.length} hypothetical scenario(s)`);
  } else {
    // Convert legacy single hypothetical params to array format
    if (params.hypotheticalExpense && params.hypotheticalExpenseMonth) {
      effectiveHypotheticals.push({
        type: "expense",
        amount: params.hypotheticalExpense,
        month: params.hypotheticalExpenseMonth,
      });
    }
    if (params.hypotheticalIncome && params.hypotheticalIncomeMonth) {
      effectiveHypotheticals.push({
        type: "income",
        amount: params.hypotheticalIncome,
        month: params.hypotheticalIncomeMonth,
      });
    }
  }

  // Build a map of hypotheticals by month for quick lookup
  const hypotheticalsByMonth = new Map<string, HypotheticalItem[]>();
  for (const hyp of effectiveHypotheticals) {
    const existing = hypotheticalsByMonth.get(hyp.month) || [];
    existing.push(hyp);
    hypotheticalsByMonth.set(hyp.month, existing);
  }

  // Calculate monthly projections
  const monthlyProjections: MonthlyBalanceProjection[] = [];
  let cumulativeBalance = startingBalance;
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalBaseIncome = 0; // Track base income separately (without hypotheticals) for safety assessment
  let minimumBalance = startingBalance;
  let minimumBalanceMonth = params.fromMonth;

  for (let i = 0; i < monthCount; i++) {
    const currentMonth = addMonthsToString(params.fromMonth, i);
    const { year, month } = parseMonth(currentMonth);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    // Calculate base income and expenses
    const baseIncome = calculateMonthlyIncomeForMonth(
      userIncomes, currentMonth, year, month, monthStart, monthEnd
    );
    const baseExpense = calculateMonthlyExpensesForMonth(
      userExpenses, year, month, monthStart, monthEnd
    );

    // Track base income for safety assessment (excludes hypotheticals)
    totalBaseIncome += baseIncome;

    // Apply hypotheticals for this month
    const monthHypotheticals = hypotheticalsByMonth.get(currentMonth) || [];
    let hypotheticalIncomeThisMonth = 0;
    let hypotheticalExpenseThisMonth = 0;
    const appliedHypotheticals: Array<{ type: "income" | "expense"; amount: number; label?: string }> = [];

    for (const hyp of monthHypotheticals) {
      if (hyp.type === "income") {
        hypotheticalIncomeThisMonth += hyp.amount;
      } else {
        hypotheticalExpenseThisMonth += hyp.amount;
      }
      appliedHypotheticals.push({ type: hyp.type, amount: hyp.amount, label: hyp.label });
    }

    const effectiveIncome = baseIncome + hypotheticalIncomeThisMonth;
    const effectiveExpense = baseExpense + hypotheticalExpenseThisMonth;
    const netBalance = effectiveIncome - effectiveExpense;
    cumulativeBalance += netBalance;
    totalIncome += effectiveIncome;
    totalExpenses += effectiveExpense;

    // Track minimum balance
    if (cumulativeBalance < minimumBalance) {
      minimumBalance = cumulativeBalance;
      minimumBalanceMonth = currentMonth;
    }

    const projection: MonthlyBalanceProjection = {
      month: currentMonth,
      monthLabel: formatMonthLabel(currentMonth),
      income: Math.round(effectiveIncome * 100) / 100,
      expenses: Math.round(effectiveExpense * 100) / 100,
      netBalance: Math.round(netBalance * 100) / 100,
      cumulativeBalance: Math.round(cumulativeBalance * 100) / 100,
    };

    if (appliedHypotheticals.length > 0) {
      projection.hypotheticalsApplied = appliedHypotheticals;
    }

    monthlyProjections.push(projection);
  }

  // Calculate average base monthly net income from projections (excludes hypotheticals)
  // This is used for safety assessment and affordability calculations
  const baseMonthlyNetIncome = monthCount > 0 ? totalBaseIncome / monthCount : 0;

  // Calculate hypothetical impact (backwards compatible - uses first expense or income)
  let hypotheticalImpact: HypotheticalImpact | null = null;
  const firstExpenseHyp = effectiveHypotheticals.find(h => h.type === "expense");
  const firstIncomeHyp = effectiveHypotheticals.find(h => h.type === "income");

  if (firstExpenseHyp) {
    const finalWithout = cumulativeBalance + firstExpenseHyp.amount;
    const targetProjection = monthlyProjections.find(p => p.month === firstExpenseHyp.month);
    const monthNetWithout = targetProjection ? targetProjection.netBalance + firstExpenseHyp.amount : null;

    hypotheticalImpact = {
      type: "expense",
      amount: firstExpenseHyp.amount,
      month: firstExpenseHyp.month,
      balanceWithout: Math.round(finalWithout * 100) / 100,
      balanceWith: Math.round(cumulativeBalance * 100) / 100,
      impact: Math.round(-firstExpenseHyp.amount * 100) / 100,
      percentOfMonthlyBalance: monthNetWithout && monthNetWithout !== 0
        ? Math.round((firstExpenseHyp.amount / monthNetWithout) * 1000) / 10
        : null,
    };
    notes.push(`Hypothetical expense of $${firstExpenseHyp.amount.toLocaleString()}${firstExpenseHyp.label ? ` (${firstExpenseHyp.label})` : ""} in ${formatMonthLabel(firstExpenseHyp.month)} included.`);
  } else if (firstIncomeHyp) {
    const finalWithout = cumulativeBalance - firstIncomeHyp.amount;

    hypotheticalImpact = {
      type: "income",
      amount: firstIncomeHyp.amount,
      month: firstIncomeHyp.month,
      balanceWithout: Math.round(finalWithout * 100) / 100,
      balanceWith: Math.round(cumulativeBalance * 100) / 100,
      impact: Math.round(firstIncomeHyp.amount * 100) / 100,
      percentOfMonthlyBalance: null,
    };
    notes.push(`Hypothetical income of $${firstIncomeHyp.amount.toLocaleString()}${firstIncomeHyp.label ? ` (${firstIncomeHyp.label})` : ""} in ${formatMonthLabel(firstIncomeHyp.month)} included.`);
  }

  // Build scenario summary if hypotheticals were provided
  let scenarioSummary: ScenarioSummary | undefined;
  if (effectiveHypotheticals.length > 0) {
    const totalHypIncome = effectiveHypotheticals
      .filter(h => h.type === "income")
      .reduce((sum, h) => sum + h.amount, 0);
    const totalHypExpense = effectiveHypotheticals
      .filter(h => h.type === "expense")
      .reduce((sum, h) => sum + h.amount, 0);
    const affectedMonths = new Set(effectiveHypotheticals.map(h => h.month)).size;

    scenarioSummary = {
      hypotheticalCount: effectiveHypotheticals.length,
      monthsAffected: affectedMonths,
      netImpact: Math.round((totalHypIncome - totalHypExpense) * 100) / 100,
      totalHypotheticalIncome: Math.round(totalHypIncome * 100) / 100,
      totalHypotheticalExpense: Math.round(totalHypExpense * 100) / 100,
    };
  }

  // Evaluate constraints if provided
  let constraintsEvaluation: ConstraintsEvaluation | undefined;
  const minEndBalanceProvided = params.minEndBalance !== undefined;
  const minMonthlyBalanceProvided = params.minMonthlyBalance !== undefined;

  if (minEndBalanceProvided || minMonthlyBalanceProvided) {
    const minEndBalanceBreached = minEndBalanceProvided && cumulativeBalance < params.minEndBalance!;
    let minMonthlyBalanceBreached = false;
    let firstBreachMonth: string | undefined;

    if (minMonthlyBalanceProvided) {
      for (const proj of monthlyProjections) {
        if (proj.cumulativeBalance < params.minMonthlyBalance!) {
          minMonthlyBalanceBreached = true;
          if (!firstBreachMonth) {
            firstBreachMonth = proj.month;
          }
        }
      }
    }

    constraintsEvaluation = {
      minEndBalanceBreached,
      minMonthlyBalanceBreached,
      firstBreachMonth,
      minEndBalanceRequired: params.minEndBalance,
      minMonthlyBalanceRequired: params.minMonthlyBalance,
    };

    if (minEndBalanceBreached) {
      notes.push(`Warning: Final balance ($${Math.round(cumulativeBalance).toLocaleString()}) is below minimum required ($${params.minEndBalance!.toLocaleString()}).`);
    }
    if (minMonthlyBalanceBreached && firstBreachMonth) {
      notes.push(`Warning: Balance drops below minimum ($${params.minMonthlyBalance!.toLocaleString()}) starting in ${formatMonthLabel(firstBreachMonth)}.`);
    }
  }

  // Compute max affordable expense if requested
  let affordabilityAnalysis: AffordabilityAnalysis | undefined;
  if (params.computeMaxAffordableExpenseMonth) {
    const targetMonth = params.computeMaxAffordableExpenseMonth;

    // Default to 6 months of net income as the safety floor (emergency fund minimum)
    // This ensures any expense recommendation maintains at least 6 months emergency fund
    const defaultSafetyFloor = baseMonthlyNetIncome * 6;
    const minAllowedBalance = params.minMonthlyBalance ?? defaultSafetyFloor;

    // We need to find the max expense that can be added to targetMonth
    // such that no month from targetMonth onwards drops below minAllowedBalance

    // First, compute projections WITHOUT any hypotheticals to get the baseline
    let baselineBalance = startingBalance;
    const baselineProjections: Array<{ month: string; cumulativeBalance: number }> = [];

    for (let i = 0; i < monthCount; i++) {
      const currentMonth = addMonthsToString(params.fromMonth, i);
      const { year, month } = parseMonth(currentMonth);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);

      const baseIncome = calculateMonthlyIncomeForMonth(
        userIncomes, currentMonth, year, month, monthStart, monthEnd
      );
      const baseExpense = calculateMonthlyExpensesForMonth(
        userExpenses, year, month, monthStart, monthEnd
      );

      baselineBalance += baseIncome - baseExpense;
      baselineProjections.push({ month: currentMonth, cumulativeBalance: baselineBalance });
    }

    // Find the minimum balance from targetMonth onwards (the binding constraint)
    const targetMonthIndex = baselineProjections.findIndex(p => p.month === targetMonth);

    if (targetMonthIndex === -1) {
      // Target month is outside the projection range
      affordabilityAnalysis = {
        targetMonth,
        maxAffordableOneTimeExpense: 0,
        bindingMonth: targetMonth,
        minimumProjectedBalance: minAllowedBalance,
        assumptions: [`Target month ${targetMonth} is outside the projection range (${params.fromMonth} to ${params.toMonth})`],
      };
    } else {
      // Find minimum balance from targetMonth to end of projection
      let minBalanceFromTarget = Infinity;
      let bindingMonth = targetMonth;

      for (let i = targetMonthIndex; i < baselineProjections.length; i++) {
        if (baselineProjections[i].cumulativeBalance < minBalanceFromTarget) {
          minBalanceFromTarget = baselineProjections[i].cumulativeBalance;
          bindingMonth = baselineProjections[i].month;
        }
      }

      // Max affordable = minBalanceFromTarget - minAllowedBalance
      // Because adding an expense in targetMonth reduces all subsequent balances by that amount
      const maxAffordable = Math.max(0, minBalanceFromTarget - minAllowedBalance);

      // Determine if we're using the safety floor or a custom constraint
      const usingSafetyFloor = params.minMonthlyBalance === undefined;

      affordabilityAnalysis = {
        targetMonth,
        maxAffordableOneTimeExpense: Math.round(maxAffordable * 100) / 100,
        bindingMonth,
        minimumProjectedBalance: Math.round(minBalanceFromTarget * 100) / 100,
        assumptions: [
          `Calculated based on baseline projections without hypotheticals`,
          usingSafetyFloor
            ? `Safety floor: $${Math.round(minAllowedBalance).toLocaleString()} (6 months of net income as emergency fund)`
            : `Minimum balance constraint: $${minAllowedBalance.toLocaleString()}`,
          `Binding month is ${formatMonthLabel(bindingMonth)} where balance would be tightest`,
        ],
      };

      if (usingSafetyFloor) {
        notes.push(`Max affordable one-time expense in ${formatMonthLabel(targetMonth)}: $${Math.round(maxAffordable).toLocaleString()} (while maintaining 6-month emergency fund)`);
      } else {
        notes.push(`Max affordable one-time expense in ${formatMonthLabel(targetMonth)}: $${Math.round(maxAffordable).toLocaleString()}`);
      }
    }
  }

  // ==========================================================================
  // Safety Assessment (Traffic Light System) - ALWAYS calculated
  // ==========================================================================

  // Calculate thresholds (6 and 9 months of net income)
  const yellowThreshold = baseMonthlyNetIncome * 6; // Below this = RED
  const greenThreshold = baseMonthlyNetIncome * 9;  // At or above this = GREEN

  // Determine which balance to check for safety assessment:
  // - If there are hypothetical EXPENSES, use the balance in the expense month (most relevant)
  // - If no hypotheticals, use the minimum balance across all months (general projection)
  let safetyCheckBalance: number;
  let safetyCheckMonth: string;

  const hypotheticalExpenses = effectiveHypotheticals.filter(h => h.type === "expense");

  if (hypotheticalExpenses.length > 0) {
    // Find the balance in the month of the FIRST hypothetical expense
    // This is the most relevant month when user asks "can I afford X in month Y?"
    const expenseMonth = hypotheticalExpenses[0].month;
    const expenseMonthProjection = monthlyProjections.find(p => p.month === expenseMonth);

    if (expenseMonthProjection) {
      safetyCheckBalance = expenseMonthProjection.cumulativeBalance;
      safetyCheckMonth = expenseMonth;
    } else {
      // Expense month not in projection range - use final balance
      safetyCheckBalance = cumulativeBalance;
      safetyCheckMonth = params.toMonth;
    }
  } else {
    // No hypothetical expenses - use minimum balance across all months
    safetyCheckBalance = startingBalance;
    safetyCheckMonth = params.fromMonth;

    for (const proj of monthlyProjections) {
      if (proj.cumulativeBalance < safetyCheckBalance) {
        safetyCheckBalance = proj.cumulativeBalance;
        safetyCheckMonth = proj.month;
      }
    }
  }

  // Calculate how many months of emergency fund the balance represents
  const emergencyFundMonths = baseMonthlyNetIncome > 0
    ? safetyCheckBalance / baseMonthlyNetIncome
    : 0;

  // Determine status
  let safetyStatus: SafetyStatus;
  let statusLabel: string;
  let recommendation: string;

  if (baseMonthlyNetIncome === 0) {
    // No income data available - can't calculate safety
    safetyStatus = "yellow";
    statusLabel = "Unknown";
    recommendation = "Unable to calculate emergency fund coverage - no recurring income data found.";
  } else if (safetyCheckBalance >= greenThreshold) {
    safetyStatus = "green";
    statusLabel = "Safe";
    if (hypotheticalExpenses.length > 0) {
      recommendation = `After this expense, your emergency fund would be ${emergencyFundMonths.toFixed(1)} months of income in ${formatMonthLabel(safetyCheckMonth)} - well above the recommended 9 months.`;
    } else {
      recommendation = `Your emergency fund remains healthy at ${emergencyFundMonths.toFixed(1)} months of income throughout the projection period.`;
    }
  } else if (safetyCheckBalance >= yellowThreshold) {
    safetyStatus = "yellow";
    statusLabel = "Caution";
    if (hypotheticalExpenses.length > 0) {
      recommendation = `After this expense, your balance would be ${emergencyFundMonths.toFixed(1)} months of income in ${formatMonthLabel(safetyCheckMonth)}. Consider whether this expense is essential, as it reduces your safety buffer below the recommended 9 months.`;
    } else {
      recommendation = `Your balance dips to ${emergencyFundMonths.toFixed(1)} months of income in ${formatMonthLabel(safetyCheckMonth)}. Consider building a larger emergency fund buffer.`;
    }
  } else {
    safetyStatus = "red";
    statusLabel = "At Risk";
    if (hypotheticalExpenses.length > 0) {
      recommendation = `Warning: After this expense, your balance would drop to only ${emergencyFundMonths.toFixed(1)} months of income in ${formatMonthLabel(safetyCheckMonth)}, which is below the recommended 6-month emergency fund. This expense is not recommended unless absolutely necessary.`;
    } else {
      recommendation = `Warning: Your balance would drop to only ${emergencyFundMonths.toFixed(1)} months of income in ${formatMonthLabel(safetyCheckMonth)}, which is below the recommended 6-month emergency fund.`;
    }
  }

  // Add safety note if not green
  if (safetyStatus !== "green") {
    notes.push(`Safety Alert: Balance reaches ${emergencyFundMonths.toFixed(1)} months of income (${statusLabel}) in ${formatMonthLabel(safetyCheckMonth)}.`);
  }

  const safetyAssessment: SafetyAssessment = {
    status: safetyStatus,
    statusLabel,
    emergencyFundMonths: Math.round(emergencyFundMonths * 10) / 10,
    monthlyNetIncome: Math.round(baseMonthlyNetIncome * 100) / 100,
    greenThreshold: Math.round(greenThreshold * 100) / 100,
    yellowThreshold: Math.round(yellowThreshold * 100) / 100,
    minimumBalance: Math.round(safetyCheckBalance * 100) / 100,
    minimumBalanceMonth: safetyCheckMonth,
    minimumBalanceMonthLabel: formatMonthLabel(safetyCheckMonth),
    recommendation,
  };

  // ==========================================================================
  // Safe Purchase Recommendation (if findSafeMonthForExpense was provided)
  // ==========================================================================

  let safePurchaseRecommendation: SafePurchaseRecommendation | undefined;

  if (params.findSafeMonthForExpense) {
    const expenseAmount = params.findSafeMonthForExpense;
    const safetyThresholdMonths = 6; // Must maintain at least 6 months of income

    // Calculate projections WITHOUT any hypotheticals to get the baseline
    let baselineBalance = startingBalance;
    const baselineProjections: Array<{ month: string; cumulativeBalance: number }> = [];

    for (let i = 0; i < monthCount; i++) {
      const currentMonth = addMonthsToString(params.fromMonth, i);
      const { year, month } = parseMonth(currentMonth);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);

      const baseIncome = calculateMonthlyIncomeForMonth(
        userIncomes, currentMonth, year, month, monthStart, monthEnd
      );
      const baseExpense = calculateMonthlyExpensesForMonth(
        userExpenses, year, month, monthStart, monthEnd
      );

      baselineBalance += baseIncome - baseExpense;
      baselineProjections.push({ month: currentMonth, cumulativeBalance: baselineBalance });
    }

    // Find the first month where (balance - expense) >= (6 months of income)
    const safetyThreshold = baseMonthlyNetIncome * safetyThresholdMonths;
    let recommendedMonth: string | null = null;
    let balanceAfterPurchase: number | null = null;
    let emergencyFundMonthsAfter: number | null = null;
    let monthsToWait = 0;
    let isSafeNow = false;

    for (let i = 0; i < baselineProjections.length; i++) {
      const proj = baselineProjections[i];
      const balanceAfter = proj.cumulativeBalance - expenseAmount;

      if (balanceAfter >= safetyThreshold) {
        recommendedMonth = proj.month;
        balanceAfterPurchase = balanceAfter;
        emergencyFundMonthsAfter = baseMonthlyNetIncome > 0 ? balanceAfter / baseMonthlyNetIncome : 0;
        monthsToWait = i;
        isSafeNow = i === 0;
        break;
      }
    }

    // Generate recommendation text
    let purchaseRecommendation: string;
    if (recommendedMonth) {
      if (isSafeNow) {
        purchaseRecommendation = `You can safely purchase this in ${formatMonthLabel(recommendedMonth)}. After the $${expenseAmount.toLocaleString()} expense, you'll still have ${emergencyFundMonthsAfter?.toFixed(1)} months of income as emergency fund.`;
      } else {
        purchaseRecommendation = `The earliest safe time to make this $${expenseAmount.toLocaleString()} purchase is ${formatMonthLabel(recommendedMonth)} (${monthsToWait} month${monthsToWait !== 1 ? 's' : ''} from now). By then, you'll have enough savings to maintain a 6+ month emergency fund after the purchase.`;
      }
    } else {
      purchaseRecommendation = `Based on current projections through ${formatMonthLabel(params.toMonth)}, there is no month where this $${expenseAmount.toLocaleString()} expense would leave you with a safe 6-month emergency fund. Consider saving more or reducing the expense amount.`;
    }

    safePurchaseRecommendation = {
      expenseAmount,
      safetyThresholdMonths,
      recommendedMonth,
      recommendedMonthLabel: recommendedMonth ? formatMonthLabel(recommendedMonth) : null,
      balanceAfterPurchase: balanceAfterPurchase ? Math.round(balanceAfterPurchase * 100) / 100 : null,
      emergencyFundMonthsAfter: emergencyFundMonthsAfter ? Math.round(emergencyFundMonthsAfter * 10) / 10 : null,
      monthsToWait,
      isSafeNow,
      recommendation: purchaseRecommendation,
    };

    notes.push(purchaseRecommendation);
  }

  return {
    fromMonth: params.fromMonth,
    toMonth: params.toMonth,
    monthCount,
    startingBalance: Math.round(startingBalance * 100) / 100,
    monthlyProjections,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    totalNetSavings: Math.round((totalIncome - totalExpenses) * 100) / 100,
    finalBalance: Math.round(cumulativeBalance * 100) / 100,
    hypotheticalImpact,
    notes,
    // New fields
    assumptions,
    affordabilityAnalysis,
    constraintsEvaluation,
    scenarioSummary,
    safetyAssessment,
    safePurchaseRecommendation,
  };
}

// =============================================================================
// Tool Executor: get_holdings_summary
// =============================================================================

async function executeGetHoldingsSummary(
  userId: string
): Promise<HoldingsSummaryResult> {
  // Fetch all holdings for the user
  const holdings = await db
    .select()
    .from(currentHoldings)
    .where(eq(currentHoldings.userId, userId));

  // Get family members to map IDs to names
  const userFamilyMembers = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.userId, userId));

  const familyMemberMap: Record<string, string> = {};
  userFamilyMembers.forEach((fm) => {
    familyMemberMap[fm.id] = fm.name;
  });

  // Process holdings
  const holdingItems: HoldingItem[] = [];
  let totalHoldings = 0;

  // Track holdings by family member
  const memberTotals: Record<string, { totalAmount: number; accountCount: number }> = {};

  for (const holding of holdings) {
    const amount = parseFloat(holding.holdingAmount);
    totalHoldings += amount;

    // Get family member name if linked
    const familyMemberName = holding.familyMemberId
      ? familyMemberMap[holding.familyMemberId] || null
      : null;

    // Track by member
    const memberKey = familyMemberName || "__self__";
    if (!memberTotals[memberKey]) {
      memberTotals[memberKey] = { totalAmount: 0, accountCount: 0 };
    }
    memberTotals[memberKey].totalAmount += amount;
    memberTotals[memberKey].accountCount += 1;

    holdingItems.push({
      id: holding.id,
      bankName: holding.bankName,
      amount: Math.round(amount * 100) / 100,
      familyMember: familyMemberName,
      updatedAt: holding.updatedAt.toISOString(),
    });
  }

  // Sort holdings by amount (highest first)
  holdingItems.sort((a, b) => b.amount - a.amount);

  // Build holdings by member breakdown
  const holdingsByMember = Object.entries(memberTotals)
    .map(([memberKey, data]) => ({
      memberName: memberKey === "__self__" ? null : memberKey,
      totalAmount: Math.round(data.totalAmount * 100) / 100,
      accountCount: data.accountCount,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // Build notes
  const notes: string[] = [];
  if (holdings.length === 0) {
    notes.push("No holdings found. Consider adding your bank accounts to track your liquid assets.");
  } else {
    notes.push(`Total across ${holdings.length} account(s).`);
  }

  return {
    totalHoldings: Math.round(totalHoldings * 100) / 100,
    holdingsCount: holdings.length,
    holdings: holdingItems,
    holdingsByMember,
    notes,
  };
}

// =============================================================================
// Tool Executor: get_property_assets_summary
// =============================================================================

async function executeGetPropertyAssetsSummary(
  userId: string
): Promise<PropertyAssetsSummaryResult> {
  // Fetch all active property assets for the user
  const properties = await db
    .select()
    .from(propertyAssets)
    .where(and(eq(propertyAssets.userId, userId), eq(propertyAssets.isActive, true)));

  const propertyItems: PropertyAssetItem[] = [];
  let totalPropertyValue = 0;
  let totalOutstandingLoans = 0;
  let totalMonthlyPayments = 0;
  const notes: string[] = [];

  for (const property of properties) {
    const purchasePrice = parseFloat(property.originalPurchasePrice);
    const outstandingLoan = parseFloat(property.outstandingLoan);
    const monthlyPayment = parseFloat(property.monthlyLoanPayment);
    const loanTaken = property.loanAmountTaken ? parseFloat(property.loanAmountTaken) : null;

    totalPropertyValue += purchasePrice;
    totalOutstandingLoans += outstandingLoan;
    totalMonthlyPayments += monthlyPayment;

    // Calculate equity and loan progress
    const equityOwned = purchasePrice - outstandingLoan;
    const loanProgress = loanTaken && loanTaken > 0
      ? Math.round(((loanTaken - outstandingLoan) / loanTaken) * 1000) / 10
      : null;

    propertyItems.push({
      id: property.id,
      propertyName: property.propertyName,
      purchaseDate: property.purchaseDate,
      originalPurchasePrice: Math.round(purchasePrice * 100) / 100,
      loanAmountTaken: loanTaken ? Math.round(loanTaken * 100) / 100 : null,
      outstandingLoan: Math.round(outstandingLoan * 100) / 100,
      monthlyLoanPayment: Math.round(monthlyPayment * 100) / 100,
      interestRate: parseFloat(property.interestRate),
      principalCpfWithdrawn: property.principalCpfWithdrawn ? parseFloat(property.principalCpfWithdrawn) : null,
      housingGrantTaken: property.housingGrantTaken ? parseFloat(property.housingGrantTaken) : null,
      accruedInterestToDate: property.accruedInterestToDate ? parseFloat(property.accruedInterestToDate) : null,
      equityOwned: Math.round(equityOwned * 100) / 100,
      loanProgress,
      isActive: property.isActive || false,
    });
  }

  // Sort by purchase price (highest first)
  propertyItems.sort((a, b) => b.originalPurchasePrice - a.originalPurchasePrice);

  const totalEquity = totalPropertyValue - totalOutstandingLoans;

  if (properties.length === 0) {
    notes.push("No property assets found.");
  } else {
    notes.push(`Total across ${properties.length} property(ies).`);
    if (totalOutstandingLoans > 0) {
      const overallLoanProgress = Math.round((totalEquity / totalPropertyValue) * 1000) / 10;
      notes.push(`Overall equity: ${overallLoanProgress}% of property value.`);
    }
  }

  return {
    propertyCount: properties.length,
    totalPropertyValue: Math.round(totalPropertyValue * 100) / 100,
    totalOutstandingLoans: Math.round(totalOutstandingLoans * 100) / 100,
    totalEquity: Math.round(totalEquity * 100) / 100,
    totalMonthlyPayments: Math.round(totalMonthlyPayments * 100) / 100,
    properties: propertyItems,
    notes,
  };
}

// =============================================================================
// Tool Executor: get_vehicle_assets_summary
// =============================================================================

async function executeGetVehicleAssetsSummary(
  userId: string
): Promise<VehicleAssetsSummaryResult> {
  // Fetch all active vehicle assets for the user
  const vehicles = await db
    .select()
    .from(vehicleAssets)
    .where(and(eq(vehicleAssets.userId, userId), eq(vehicleAssets.isActive, true)));

  const vehicleItems: VehicleAssetItem[] = [];
  let totalVehicleValue = 0;
  let totalOutstandingLoans = 0;
  let totalMonthlyPayments = 0;
  const notes: string[] = [];

  const now = new Date();

  for (const vehicle of vehicles) {
    const purchasePrice = parseFloat(vehicle.originalPurchasePrice);
    const loanTaken = vehicle.loanAmountTaken ? parseFloat(vehicle.loanAmountTaken) : null;
    const loanRepaid = vehicle.loanAmountRepaid ? parseFloat(vehicle.loanAmountRepaid) : null;
    const monthlyPayment = vehicle.monthlyLoanPayment ? parseFloat(vehicle.monthlyLoanPayment) : null;

    totalVehicleValue += purchasePrice;

    // Calculate outstanding loan
    let outstandingLoan: number | null = null;
    let loanProgress: number | null = null;
    if (loanTaken !== null) {
      outstandingLoan = loanTaken - (loanRepaid || 0);
      totalOutstandingLoans += outstandingLoan;
      loanProgress = loanTaken > 0 ? Math.round(((loanRepaid || 0) / loanTaken) * 1000) / 10 : null;
    }

    if (monthlyPayment) {
      totalMonthlyPayments += monthlyPayment;
    }

    // Calculate COE years remaining (Singapore-specific)
    let coeYearsRemaining: number | null = null;
    if (vehicle.coeExpiryDate) {
      const coeExpiry = new Date(vehicle.coeExpiryDate);
      const diffMs = coeExpiry.getTime() - now.getTime();
      coeYearsRemaining = Math.round((diffMs / (1000 * 60 * 60 * 24 * 365)) * 10) / 10;
      if (coeYearsRemaining < 0) coeYearsRemaining = 0;
    }

    vehicleItems.push({
      id: vehicle.id,
      vehicleName: vehicle.vehicleName,
      purchaseDate: vehicle.purchaseDate,
      coeExpiryDate: vehicle.coeExpiryDate || null,
      originalPurchasePrice: Math.round(purchasePrice * 100) / 100,
      loanAmountTaken: loanTaken ? Math.round(loanTaken * 100) / 100 : null,
      loanAmountRepaid: loanRepaid ? Math.round(loanRepaid * 100) / 100 : null,
      monthlyLoanPayment: monthlyPayment ? Math.round(monthlyPayment * 100) / 100 : null,
      outstandingLoan: outstandingLoan !== null ? Math.round(outstandingLoan * 100) / 100 : null,
      loanProgress,
      coeYearsRemaining,
      isActive: vehicle.isActive || false,
    });
  }

  // Sort by purchase price (highest first)
  vehicleItems.sort((a, b) => b.originalPurchasePrice - a.originalPurchasePrice);

  if (vehicles.length === 0) {
    notes.push("No vehicle assets found.");
  } else {
    notes.push(`Total across ${vehicles.length} vehicle(s).`);
    // Check for COE expiring soon
    const expiringCOE = vehicleItems.filter(v => v.coeYearsRemaining !== null && v.coeYearsRemaining <= 2);
    if (expiringCOE.length > 0) {
      notes.push(`${expiringCOE.length} vehicle(s) with COE expiring within 2 years.`);
    }
  }

  return {
    vehicleCount: vehicles.length,
    totalVehicleValue: Math.round(totalVehicleValue * 100) / 100,
    totalOutstandingLoans: Math.round(totalOutstandingLoans * 100) / 100,
    totalMonthlyPayments: Math.round(totalMonthlyPayments * 100) / 100,
    vehicles: vehicleItems,
    notes,
  };
}

// =============================================================================
// Tool Executor: get_other_assets_summary
// =============================================================================

async function executeGetOtherAssetsSummary(
  params: OtherAssetsSummaryParams,
  userId: string
): Promise<OtherAssetsSummaryResult> {
  // Fetch all assets for the user
  let userAssets = await db
    .select()
    .from(assets)
    .where(eq(assets.userId, userId));

  // Apply type filter if provided
  const appliedFilter = params.assetType || null;
  if (appliedFilter) {
    userAssets = userAssets.filter(a => a.type.toLowerCase() === appliedFilter.toLowerCase());
  }

  const assetItems: OtherAssetItem[] = [];
  let totalCurrentValue = 0;
  let totalPurchaseValue = 0;
  const typeMap: Record<string, { count: number; totalValue: number }> = {};
  const notes: string[] = [];

  for (const asset of userAssets) {
    const currentValue = parseFloat(asset.currentValue);
    const purchaseValue = asset.purchaseValue ? parseFloat(asset.purchaseValue) : null;

    totalCurrentValue += currentValue;
    if (purchaseValue !== null) {
      totalPurchaseValue += purchaseValue;
    }

    // Track by type
    const assetType = asset.type;
    if (!typeMap[assetType]) {
      typeMap[assetType] = { count: 0, totalValue: 0 };
    }
    typeMap[assetType].count += 1;
    typeMap[assetType].totalValue += currentValue;

    // Calculate gain/loss
    let gainLoss: number | null = null;
    let gainLossPercent: number | null = null;
    if (purchaseValue !== null && purchaseValue > 0) {
      gainLoss = currentValue - purchaseValue;
      gainLossPercent = Math.round((gainLoss / purchaseValue) * 1000) / 10;
    }

    assetItems.push({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      currentValue: Math.round(currentValue * 100) / 100,
      purchaseValue: purchaseValue ? Math.round(purchaseValue * 100) / 100 : null,
      purchaseDate: asset.purchaseDate || null,
      description: asset.description || null,
      gainLoss: gainLoss !== null ? Math.round(gainLoss * 100) / 100 : null,
      gainLossPercent,
    });
  }

  // Sort by current value (highest first)
  assetItems.sort((a, b) => b.currentValue - a.currentValue);

  // Build type breakdown
  const assetsByType = Object.entries(typeMap)
    .map(([type, data]) => ({
      type,
      count: data.count,
      totalValue: Math.round(data.totalValue * 100) / 100,
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  const totalGainLoss = totalCurrentValue - totalPurchaseValue;

  if (userAssets.length === 0) {
    if (appliedFilter) {
      notes.push(`No assets found with type "${appliedFilter}".`);
    } else {
      notes.push("No other assets found.");
    }
  } else {
    notes.push(`Total across ${userAssets.length} asset(s).`);
    if (totalPurchaseValue > 0) {
      const overallGainLossPercent = Math.round((totalGainLoss / totalPurchaseValue) * 1000) / 10;
      if (totalGainLoss >= 0) {
        notes.push(`Overall gain: $${totalGainLoss.toLocaleString()} (+${overallGainLossPercent}%).`);
      } else {
        notes.push(`Overall loss: $${Math.abs(totalGainLoss).toLocaleString()} (${overallGainLossPercent}%).`);
      }
    }
  }

  return {
    assetCount: userAssets.length,
    totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
    totalPurchaseValue: Math.round(totalPurchaseValue * 100) / 100,
    totalGainLoss: Math.round(totalGainLoss * 100) / 100,
    assetsByType,
    assets: assetItems,
    appliedFilter,
    notes,
  };
}

// =============================================================================
// Tool Executor: get_insurance_summary
// =============================================================================

async function executeGetInsuranceSummary(
  params: InsuranceSummaryParams,
  userId: string
): Promise<InsuranceSummaryResult> {
  // Fetch all policies for the user
  let userPolicies = await db
    .select()
    .from(policies)
    .where(eq(policies.userId, userId));

  // Get family members to map IDs to names
  const userFamilyMembers = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.userId, userId));

  const familyMemberMap: Record<string, string> = {};
  userFamilyMembers.forEach((fm) => {
    familyMemberMap[fm.id] = fm.name;
  });

  // Apply status filter (default: active)
  const statusFilter = params.status || "active";
  if (statusFilter !== "all") {
    userPolicies = userPolicies.filter(p => p.status?.toLowerCase() === statusFilter.toLowerCase());
  }

  // Apply type filter if provided
  const typeFilter = params.policyType || null;
  if (typeFilter) {
    userPolicies = userPolicies.filter(p => p.policyType.toLowerCase() === typeFilter.toLowerCase());
  }

  const policyItems: InsurancePolicyItem[] = [];
  let totalAnnualPremiums = 0;
  let totalDeathCoverage = 0;
  let totalCriticalIllnessCoverage = 0;
  let activePolicyCount = 0;
  const typeMap: Record<string, { count: number; annualPremium: number }> = {};
  const providerMap: Record<string, { count: number; annualPremium: number }> = {};
  const notes: string[] = [];
  const now = new Date();

  for (const policy of userPolicies) {
    const premiumAmount = parseFloat(policy.premiumAmount);
    const frequency = policy.premiumFrequency.toLowerCase();

    // Calculate annual premium
    let annualPremium = premiumAmount;
    if (frequency === "monthly") {
      annualPremium = premiumAmount * 12;
    } else if (frequency === "quarterly") {
      annualPremium = premiumAmount * 4;
    } else if (frequency === "yearly" || frequency === "annual") {
      annualPremium = premiumAmount;
    } else if (frequency === "custom" && policy.customMonths) {
      try {
        const customMonths = JSON.parse(policy.customMonths) as number[];
        annualPremium = premiumAmount * customMonths.length;
      } catch {
        annualPremium = premiumAmount;
      }
    }

    totalAnnualPremiums += annualPremium;

    // Track active policies
    if (policy.status === "active") {
      activePolicyCount++;
    }

    // Parse coverage options
    let coverage: CoverageDetails | null = null;
    let totalCoverage = 0;
    if (policy.coverageOptions) {
      try {
        const parsed = JSON.parse(policy.coverageOptions);
        coverage = {
          death: parsed.death || null,
          tpd: parsed.tpd || null,
          criticalIllness: parsed.criticalIllness || null,
          earlyCriticalIllness: parsed.earlyCriticalIllness || null,
          hospitalisationPlan: parsed.hospitalisationPlan || null,
        };
        // Sum up coverage amounts
        if (coverage.death) {
          totalCoverage += coverage.death;
          totalDeathCoverage += coverage.death;
        }
        if (coverage.criticalIllness) {
          totalCoverage += coverage.criticalIllness;
          totalCriticalIllnessCoverage += coverage.criticalIllness;
        }
        if (coverage.earlyCriticalIllness) {
          totalCoverage += coverage.earlyCriticalIllness;
        }
        if (coverage.tpd) {
          totalCoverage += coverage.tpd;
        }
      } catch {
        // Keep coverage as null
      }
    }

    // Track by type
    const policyType = policy.policyType;
    if (!typeMap[policyType]) {
      typeMap[policyType] = { count: 0, annualPremium: 0 };
    }
    typeMap[policyType].count += 1;
    typeMap[policyType].annualPremium += annualPremium;

    // Track by provider
    const provider = policy.provider;
    if (!providerMap[provider]) {
      providerMap[provider] = { count: 0, annualPremium: 0 };
    }
    providerMap[provider].count += 1;
    providerMap[provider].annualPremium += annualPremium;

    // Calculate years active
    const startDate = new Date(policy.startDate);
    const yearsActive = Math.round((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365) * 10) / 10;

    // Get family member name if linked
    const familyMemberName = policy.familyMemberId
      ? familyMemberMap[policy.familyMemberId] || null
      : null;

    policyItems.push({
      id: policy.id,
      provider: policy.provider,
      policyNumber: policy.policyNumber || null,
      policyType: policy.policyType,
      status: policy.status || "active",
      familyMember: familyMemberName,
      startDate: policy.startDate,
      maturityDate: policy.maturityDate || null,
      coverageUntilAge: policy.coverageUntilAge || null,
      yearsActive: Math.max(0, yearsActive),
      premiumAmount: Math.round(premiumAmount * 100) / 100,
      premiumFrequency: policy.premiumFrequency,
      annualPremium: Math.round(annualPremium * 100) / 100,
      totalPremiumDuration: policy.totalPremiumDuration || null,
      coverage,
      totalCoverage: Math.round(totalCoverage * 100) / 100,
      description: policy.description || null,
    });
  }

  // Sort by annual premium (highest first)
  policyItems.sort((a, b) => b.annualPremium - a.annualPremium);

  // Build type breakdown
  const policiesByType = Object.entries(typeMap)
    .map(([type, data]) => ({
      type,
      count: data.count,
      annualPremium: Math.round(data.annualPremium * 100) / 100,
    }))
    .sort((a, b) => b.annualPremium - a.annualPremium);

  // Build provider breakdown
  const policiesByProvider = Object.entries(providerMap)
    .map(([provider, data]) => ({
      provider,
      count: data.count,
      annualPremium: Math.round(data.annualPremium * 100) / 100,
    }))
    .sort((a, b) => b.annualPremium - a.annualPremium);

  // Calculate monthly equivalent
  const totalMonthlyPremiums = totalAnnualPremiums / 12;

  // Build notes
  if (userPolicies.length === 0) {
    if (typeFilter) {
      notes.push(`No ${typeFilter} insurance policies found.`);
    } else if (statusFilter !== "all") {
      notes.push(`No ${statusFilter} insurance policies found.`);
    } else {
      notes.push("No insurance policies found.");
    }
  } else {
    notes.push(`Total across ${userPolicies.length} policy(ies).`);
    if (totalDeathCoverage > 0) {
      notes.push(`Total death/TPD coverage: $${totalDeathCoverage.toLocaleString()}.`);
    }
    if (totalCriticalIllnessCoverage > 0) {
      notes.push(`Total critical illness coverage: $${totalCriticalIllnessCoverage.toLocaleString()}.`);
    }
  }

  return {
    policyCount: userPolicies.length,
    activePolicyCount,
    totalAnnualPremiums: Math.round(totalAnnualPremiums * 100) / 100,
    totalMonthlyPremiums: Math.round(totalMonthlyPremiums * 100) / 100,
    totalDeathCoverage: Math.round(totalDeathCoverage * 100) / 100,
    totalCriticalIllnessCoverage: Math.round(totalCriticalIllnessCoverage * 100) / 100,
    policiesByType,
    policiesByProvider,
    policies: policyItems,
    appliedTypeFilter: typeFilter,
    appliedStatusFilter: statusFilter,
    notes,
  };
}

// =============================================================================
// Tool Executor: search_knowledge
// =============================================================================

export interface SearchKnowledgeResult {
  query: string;
  resultsCount: number;
  results: Array<{
    docId: string;
    content: string;
    similarity: number;
    metadata: Record<string, unknown> | null;
  }>;
}

// =============================================================================
// Daily Expense Summary Executor
// =============================================================================

async function executeGetDailyExpenseSummary(
  params: DailyExpenseSummaryParams,
  userId: string
): Promise<DailyExpenseSummaryResult> {
  const now = new Date();

  // Determine date range
  let fromDate: string;
  let toDate: string;

  if (params.month) {
    // If month is provided, use entire month
    const [year, month] = params.month.split("-").map(Number);
    fromDate = `${params.month}-01`;
    // Get last day of month
    const lastDay = new Date(year, month, 0).getDate();
    toDate = `${params.month}-${lastDay.toString().padStart(2, "0")}`;
  } else {
    // Use fromDate/toDate or defaults
    if (params.fromDate) {
      fromDate = params.fromDate;
    } else {
      // Default: start of current month
      fromDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-01`;
    }

    if (params.toDate) {
      toDate = params.toDate;
    } else {
      // Default: today
      toDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
    }
  }

  // Fetch all daily expenses for user within date range
  const userDailyExpenses = await db
    .select()
    .from(dailyExpenses)
    .where(eq(dailyExpenses.userId, userId));

  // Filter by date range
  let filteredExpenses = userDailyExpenses.filter((e) => {
    const expenseDate = e.date;
    return expenseDate >= fromDate && expenseDate <= toDate;
  });

  // Apply category filter if provided (case-insensitive)
  if (params.categoryName) {
    filteredExpenses = filteredExpenses.filter(
      (e) => e.categoryName.toLowerCase() === params.categoryName!.toLowerCase()
    );
  }

  // Apply subcategory filter if provided (case-insensitive)
  if (params.subcategoryName) {
    filteredExpenses = filteredExpenses.filter(
      (e) => e.subcategoryName?.toLowerCase() === params.subcategoryName!.toLowerCase()
    );
  }

  // Get all user subcategories for context
  const userSubcategories = await db
    .select()
    .from(expenseSubcategories)
    .where(eq(expenseSubcategories.userId, userId));

  // Get user expense categories for context
  const userExpenseCategories = await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.userId, userId));

  // Build category ID to name map
  const categoryIdToName: Record<string, string> = {};
  userExpenseCategories.forEach((c) => {
    categoryIdToName[c.id] = c.name;
  });

  // Calculate totals and breakdowns
  let totalSpent = 0;
  const categoryMap: Record<string, {
    totalAmount: number;
    expenseCount: number;
    subcategories: Record<string, { totalAmount: number; expenseCount: number }>;
  }> = {};

  const expenseItems: DailyExpenseItem[] = [];

  for (const expense of filteredExpenses) {
    const amount = parseFloat(expense.amount);
    totalSpent += amount;

    const catName = expense.categoryName;
    const subCatName = expense.subcategoryName || null;

    // Initialize category if needed
    if (!categoryMap[catName]) {
      categoryMap[catName] = {
        totalAmount: 0,
        expenseCount: 0,
        subcategories: {},
      };
    }

    categoryMap[catName].totalAmount += amount;
    categoryMap[catName].expenseCount += 1;

    // Track subcategory within category
    if (subCatName) {
      if (!categoryMap[catName].subcategories[subCatName]) {
        categoryMap[catName].subcategories[subCatName] = {
          totalAmount: 0,
          expenseCount: 0,
        };
      }
      categoryMap[catName].subcategories[subCatName].totalAmount += amount;
      categoryMap[catName].subcategories[subCatName].expenseCount += 1;
    }

    // Build expense item
    expenseItems.push({
      id: expense.id,
      date: expense.date,
      categoryName: catName,
      subcategoryName: subCatName,
      amount,
      note: expense.note,
      originalCurrency: expense.originalCurrency,
      originalAmount: expense.originalAmount ? parseFloat(expense.originalAmount) : null,
      exchangeRate: expense.exchangeRate ? parseFloat(expense.exchangeRate) : null,
    });
  }

  // Sort expenses by date descending (most recent first)
  expenseItems.sort((a, b) => b.date.localeCompare(a.date));

  // Build category breakdown
  const categoryBreakdown: DailyExpenseCategoryBreakdown[] = Object.entries(categoryMap)
    .map(([catName, data]) => ({
      categoryName: catName,
      totalAmount: data.totalAmount,
      expenseCount: data.expenseCount,
      percentOfTotal: totalSpent > 0 ? (data.totalAmount / totalSpent) * 100 : 0,
      subcategories: Object.entries(data.subcategories).map(([subName, subData]) => ({
        subcategoryName: subName,
        totalAmount: subData.totalAmount,
        expenseCount: subData.expenseCount,
      })).sort((a, b) => b.totalAmount - a.totalAmount),
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // Calculate days covered
  const fromDateObj = new Date(fromDate);
  const toDateObj = new Date(toDate);
  const daysCovered = Math.ceil((toDateObj.getTime() - fromDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Build available categories list
  const availableCategories = [...new Set(userExpenseCategories.map((c) => c.name))];

  // Build available subcategories list with their parent categories
  const availableSubcategories = userSubcategories.map((sub) => ({
    categoryName: categoryIdToName[sub.categoryId] || "Unknown",
    subcategoryName: sub.name,
  }));

  const notes: string[] = [];
  if (filteredExpenses.length === 0) {
    notes.push(`No expenses found for the period ${fromDate} to ${toDate}.`);
    if (params.categoryName || params.subcategoryName) {
      notes.push("Try removing filters to see all expenses.");
    }
  }

  return {
    fromDate,
    toDate,
    daysCovered,
    totalSpent,
    expenseCount: filteredExpenses.length,
    averagePerDay: daysCovered > 0 ? totalSpent / daysCovered : 0,
    categoryBreakdown,
    categoryCount: Object.keys(categoryMap).length,
    expenses: expenseItems,
    appliedCategoryFilter: params.categoryName || null,
    appliedSubcategoryFilter: params.subcategoryName || null,
    availableCategories,
    availableSubcategories,
    notes,
  };
}

async function executeSearchKnowledge(
  params: SearchKnowledgeParams
): Promise<SearchKnowledgeResult> {
  const { query, limit = 5 } = params;

  const results = await searchKnowledgeBase(query, { limit });

  return {
    query,
    resultsCount: results.length,
    results: results.map((r) => ({
      docId: r.docId,
      content: r.content,
      similarity: r.similarity,
      metadata: r.metadata,
    })),
  };
}

// =============================================================================
// Main Executor Function
// =============================================================================

export async function executeTool(
  toolName: string,
  args: unknown
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const registry = getToolRegistry();

  // Check if tool is allowed
  if (!registry.isAllowed(toolName)) {
    const duration = Date.now() - startTime;
    const userId = (await getCurrentUserId()) || "unknown";

    logAudit({
      toolName: toolName as ToolName,
      userId,
      timestamp: new Date(),
      durationMs: duration,
      status: "error",
      errorMessage: `Tool not allowed: ${toolName}`,
    });

    return {
      success: false,
      error: `Tool not allowed: ${toolName}`,
      toolName: toolName as ToolName,
      durationMs: duration,
    };
  }

  // Authenticate user
  const userId = await getCurrentUserId();
  if (!userId) {
    const duration = Date.now() - startTime;

    logAudit({
      toolName: toolName as ToolName,
      userId: "unauthenticated",
      timestamp: new Date(),
      durationMs: duration,
      status: "unauthorized",
      errorMessage: "User not authenticated",
    });

    return {
      success: false,
      error: "Unauthorized: User must be authenticated",
      toolName: toolName as ToolName,
      durationMs: duration,
    };
  }

  // Validate arguments
  const validationResult = registry.safeValidateArgs(toolName as ToolName, args);
  if (!validationResult.success) {
    const duration = Date.now() - startTime;

    logAudit({
      toolName: toolName as ToolName,
      userId,
      timestamp: new Date(),
      durationMs: duration,
      status: "validation_error",
      errorMessage: validationResult.error,
    });

    return {
      success: false,
      error: `Invalid arguments: ${validationResult.error}`,
      toolName: toolName as ToolName,
      durationMs: duration,
    };
  }

  // Execute the tool
  try {
    let data: unknown;

    switch (toolName as ToolName) {
      case "get_income_summary":
        data = await executeGetIncomeSummary(validationResult.data as MonthParams, userId);
        break;

      case "get_expenses_summary":
        data = await executeGetExpensesSummary(validationResult.data as MonthParams, userId);
        break;

      case "get_family_summary":
        data = await executeGetFamilySummary(validationResult.data as FamilySummaryParams, userId);
        break;

      case "get_balance_summary":
        data = await executeGetBalanceSummary(validationResult.data as BalanceSummaryParams, userId);
        break;

      case "get_holdings_summary":
        data = await executeGetHoldingsSummary(userId);
        break;

      case "get_property_assets_summary":
        data = await executeGetPropertyAssetsSummary(userId);
        break;

      case "get_vehicle_assets_summary":
        data = await executeGetVehicleAssetsSummary(userId);
        break;

      case "get_other_assets_summary":
        data = await executeGetOtherAssetsSummary(validationResult.data as OtherAssetsSummaryParams, userId);
        break;

      case "get_insurance_summary":
        data = await executeGetInsuranceSummary(validationResult.data as InsuranceSummaryParams, userId);
        break;

      case "get_daily_expense_summary":
        data = await executeGetDailyExpenseSummary(validationResult.data as DailyExpenseSummaryParams, userId);
        break;

      case "search_knowledge":
        data = await executeSearchKnowledge(validationResult.data as SearchKnowledgeParams);
        break;

      default:
        throw new Error(`No executor for tool: ${toolName}`);
    }

    const duration = Date.now() - startTime;

    logAudit({
      toolName: toolName as ToolName,
      userId,
      timestamp: new Date(),
      durationMs: duration,
      status: "success",
    });

    return {
      success: true,
      data,
      toolName: toolName as ToolName,
      durationMs: duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logAudit({
      toolName: toolName as ToolName,
      userId,
      timestamp: new Date(),
      durationMs: duration,
      status: "error",
      errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
      toolName: toolName as ToolName,
      durationMs: duration,
    };
  }
}
