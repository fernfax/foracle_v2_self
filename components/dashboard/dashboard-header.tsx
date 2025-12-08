"use client";

import React, { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricsCards } from "./metrics-cards";

export type SlideDirection = "left" | "right" | null;

interface DashboardHeaderProps {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
}

export function DashboardHeader({ totalIncome, totalExpenses, netSavings }: DashboardHeaderProps) {
  // Shared month state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Animation direction state
  const [slideDirection, setSlideDirection] = useState<SlideDirection>(null);

  // Check if selected month is current month
  const isCurrentMonth = useCallback(() => {
    const now = new Date();
    return selectedMonth.getFullYear() === now.getFullYear() &&
           selectedMonth.getMonth() === now.getMonth();
  }, [selectedMonth]);

  // Handle month change with animation direction
  const handleMonthChange = useCallback((newMonth: Date, direction: SlideDirection) => {
    setSlideDirection(direction);
    setSelectedMonth(newMonth);
    // Reset animation after it completes
    setTimeout(() => setSlideDirection(null), 360);
  }, []);

  // Month navigation handlers
  const goToPreviousMonth = () => {
    handleMonthChange(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1),
      "right"
    );
  };

  const goToNextMonth = () => {
    handleMonthChange(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1),
      "left"
    );
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Determine direction based on whether we're going forward or backward
    const direction = selectedMonth < currentMonth ? "left" : "right";
    handleMonthChange(currentMonth, direction);
  };

  // Format month display
  const formatMonthDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <>
      {/* Header with universal date toggle */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">
            Overview
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's your financial snapshot.
          </p>
        </div>

        {/* Universal Month Toggle */}
        <div className="flex flex-col items-end gap-1 sm:mt-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border min-w-[160px] justify-center">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {formatMonthDisplay(selectedMonth)}
              </span>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Current Month button - only show if not on current month */}
          {!isCurrentMonth() && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={goToCurrentMonth}
            >
              Current Month
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <MetricsCards
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          netSavings={netSavings}
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
          slideDirection={slideDirection}
        />
      </div>
    </>
  );
}
