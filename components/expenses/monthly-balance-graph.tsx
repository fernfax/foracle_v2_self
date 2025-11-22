"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { calculateMonthlyBalance, timeRangeToMonths, type MonthlyBalanceData } from "@/lib/balance-calculator";

interface Income {
  id: string;
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string;
  endDate: string | null;
  incomeCategory: string;
  isActive: boolean | null;
  netTakeHome: string | null;
  subjectToCpf: boolean | null;
  futureIncomeChange: boolean | null;
  futureIncomeAmount: string | null;
  futureIncomeStartDate: string | null;
  futureIncomeEndDate: string | null;
}

interface Expense {
  id: string;
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string;
  endDate: string | null;
  expenseCategory: string;
  isActive: boolean | null;
}

interface CurrentHolding {
  id: string;
  userId: string;
  familyMemberId: string | null;
  bankName: string;
  holdingAmount: string;
  createdAt: Date;
  updatedAt: Date;
  familyMemberName?: string | null;
}

interface MonthlyBalanceGraphProps {
  incomes: Income[];
  expenses: Expense[];
  holdings: CurrentHolding[];
}

const TIME_RANGES = [
  { value: "12", label: "12 Months" },
  { value: "24", label: "24 Months" },
  { value: "36", label: "3 Years" },
  { value: "60", label: "5 Years" },
  { value: "120", label: "10 Years" },
];

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Custom tooltip component
 */
function CustomTooltip({ active, payload, viewMode }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as MonthlyBalanceData;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <p className="font-semibold text-gray-900 mb-2">{data.month}</p>
        <div className="space-y-1 text-sm">
          {viewMode === "cumulative" ? (
            <>
              <p className="text-green-600">
                Income: {formatCurrency(data.income)}
              </p>
              <p className="text-red-600">
                Expenses: {formatCurrency(data.expense)}
              </p>
              <p className="font-semibold text-blue-600">
                Cumulative Balance: {formatCurrency(data.balance)}
              </p>
            </>
          ) : (
            <>
              <p className="text-green-600">
                Income: {formatCurrency(data.income)}
              </p>
              <p className="text-red-600">
                Expenses: {formatCurrency(data.expense)}
              </p>
              <p className={`font-semibold ${data.monthlyBalance >= 0 ? "text-blue-700" : "text-red-700"}`}>
                Net Balance: {formatCurrency(data.monthlyBalance)}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export function MonthlyBalanceGraph({ incomes, expenses, holdings }: MonthlyBalanceGraphProps) {
  const [timeRange, setTimeRange] = useState("12");
  const [viewMode, setViewMode] = useState<"cumulative" | "non-cumulative">("cumulative");

  // Calculate starting balance from current holdings
  const startingBalance = useMemo(() => {
    return holdings.reduce((total, holding) => {
      return total + parseFloat(holding.holdingAmount);
    }, 0);
  }, [holdings]);

  // Calculate balance data based on selected time range
  const balanceData = useMemo(() => {
    const months = timeRangeToMonths(timeRange);
    return calculateMonthlyBalance(incomes, expenses, months, startingBalance);
  }, [incomes, expenses, timeRange, startingBalance]);

  // Determine if balance is positive or negative for styling
  const finalBalance = balanceData.length > 0 ? balanceData[balanceData.length - 1].balance : 0;
  const isPositive = finalBalance >= 0;

  // Calculate min/max for Y-axis based on view mode
  const minBalance = viewMode === "cumulative"
    ? Math.min(...balanceData.map((d) => d.balance), 0)
    : Math.min(
        ...balanceData.map((d) => d.income),
        ...balanceData.map((d) => d.expense),
        ...balanceData.map((d) => d.monthlyBalance),
        0
      );

  const maxBalance = viewMode === "cumulative"
    ? Math.max(...balanceData.map((d) => d.balance), 0)
    : Math.max(
        ...balanceData.map((d) => d.income),
        ...balanceData.map((d) => d.expense),
        ...balanceData.map((d) => d.monthlyBalance),
        0
      );

  // Add some padding to Y-axis range
  const yAxisMin = Math.floor(minBalance * 1.1);
  const yAxisMax = Math.ceil(maxBalance * 1.1);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">Monthly Balance Projection</CardTitle>
            <CardDescription className="mt-1">
              {viewMode === "cumulative"
                ? "Cumulative balance projection based on current recurring income and expenses"
                : "Monthly breakdown of income, expenses, and net balance"
              }
            </CardDescription>
          </div>
          <div className="flex gap-4">
            {/* View Mode Toggle */}
            <div className="space-y-2 min-w-[180px]">
              <Label htmlFor="viewMode" className="text-sm font-medium">
                View Mode
              </Label>
              <Select value={viewMode} onValueChange={(value: "cumulative" | "non-cumulative") => setViewMode(value)}>
                <SelectTrigger id="viewMode" className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cumulative">Cumulative</SelectItem>
                  <SelectItem value="non-cumulative">Non-Cumulative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Range Selector */}
            <div className="space-y-2 min-w-[180px]">
              <Label htmlFor="timeRange" className="text-sm font-medium">
                Time Range
              </Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger id="timeRange" className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Starting Balance</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(startingBalance)}
            </p>
          </div>
          <div className={`rounded-lg p-4 ${isPositive ? "bg-green-50" : "bg-red-50"}`}>
            <p className="text-sm text-gray-600 mb-1">Projected Balance</p>
            <p className={`text-2xl font-semibold ${isPositive ? "text-green-700" : "text-red-700"}`}>
              {formatCurrency(finalBalance)}
            </p>
          </div>
          <div className={`rounded-lg p-4 ${(finalBalance - startingBalance) >= 0 ? "bg-green-50" : "bg-red-50"}`}>
            <p className="text-sm text-gray-600 mb-1">Net Change</p>
            <p className={`text-2xl font-semibold ${(finalBalance - startingBalance) >= 0 ? "text-green-700" : "text-red-700"}`}>
              {(finalBalance - startingBalance) >= 0 ? "+" : ""}{formatCurrency(finalBalance - startingBalance)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="w-full h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={balanceData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
                tickFormatter={(value) => formatCurrency(value)}
                domain={[yAxisMin, yAxisMax]}
              />
              <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="line"
              />

              {viewMode === "cumulative" ? (
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Cumulative Balance"
                />
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Income"
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: "#ef4444", r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Expenses"
                  />
                  <Line
                    type="monotone"
                    dataKey="monthlyBalance"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Net Balance"
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Info Message */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This projection includes <strong>Current Recurring Income</strong> (including future income changes) and{" "}
            <strong>Current Recurring Expenses</strong>. Future recurring, temporary, and one-off items are excluded.
            Starting balance is based on the sum of all current holdings for the current month.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
