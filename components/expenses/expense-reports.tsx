"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import {
  calculateExpensesByCategory,
  filterExpensesByDateRange,
  getDateRangeForPeriod,
  getTopCategories,
  type CategoryTotal,
} from "@/lib/expense-calculator";

interface Expense {
  id: string;
  name: string;
  category: string;
  expenseCategory: string;
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string;
  endDate: string | null;
  description: string | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ExpenseReportsProps {
  expenses: Expense[];
}

type SortKey = "category" | "amount" | "percentage" | "count";
type SortDirection = "asc" | "desc";

const TIME_PERIODS = [
  { value: "current-month", label: "Current Month" },
  { value: "3-months", label: "Last 3 Months" },
  { value: "6-months", label: "Last 6 Months" },
  { value: "ytd", label: "Year to Date" },
  { value: "12-months", label: "Last 12 Months" },
  { value: "all-time", label: "All Time" },
];

export function ExpenseReports({ expenses }: ExpenseReportsProps) {
  const [timePeriod, setTimePeriod] = useState("current-month");
  const [sortKey, setSortKey] = useState<SortKey>("amount");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Filter expenses by selected time period
  const filteredExpenses = useMemo(() => {
    const { start, end } = getDateRangeForPeriod(timePeriod);
    return filterExpensesByDateRange(expenses, start, end);
  }, [expenses, timePeriod]);

  // Calculate category breakdown
  const breakdown = useMemo(() => {
    return calculateExpensesByCategory(filteredExpenses);
  }, [filteredExpenses]);

  // Get top 5 categories
  const topCategories = useMemo(() => {
    return getTopCategories(filteredExpenses, 5);
  }, [filteredExpenses]);

  // Sort categories for table
  const sortedCategories = useMemo(() => {
    return [...breakdown.categories].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [breakdown.categories, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection(key === "category" ? "asc" : "desc");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Prepare data for pie chart
  const pieChartData = breakdown.categories.map((cat) => ({
    name: cat.category,
    value: cat.amount,
    percentage: cat.percentage,
    color: cat.color,
  }));

  // Custom label for pie chart
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show label if slice is too small

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header with Time Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Expense Reports</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze your spending by category
          </p>
        </div>
        <Select value={timePeriod} onValueChange={setTimePeriod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_PERIODS.map((period) => (
              <SelectItem key={period.value} value={period.value}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredExpenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PieChartIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No expenses found for the selected period
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top Categories Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Categories</CardTitle>
              <CardDescription>
                Your highest spending categories for {TIME_PERIODS.find(p => p.value === timePeriod)?.label.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topCategories.map((cat, index) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{cat.category}</span>
                      <span className="text-sm font-semibold">{formatCurrency(cat.amount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${cat.percentage}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {cat.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>
                Visual representation of expenses by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-8 items-center">
                <div className="w-full lg:w-2/3">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomLabel}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full lg:w-1/3">
                  <div className="text-center lg:text-left mb-4">
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-3xl font-bold">{formatCurrency(breakdown.totalAmount)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {breakdown.totalExpenses} expense{breakdown.totalExpenses !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {pieChartData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm flex-1">{entry.name}</span>
                        <span className="text-sm font-medium">{entry.percentage.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Breakdown</CardTitle>
              <CardDescription>
                Complete expense analysis by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("category")}
                          className="h-auto p-0 font-semibold"
                        >
                          Category
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("amount")}
                          className="h-auto p-0 font-semibold"
                        >
                          Amount
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("percentage")}
                          className="h-auto p-0 font-semibold"
                        >
                          % of Total
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("count")}
                          className="h-auto p-0 font-semibold"
                        >
                          # of Expenses
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Avg per Expense</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCategories.map((cat) => (
                      <TableRow key={cat.category}>
                        <TableCell>
                          <div
                            className="w-4 h-4 rounded-sm"
                            style={{ backgroundColor: cat.color }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{cat.category}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(cat.amount)}
                        </TableCell>
                        <TableCell className="text-right">{cat.percentage.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{cat.count}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(cat.avgPerExpense)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
