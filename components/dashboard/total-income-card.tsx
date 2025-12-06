"use client";

import React, { useState, useEffect, useMemo } from "react";
import { DollarSign, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IncomeBreakdownModal } from "@/components/income/income-breakdown-modal";
import { getUserIncomes } from "@/lib/actions/user";

interface TotalIncomeCardProps {
  totalIncome: number;
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
  futureIncomeChange?: boolean | null;
  futureIncomeAmount?: string | null;
  futureIncomeStartDate?: string | null;
  futureIncomeEndDate?: string | null;
}

export function TotalIncomeCard({ totalIncome }: TotalIncomeCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Month navigation state (default to current month)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Month navigation handlers
  const goToPreviousMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Format month display
  const formatMonthDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Calculate current month income based on selected month
  const currentMonthIncome = useMemo(() => {
    const selectedYear = selectedMonth.getFullYear();
    const selectedMonthNum = selectedMonth.getMonth() + 1;

    // For date comparisons, create start/end of selected month
    const monthStart = new Date(selectedYear, selectedMonth.getMonth(), 1);
    const monthEnd = new Date(selectedYear, selectedMonth.getMonth() + 1, 0);

    let totalMonthlyIncome = 0;

    incomes.forEach((income) => {
      if (!income.isActive) return;

      // Helper to parse date strings as local dates (not UTC)
      const parseLocalDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      };

      const startDate = parseLocalDate(income.startDate);
      const endDate = income.endDate ? parseLocalDate(income.endDate) : null;

      // Determine which amount to use - check for future income changes
      let effectiveAmount = parseFloat(income.amount);
      let useFutureIncome = false;

      if (income.futureIncomeChange && income.futureIncomeAmount && income.futureIncomeStartDate) {
        const futureStartDate = parseLocalDate(income.futureIncomeStartDate);
        const futureEndDate = income.futureIncomeEndDate ? parseLocalDate(income.futureIncomeEndDate) : null;

        // Check if the selected month falls within the future income change period
        // Use future amount if: month starts on or after future start date AND
        // (no future end date OR month starts before or on future end date)
        if (monthStart >= futureStartDate && (!futureEndDate || monthStart <= futureEndDate)) {
          effectiveAmount = parseFloat(income.futureIncomeAmount);
          useFutureIncome = true;
        }
      }

      // Check if income is valid for selected month
      // Income must have started by the end of selected month
      if (startDate > monthEnd) return;

      // Income must not have ended before selected month started
      // BUT: if we're using future income, ignore the original end_date
      // (the future income effectively extends the income)
      if (!useFutureIncome && endDate && endDate < monthStart) return;

      // If using future income, also check if the future income period has ended
      if (useFutureIncome && income.futureIncomeEndDate) {
        const futureEndDate = parseLocalDate(income.futureIncomeEndDate);
        if (futureEndDate < monthStart) return;
      }

      const frequency = income.frequency.toLowerCase();

      let appliesThisMonth = false;

      if (frequency === 'monthly') {
        appliesThisMonth = true;
      } else if (frequency === 'custom' && income.customMonths) {
        try {
          const customMonths = JSON.parse(income.customMonths);
          appliesThisMonth = customMonths.includes(selectedMonthNum);
        } catch {
          appliesThisMonth = false;
        }
      } else if (frequency === 'yearly') {
        // Yearly income typically applies in a specific month (e.g., bonus in December)
        // For now, we'll distribute it across all months
        appliesThisMonth = true;
      } else if (frequency === 'weekly') {
        // Weekly income applies every month
        appliesThisMonth = true;
      } else if (frequency === 'bi-weekly') {
        // Bi-weekly income applies every month
        appliesThisMonth = true;
      } else if (frequency === 'one-time') {
        // One-time income - check if it's in the selected month/year
        const incomeMonth = startDate.getMonth() + 1;
        const incomeYear = startDate.getFullYear();
        appliesThisMonth = incomeMonth === selectedMonthNum && incomeYear === selectedYear;
      }

      if (appliesThisMonth) {
        // Calculate monthly equivalent
        let monthlyAmount = effectiveAmount;
        if (frequency === 'yearly') {
          monthlyAmount = effectiveAmount / 12;
        } else if (frequency === 'weekly') {
          monthlyAmount = (effectiveAmount * 52) / 12;
        } else if (frequency === 'bi-weekly') {
          monthlyAmount = (effectiveAmount * 26) / 12;
        }
        totalMonthlyIncome += monthlyAmount;
      }
    });

    return totalMonthlyIncome;
  }, [incomes, selectedMonth]);

  // Fetch incomes on component mount to enable month navigation
  useEffect(() => {
    setIsLoading(true);
    getUserIncomes()
      .then((data) => {
        setIncomes(data as Income[]);
      })
      .catch((error) => {
        console.error("Failed to fetch incomes:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Use calculated amount if incomes loaded, otherwise use prop
  const displayAmount = incomes.length > 0 ? currentMonthIncome : totalIncome;

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
          <div className="text-3xl font-semibold tabular-nums">
            ${displayAmount.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 mt-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => { e.stopPropagation(); goToPreviousMonth(); }}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[100px] text-center">
              {formatMonthDisplay(selectedMonth)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => { e.stopPropagation(); goToNextMonth(); }}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
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
