"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IncomeBreakdownModal } from "@/components/income/income-breakdown-modal";
import { getUserIncomes } from "@/lib/actions/user";

type SlideDirection = "left" | "right" | null;

interface TotalIncomeCardProps {
  totalIncome: number;
  selectedMonth: Date;
  slideDirection: SlideDirection;
}

interface PastIncomeEntry {
  period: string;
  granularity: "yearly" | "monthly";
  amount: number;
  notes?: string;
}

interface FutureMilestone {
  id: string;
  targetMonth: string;
  amount: number;
  reason?: string;
  notes?: string;
}

interface Income {
  id: string;
  name: string;
  category: string;
  amount: string;
  frequency: string;
  customMonths?: string | null;
  subjectToCpf: boolean | null;
  employeeCpfContribution: string | null;
  employerCpfContribution: string | null;
  isActive: boolean | null;
  familyMemberId: string | null;
  familyMember?: {
    id: string;
    name: string;
  } | null;
  startDate: string;
  endDate?: string | null;
  pastIncomeHistory?: string | null;
  futureMilestones?: string | null;
}

export function TotalIncomeCard({ totalIncome, selectedMonth, slideDirection }: TotalIncomeCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [incomes, setIncomes] = useState<Income[]>([]);

  // Helper to parse date strings as local dates (not UTC)
  const parseLocalDate = useCallback((dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, []);

  // Calculate income for a given month (returns both gross and net after CPF)
  const calculateIncomeForMonth = useCallback((targetMonth: Date) => {
    const targetYear = targetMonth.getFullYear();
    const targetMonthNum = targetMonth.getMonth() + 1;
    const monthStart = new Date(targetYear, targetMonth.getMonth(), 1);
    const monthEnd = new Date(targetYear, targetMonth.getMonth() + 1, 0);
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const isHistoricalMonth = monthStart < currentMonthStart;
    const isFutureMonth = monthStart > currentMonthStart;
    const targetPeriodMonthly = `${targetYear}-${String(targetMonthNum).padStart(2, '0')}`;
    const targetPeriodYearly = `${targetYear}`;

    let totalMonthlyIncome = 0;
    let totalCpfDeduction = 0;

    incomes.forEach((income) => {
      if (!income.isActive) return;

      let usedHistoricalData = false;
      let usedMilestoneData = false;

      // For historical months, check pastIncomeHistory first
      if (isHistoricalMonth && income.pastIncomeHistory) {
        try {
          const history: PastIncomeEntry[] = JSON.parse(income.pastIncomeHistory);

          // Check for monthly granularity match first
          const monthlyEntry = history.find(
            h => h.granularity === 'monthly' && h.period === targetPeriodMonthly
          );
          if (monthlyEntry) {
            totalMonthlyIncome += monthlyEntry.amount;
            // Apply CPF deduction proportionally if applicable
            if (income.subjectToCpf && income.employeeCpfContribution) {
              const baseAmount = parseFloat(income.amount);
              const cpfRate = baseAmount > 0 ? parseFloat(income.employeeCpfContribution) / baseAmount : 0;
              totalCpfDeduction += monthlyEntry.amount * cpfRate;
            }
            usedHistoricalData = true;
          } else {
            // Check for yearly granularity match
            const yearlyEntry = history.find(
              h => h.granularity === 'yearly' && h.period === targetPeriodYearly
            );
            if (yearlyEntry) {
              // Convert yearly to monthly
              totalMonthlyIncome += yearlyEntry.amount / 12;
              if (income.subjectToCpf && income.employeeCpfContribution) {
                const baseAmount = parseFloat(income.amount);
                const cpfRate = baseAmount > 0 ? parseFloat(income.employeeCpfContribution) / baseAmount : 0;
                totalCpfDeduction += (yearlyEntry.amount / 12) * cpfRate;
              }
              usedHistoricalData = true;
            }
          }
        } catch {
          // Fall through to current calculation
        }
      }

      // For future months, check futureMilestones
      if (isFutureMonth && !usedHistoricalData && income.futureMilestones) {
        try {
          const milestones: FutureMilestone[] = JSON.parse(income.futureMilestones);
          // Find the most recent milestone that applies
          const applicableMilestones = milestones
            .filter(m => m.targetMonth <= targetPeriodMonthly)
            .sort((a, b) => b.targetMonth.localeCompare(a.targetMonth));

          if (applicableMilestones.length > 0) {
            totalMonthlyIncome += applicableMilestones[0].amount;
            // Apply CPF deduction proportionally if applicable
            if (income.subjectToCpf && income.employeeCpfContribution) {
              const baseAmount = parseFloat(income.amount);
              const cpfRate = baseAmount > 0 ? parseFloat(income.employeeCpfContribution) / baseAmount : 0;
              totalCpfDeduction += applicableMilestones[0].amount * cpfRate;
            }
            usedMilestoneData = true;
          }
        } catch {
          // Fall through to current calculation
        }
      }

      // If we used historical or milestone data, skip the regular calculation
      if (usedHistoricalData || usedMilestoneData) return;

      // Regular calculation for current income
      const startDate = parseLocalDate(income.startDate);
      const endDate = income.endDate ? parseLocalDate(income.endDate) : null;

      const effectiveAmount = parseFloat(income.amount);

      if (startDate > monthEnd) return;
      if (endDate && endDate < monthStart) return;

      const frequency = income.frequency.toLowerCase();
      let appliesThisMonth = false;

      if (frequency === 'monthly') {
        appliesThisMonth = true;
      } else if (frequency === 'custom' && income.customMonths) {
        try {
          const customMonths = JSON.parse(income.customMonths);
          appliesThisMonth = customMonths.includes(targetMonthNum);
        } catch {
          appliesThisMonth = false;
        }
      } else if (frequency === 'yearly') {
        appliesThisMonth = true;
      } else if (frequency === 'weekly') {
        appliesThisMonth = true;
      } else if (frequency === 'bi-weekly') {
        appliesThisMonth = true;
      } else if (frequency === 'one-time') {
        const incomeMonth = startDate.getMonth() + 1;
        const incomeYear = startDate.getFullYear();
        appliesThisMonth = incomeMonth === targetMonthNum && incomeYear === targetYear;
      }

      if (appliesThisMonth) {
        let monthlyAmount = effectiveAmount;
        if (frequency === 'yearly') {
          monthlyAmount = effectiveAmount / 12;
        } else if (frequency === 'weekly') {
          monthlyAmount = (effectiveAmount * 52) / 12;
        } else if (frequency === 'bi-weekly') {
          monthlyAmount = (effectiveAmount * 26) / 12;
        }
        totalMonthlyIncome += monthlyAmount;

        // Calculate CPF deduction if applicable (employeeCpfContribution is stored as monthly dollar amount)
        if (income.subjectToCpf && income.employeeCpfContribution) {
          const monthlyCpfDeduction = parseFloat(income.employeeCpfContribution);
          totalCpfDeduction += monthlyCpfDeduction;
        }
      }
    });

    return { gross: totalMonthlyIncome, cpfDeduction: totalCpfDeduction, net: totalMonthlyIncome - totalCpfDeduction };
  }, [incomes, parseLocalDate]);

  // Calculate current and previous month income
  const currentMonthData = useMemo(() => calculateIncomeForMonth(selectedMonth), [calculateIncomeForMonth, selectedMonth]);

  const previousMonth = useMemo(() => new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1), [selectedMonth]);
  const previousMonthData = useMemo(() => calculateIncomeForMonth(previousMonth), [calculateIncomeForMonth, previousMonth]);

  // Calculate change from previous month (based on gross income)
  const monthChange = useMemo(() => {
    const change = currentMonthData.gross - previousMonthData.gross;
    const percentChange = previousMonthData.gross > 0 ? (change / previousMonthData.gross) * 100 : 0;
    return { amount: change, percent: percentChange };
  }, [currentMonthData.gross, previousMonthData.gross]);

  // Fetch incomes on component mount to enable month navigation
  useEffect(() => {
    getUserIncomes()
      .then((data) => {
        setIncomes(data as Income[]);
      })
      .catch((error) => {
        console.error("Failed to fetch incomes:", error);
      });
  }, []);

  // Use calculated amount if incomes loaded, otherwise use prop
  const displayAmount = incomes.length > 0 ? currentMonthData.gross : totalIncome;
  const netIncomeAfterCpf = incomes.length > 0 ? currentMonthData.net : null;
  const hasCpfDeductions = incomes.length > 0 && currentMonthData.cpfDeduction > 0;

  return (
    <>
      <Card
        className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsModalOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Income
          </CardTitle>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950">
            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden">
            <div
              key={selectedMonth.toISOString()}
              className={`text-3xl font-semibold tabular-nums transition-all duration-300 ${
                slideDirection === "left"
                  ? "animate-slide-left"
                  : slideDirection === "right"
                  ? "animate-slide-right"
                  : ""
              }`}
            >
              ${displayAmount.toLocaleString()}
            </div>
          </div>
          {hasCpfDeductions && netIncomeAfterCpf !== null && (
            <p className="text-xs text-muted-foreground mt-1">
              After CPF: ${netIncomeAfterCpf.toLocaleString()}
            </p>
          )}
          {incomes.length > 0 && monthChange.amount !== 0 && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${
              monthChange.amount > 0 ? "text-emerald-600" : "text-red-500"
            }`}>
              {monthChange.amount > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>
                {monthChange.amount > 0 ? "+" : ""}${Math.abs(monthChange.amount).toLocaleString()}
                {monthChange.percent !== 0 && ` (${monthChange.percent > 0 ? "+" : ""}${monthChange.percent.toFixed(1)}%)`}
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          )}
        </CardContent>
      </Card>

      <IncomeBreakdownModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        incomes={incomes}
        selectedMonth={selectedMonth}
      />
    </>
  );
}
