"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, DollarSign } from "lucide-react";
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
}

export function TotalIncomeCard({ totalIncome }: TotalIncomeCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch incomes when modal opens
  useEffect(() => {
    if (isModalOpen && incomes.length === 0) {
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
    }
  }, [isModalOpen, incomes.length]);

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
            ${totalIncome.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5%
            </span>
            <span className="text-xs text-muted-foreground">
              from last month
            </span>
          </div>
        </CardContent>
      </Card>

      <IncomeBreakdownModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        incomes={incomes}
      />
    </>
  );
}
