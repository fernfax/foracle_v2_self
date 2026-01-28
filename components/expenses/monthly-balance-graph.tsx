"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { calculateMonthlyBalance, timeRangeToMonths, type MonthlyBalanceData, type SpecialItem } from "@/lib/balance-calculator";

interface Income {
  id: string;
  name: string;
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string;
  endDate: string | null;
  incomeCategory: string | null;
  isActive: boolean | null;
  netTakeHome: string | null;
  subjectToCpf: boolean | null;
  futureMilestones: string | null;
  accountForFutureChange: boolean | null;
}

interface Expense {
  id: string;
  name: string;
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string | null;
  endDate: string | null;
  expenseCategory: string | null;
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

interface ArrowDataPoint {
  type: 'one-off-income' | 'one-off-expense' | 'custom-expense';
  month: string;
  amount: number;
  name: string;
  x: number;
  y: number;
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

// Arrow marker colors
const ARROW_COLORS = {
  'one-off-income': '#10b981',    // emerald-500
  'one-off-expense': '#ef4444',   // red-500
  'custom-expense': '#f59e0b',    // amber-500
};

// Custom dot component that renders balance dots and arrow markers for special items
const CustomBalanceDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined) return null;

  const elements: React.ReactNode[] = [];

  // Always render the regular balance dot
  elements.push(
    <circle key="balance-dot" cx={cx} cy={cy} r={4} fill="#3b82f6" />
  );

  // Render arrows for special items if present
  if (payload.specialItems && payload.specialItems.length > 0) {
    let incomeOffset = 0;
    let expenseOffset = 0;

    payload.specialItems.forEach((item: SpecialItem, idx: number) => {
      const baseOffset = 20; // pixels from the dot
      const stackOffset = 15; // pixels between stacked arrows

      if (item.type === 'one-off-income') {
        // Green up arrow above the line
        const yPos = cy - baseOffset - (incomeOffset * stackOffset);
        elements.push(
          <polygon
            key={`arrow-income-${idx}`}
            points={`${cx},${yPos - 10} ${cx - 7},${yPos + 5} ${cx + 7},${yPos + 5}`}
            fill={ARROW_COLORS['one-off-income']}
            stroke="white"
            strokeWidth={1}
          />
        );
        incomeOffset++;
      } else {
        // Red or orange down arrow below the line
        const color = item.type === 'one-off-expense'
          ? ARROW_COLORS['one-off-expense']
          : ARROW_COLORS['custom-expense'];
        const yPos = cy + baseOffset + (expenseOffset * stackOffset);
        elements.push(
          <polygon
            key={`arrow-expense-${idx}`}
            points={`${cx},${yPos + 10} ${cx - 7},${yPos - 5} ${cx + 7},${yPos - 5}`}
            fill={color}
            stroke="white"
            strokeWidth={1}
          />
        );
        expenseOffset++;
      }
    });
  }

  return <g>{elements}</g>;
};

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
 * Get label for special item type
 */
function getSpecialItemLabel(type: SpecialItem['type']): string {
  switch (type) {
    case 'one-off-income': return 'One-off';
    case 'one-off-expense': return 'One-off';
    case 'custom-expense': return 'Custom';
    default: return '';
  }
}

/**
 * Custom tooltip component
 */
function CustomTooltip({ active, payload, viewMode }: any) {
  if (active && payload && payload.length) {
    // Check if this is a scatter point (arrow marker)
    const firstPayload = payload[0];
    if (firstPayload.dataKey === 'y' && firstPayload.payload.type) {
      // This is an arrow marker tooltip
      const arrowData = firstPayload.payload as ArrowDataPoint;
      const color = ARROW_COLORS[arrowData.type];
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 mb-2">{arrowData.month}</p>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm">
              {getSpecialItemLabel(arrowData.type)}: ${arrowData.amount.toLocaleString()} - {arrowData.name}
            </span>
          </div>
        </div>
      );
    }

    // Regular line tooltip
    const data = payload[0].payload as MonthlyBalanceData;

    // Collect special items for this month
    const specialItems = data.specialItems || [];

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

          {/* Show special items if any */}
          {specialItems.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              {specialItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: ARROW_COLORS[item.type] }}
                  />
                  <span className="text-xs">
                    {getSpecialItemLabel(item.type)}: ${item.amount.toLocaleString()} - {item.name}
                  </span>
                </div>
              ))}
            </div>
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

  // Calculate min/max for Y-axis based on view mode (without forcing 0)
  const minBalance = viewMode === "cumulative"
    ? Math.min(...balanceData.map((d) => d.balance))
    : Math.min(
        ...balanceData.map((d) => d.income),
        ...balanceData.map((d) => d.expense),
        ...balanceData.map((d) => d.monthlyBalance)
      );

  const maxBalance = viewMode === "cumulative"
    ? Math.max(...balanceData.map((d) => d.balance))
    : Math.max(
        ...balanceData.map((d) => d.income),
        ...balanceData.map((d) => d.expense),
        ...balanceData.map((d) => d.monthlyBalance)
      );

  // Add 10% padding to Y-axis range for better visualization
  const padding = Math.max(Math.abs(maxBalance), Math.abs(minBalance)) * 0.1;
  const yAxisMin = Math.floor((minBalance - padding) / 1000) * 1000;
  const yAxisMax = Math.ceil((maxBalance + padding) / 1000) * 1000;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg sm:text-xl">Monthly Balance Projection</CardTitle>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[300px] text-xs bg-white border shadow-lg">
                    <p>
                      This projection includes <strong>All Active Income</strong> (including one-time income) and{" "}
                      <strong>All Active Expenses</strong> (including one-time expenses). Future income milestones are only included for incomes with &quot;Account for Future Change&quot; enabled.
                      Starting balance is based on the sum of all current holdings.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription className="mt-0.5 text-xs sm:text-sm">
              {viewMode === "cumulative"
                ? "Cumulative balance projection based on current recurring income and expenses"
                : "Monthly breakdown of income, expenses, and net balance"
              }
            </CardDescription>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-4" data-tour="graph-controls">
            {/* View Mode Toggle */}
            <div className="space-y-1 sm:space-y-2 sm:min-w-[180px]">
              <Label htmlFor="viewMode" className="text-xs sm:text-sm font-medium">
                View Mode
              </Label>
              <Select value={viewMode} onValueChange={(value: "cumulative" | "non-cumulative") => setViewMode(value)}>
                <SelectTrigger id="viewMode" className="bg-white text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cumulative">Cumulative</SelectItem>
                  <SelectItem value="non-cumulative">Non-Cumulative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Range Selector */}
            <div className="space-y-1 sm:space-y-2 sm:min-w-[180px]">
              <Label htmlFor="timeRange" className="text-xs sm:text-sm font-medium">
                Time Range
              </Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger id="timeRange" className="bg-white text-xs sm:text-sm h-9 sm:h-10">
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
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3 sm:mt-4">
          <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
            <p className="text-xs text-gray-600 mb-0.5">Starting Balance</p>
            <p className="text-sm sm:text-lg font-semibold text-gray-900">
              {formatCurrency(startingBalance)}
            </p>
          </div>
          <div className={`rounded-lg p-2 sm:p-3 ${isPositive ? "bg-green-50" : "bg-red-50"}`}>
            <p className="text-xs text-gray-600 mb-0.5">Projected Balance</p>
            <p className={`text-sm sm:text-lg font-semibold ${isPositive ? "text-green-700" : "text-red-700"}`}>
              {formatCurrency(finalBalance)}
            </p>
          </div>
          <div className={`rounded-lg p-2 sm:p-3 ${(finalBalance - startingBalance) >= 0 ? "bg-green-50" : "bg-red-50"}`}>
            <p className="text-xs text-gray-600 mb-0.5">Net Change</p>
            <p className={`text-sm sm:text-lg font-semibold ${(finalBalance - startingBalance) >= 0 ? "text-green-700" : "text-red-700"}`}>
              {(finalBalance - startingBalance) >= 0 ? "+" : ""}{formatCurrency(finalBalance - startingBalance)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="w-full h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={balanceData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
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
              <RechartsTooltip content={<CustomTooltip viewMode={viewMode} />} />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                content={({ payload }) => (
                  <div className="flex flex-wrap items-center justify-center gap-4 pt-4 text-sm">
                    {/* Standard legend items */}
                    {payload?.map((entry, index) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-gray-600">{entry.value}</span>
                      </div>
                    ))}
                    {/* Arrow legend items */}
                    <div className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 12 12">
                        <polygon points="6,1 2,10 10,10" fill="#10b981" />
                      </svg>
                      <span className="text-gray-600">One-off Income</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 12 12">
                        <polygon points="6,11 2,2 10,2" fill="#ef4444" />
                      </svg>
                      <span className="text-gray-600">One-off Expense</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 12 12">
                        <polygon points="6,11 2,2 10,2" fill="#f59e0b" />
                      </svg>
                      <span className="text-gray-600">Custom Expense</span>
                    </div>
                  </div>
                )}
              />

              {viewMode === "cumulative" ? (
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={<CustomBalanceDot />}
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
            </ComposedChart>
          </ResponsiveContainer>
        </div>

      </CardContent>
    </Card>
  );
}
