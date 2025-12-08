"use client";

import React from "react";
import { TotalIncomeCard } from "./total-income-card";
import { TotalExpensesCard } from "./total-expenses-card";
import { NetSavingsCard } from "./net-savings-card";

export type SlideDirection = "left" | "right" | null;

interface MetricsCardsProps {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  selectedMonth: Date;
  onMonthChange: (month: Date, direction: SlideDirection) => void;
  slideDirection: SlideDirection;
}

export function MetricsCards({
  totalIncome,
  totalExpenses,
  netSavings,
  selectedMonth,
  onMonthChange,
  slideDirection,
}: MetricsCardsProps) {
  return (
    <>
      <TotalIncomeCard
        totalIncome={totalIncome}
        selectedMonth={selectedMonth}
        slideDirection={slideDirection}
      />
      <TotalExpensesCard
        totalExpenses={totalExpenses}
        selectedMonth={selectedMonth}
        slideDirection={slideDirection}
      />
      <NetSavingsCard
        netSavings={netSavings}
        selectedMonth={selectedMonth}
        slideDirection={slideDirection}
      />
    </>
  );
}
