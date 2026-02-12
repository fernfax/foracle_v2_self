import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { expenses, incomes, familyMembers, expenseCategories, currentHoldings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateCPF, getCPFAllocationByAge } from "@/lib/cpf-calculator";
import {
  getToolRegistry,
  type ToolName,
  type MonthParams,
  type FamilySummaryParams,
  type BalanceSummaryParams,
} from "./registry";

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
  // Hypothetical impact (if provided)
  hypotheticalImpact: HypotheticalImpact | null;
  // Notes
  notes: string[];
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

async function executeGetBalanceSummary(
  params: BalanceSummaryParams,
  userId: string
): Promise<BalanceSummaryResult> {
  const notes: string[] = [];
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

  // Fetch all active incomes and expenses
  const userIncomes = await db
    .select()
    .from(incomes)
    .where(and(eq(incomes.userId, userId), eq(incomes.isActive, true)));

  const userExpenses = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.userId, userId), eq(expenses.isActive, true)));

  // Calculate monthly projections
  const monthlyProjections: MonthlyBalanceProjection[] = [];
  let cumulativeBalance = startingBalance;
  let totalIncome = 0;
  let totalExpenses = 0;

  for (let i = 0; i < monthCount; i++) {
    const currentMonth = addMonthsToString(params.fromMonth, i);
    const { year, month } = parseMonth(currentMonth);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    // Calculate income for this month (reusing logic from executeGetIncomeSummary)
    let monthlyIncome = 0;
    for (const income of userIncomes) {
      let amount = parseFloat(income.amount);
      const frequency = income.frequency.toLowerCase();
      const incomeStartDate = income.startDate ? new Date(income.startDate) : null;
      let incomeEndDate = income.endDate ? new Date(income.endDate) : null;

      // Check if income is active during this month
      if (incomeStartDate && incomeStartDate > monthEnd) continue;
      if (incomeEndDate && incomeEndDate < monthStart) continue;

      // Check for future milestones
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

      // Calculate effective amount (net if subject to CPF)
      let effectiveAmount = amount;
      if (income.subjectToCpf) {
        if (isUsingMilestone) {
          // For milestone income, calculate CPF dynamically based on the new amount
          const cpfResult = calculateCPF(amount);
          effectiveAmount = cpfResult.netTakeHome;
        } else {
          // For current income, use the stored netTakeHome if available
          effectiveAmount = income.netTakeHome ? parseFloat(income.netTakeHome) : amount;
        }
      }

      // Apply frequency
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

    // Calculate expenses for this month (reusing logic from executeGetExpensesSummary)
    let monthlyExpense = 0;
    for (const expense of userExpenses) {
      const amount = parseFloat(expense.amount);
      const frequency = expense.frequency.toLowerCase();
      const expenseStartDate = expense.startDate ? new Date(expense.startDate) : null;
      const expenseEndDate = expense.endDate ? new Date(expense.endDate) : null;

      // Check if expense is active during this month
      if (expenseStartDate && expenseStartDate > monthEnd) continue;
      if (expenseEndDate && expenseEndDate < monthStart) continue;

      // Apply frequency
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

    // Add hypothetical expense if it falls in this month
    let hypotheticalExpenseThisMonth = 0;
    if (params.hypotheticalExpense && params.hypotheticalExpenseMonth === currentMonth) {
      hypotheticalExpenseThisMonth = params.hypotheticalExpense;
    }

    // Add hypothetical income if it falls in this month
    let hypotheticalIncomeThisMonth = 0;
    if (params.hypotheticalIncome && params.hypotheticalIncomeMonth === currentMonth) {
      hypotheticalIncomeThisMonth = params.hypotheticalIncome;
    }

    const effectiveIncome = monthlyIncome + hypotheticalIncomeThisMonth;
    const effectiveExpense = monthlyExpense + hypotheticalExpenseThisMonth;
    const netBalance = effectiveIncome - effectiveExpense;
    cumulativeBalance += netBalance;
    totalIncome += effectiveIncome;
    totalExpenses += effectiveExpense;

    monthlyProjections.push({
      month: currentMonth,
      monthLabel: formatMonthLabel(currentMonth),
      income: Math.round(effectiveIncome * 100) / 100,
      expenses: Math.round(effectiveExpense * 100) / 100,
      netBalance: Math.round(netBalance * 100) / 100,
      cumulativeBalance: Math.round(cumulativeBalance * 100) / 100,
    });
  }

  // Calculate hypothetical impact if provided
  let hypotheticalImpact: HypotheticalImpact | null = null;

  if (params.hypotheticalExpense && params.hypotheticalExpenseMonth) {
    // Recalculate without the hypothetical to get the difference
    const finalWithout = cumulativeBalance + params.hypotheticalExpense;
    const targetProjection = monthlyProjections.find(p => p.month === params.hypotheticalExpenseMonth);
    const monthNetWithout = targetProjection ? targetProjection.netBalance + params.hypotheticalExpense : null;

    hypotheticalImpact = {
      type: "expense",
      amount: params.hypotheticalExpense,
      month: params.hypotheticalExpenseMonth,
      balanceWithout: Math.round(finalWithout * 100) / 100,
      balanceWith: Math.round(cumulativeBalance * 100) / 100,
      impact: Math.round(-params.hypotheticalExpense * 100) / 100,
      percentOfMonthlyBalance: monthNetWithout && monthNetWithout !== 0
        ? Math.round((params.hypotheticalExpense / monthNetWithout) * 1000) / 10
        : null,
    };

    notes.push(`Hypothetical expense of $${params.hypotheticalExpense.toLocaleString()} in ${formatMonthLabel(params.hypotheticalExpenseMonth)} included in projections.`);
  }

  if (params.hypotheticalIncome && params.hypotheticalIncomeMonth) {
    // If we already have an expense impact, we can't show both - income takes precedence only if no expense
    if (!hypotheticalImpact) {
      const finalWithout = cumulativeBalance - params.hypotheticalIncome;

      hypotheticalImpact = {
        type: "income",
        amount: params.hypotheticalIncome,
        month: params.hypotheticalIncomeMonth,
        balanceWithout: Math.round(finalWithout * 100) / 100,
        balanceWith: Math.round(cumulativeBalance * 100) / 100,
        impact: Math.round(params.hypotheticalIncome * 100) / 100,
        percentOfMonthlyBalance: null,
      };
    }

    notes.push(`Hypothetical income of $${params.hypotheticalIncome.toLocaleString()} in ${formatMonthLabel(params.hypotheticalIncomeMonth)} included in projections.`);
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
