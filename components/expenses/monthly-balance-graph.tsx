"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Info, TrendingUp } from "lucide-react";
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
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

interface Investment {
  id: string;
  name: string;
  type: string;
  currentCapital: string;
  projectedYield: string;
  contributionAmount: string;
  contributionFrequency: string;
  customMonths: string | null;
  isActive: boolean | null;
}

interface MonthlyBalanceGraphProps {
  incomes: Income[];
  expenses: Expense[];
  holdings: CurrentHolding[];
  investments?: Investment[];
}

const TIME_RANGES = [
  { value: "12", label: "12 Months" },
  { value: "24", label: "24 Months" },
  { value: "36", label: "3 Years" },
  { value: "60", label: "5 Years" },
  { value: "120", label: "10 Years" },
  { value: "240", label: "20 Years" },
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

  // Render arrows for special items if present (one arrow per type per month)
  if (payload.specialItems && payload.specialItems.length > 0) {
    // Get unique types for this month
    const uniqueTypes = new Set(payload.specialItems.map((item: SpecialItem) => item.type));
    const baseOffset = 12; // pixels from the dot

    let incomeCount = 0;
    let expenseCount = 0;

    // Render one arrow per unique type
    uniqueTypes.forEach((type) => {
      if (type === 'one-off-income') {
        // Green up arrow above the line
        const yPos = cy - baseOffset;
        elements.push(
          <polygon
            key={`arrow-income`}
            points={`${cx},${yPos - 7} ${cx - 5},${yPos + 4} ${cx + 5},${yPos + 4}`}
            fill={ARROW_COLORS['one-off-income']}
            stroke="white"
            strokeWidth={1}
          />
        );
        incomeCount++;
      } else {
        // Red or orange down arrow below the line
        const color = type === 'one-off-expense'
          ? ARROW_COLORS['one-off-expense']
          : ARROW_COLORS['custom-expense'];
        const yPos = cy + baseOffset + (expenseCount * 13);
        elements.push(
          <polygon
            key={`arrow-${type}`}
            points={`${cx},${yPos + 7} ${cx - 5},${yPos - 4} ${cx + 5},${yPos - 4}`}
            fill={color}
            stroke="white"
            strokeWidth={1}
          />
        );
        expenseCount++;
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

    // Regular line tooltip - extend type with investment fields
    const data = payload[0].payload as MonthlyBalanceData & {
      balanceWithInvestments?: number;
      monthlyBalanceWithInvestments?: number;
    };

    // Collect special items for this month
    const specialItems = data.specialItems || [];

    // Check if we have combined investment data
    const hasInvestmentData = data.balanceWithInvestments !== undefined;

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
              {hasInvestmentData && data.balanceWithInvestments !== undefined && (
                <p className="font-semibold text-teal-600">
                  With Investments: {formatCurrency(data.balanceWithInvestments)}
                </p>
              )}
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
              {hasInvestmentData && data.monthlyBalanceWithInvestments !== undefined && (
                <p className={`font-semibold ${data.monthlyBalanceWithInvestments >= 0 ? "text-teal-600" : "text-red-600"}`}>
                  Net + Investments: {formatCurrency(data.monthlyBalanceWithInvestments)}
                </p>
              )}
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

const INCLUDE_INVESTMENTS_KEY = "foracle_include_investments";

export function MonthlyBalanceGraph({ incomes, expenses, holdings, investments = [] }: MonthlyBalanceGraphProps) {
  const [timeRange, setTimeRange] = useState("12");
  const [viewMode, setViewMode] = useState<"cumulative" | "non-cumulative">("cumulative");
  const [includeInvestments, setIncludeInvestments] = useState(false);

  // Load saved preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(INCLUDE_INVESTMENTS_KEY);
    if (saved !== null) {
      setIncludeInvestments(saved === "true");
    }
  }, []);

  // Save preference to localStorage when it changes
  const handleIncludeInvestmentsChange = (checked: boolean) => {
    setIncludeInvestments(checked);
    localStorage.setItem(INCLUDE_INVESTMENTS_KEY, String(checked));
  };

  const activeInvestments = investments.filter((i) => i.isActive);
  const hasInvestments = activeInvestments.length > 0;

  // Calculate starting balance from current holdings
  const startingBalance = useMemo(() => {
    return holdings.reduce((total, holding) => {
      return total + parseFloat(holding.holdingAmount);
    }, 0);
  }, [holdings]);

  // Calculate investment starting capital
  const investmentStartingCapital = useMemo(() => {
    return activeInvestments.reduce((total, inv) => {
      return total + parseFloat(inv.currentCapital);
    }, 0);
  }, [activeInvestments]);

  // Calculate base balance data based on selected time range
  const baseBalanceData = useMemo(() => {
    const months = timeRangeToMonths(timeRange);
    return calculateMonthlyBalance(incomes, expenses, months, startingBalance);
  }, [incomes, expenses, timeRange, startingBalance]);

  // Calculate investment projections month-by-month
  const investmentProjections = useMemo(() => {
    if (activeInvestments.length === 0) {
      return null;
    }

    const totalMonths = timeRangeToMonths(timeRange);

    // Pre-calculate month-by-month values for each investment
    const projectionsByInvestment = activeInvestments.map((inv) => {
      const capital = parseFloat(inv.currentCapital);
      const annualYield = parseFloat(inv.projectedYield) / 100;
      const monthlyRate = annualYield / 12;
      const contribution = parseFloat(inv.contributionAmount);

      // Parse custom months (1-12 representing Jan-Dec)
      let contributionMonths: number[] | null = null;
      if (inv.contributionFrequency === "custom" && inv.customMonths) {
        try {
          contributionMonths = JSON.parse(inv.customMonths) as number[];
        } catch {
          contributionMonths = null;
        }
      }

      // Calculate month-by-month
      const monthlyValues: number[] = [];
      let balance = capital;

      // Month 0 is starting point
      monthlyValues.push(balance);

      for (let month = 1; month <= totalMonths; month++) {
        // Apply monthly compound interest
        balance *= (1 + monthlyRate);

        // Add contribution based on frequency
        if (inv.contributionFrequency === "monthly") {
          balance += contribution;
        } else if (contributionMonths) {
          const calendarMonth = ((month - 1) % 12) + 1;
          if (contributionMonths.includes(calendarMonth)) {
            balance += contribution;
          }
        }

        monthlyValues.push(balance);
      }

      return monthlyValues;
    });

    // Sum all investments for each month
    const totalMonthlyValues: number[] = [];
    for (let month = 0; month <= totalMonths; month++) {
      let total = 0;
      projectionsByInvestment.forEach((projection) => {
        total += projection[month];
      });
      totalMonthlyValues.push(total);
    }

    return totalMonthlyValues;
  }, [activeInvestments, timeRange]);

  // Create balance data with optional combined investment values
  const balanceData = useMemo(() => {
    return baseBalanceData.map((data, index) => ({
      ...data,
      // Add combined balance field when investments are included
      balanceWithInvestments: includeInvestments && investmentProjections
        ? data.balance + (investmentProjections[index] || 0)
        : undefined,
      // For non-cumulative view, add monthly balance with investment growth
      monthlyBalanceWithInvestments: includeInvestments && investmentProjections
        ? data.monthlyBalance + (
            index > 0
              ? (investmentProjections[index] || 0) - (investmentProjections[index - 1] || 0)
              : 0
          )
        : undefined,
    }));
  }, [baseBalanceData, includeInvestments, investmentProjections]);

  // Determine if balance is positive or negative for styling
  const finalBalance = balanceData.length > 0 ? balanceData[balanceData.length - 1].balance : 0;
  const finalBalanceWithInvestments = includeInvestments && balanceData.length > 0
    ? balanceData[balanceData.length - 1].balanceWithInvestments || 0
    : 0;
  const isPositive = finalBalance >= 0;
  const isCombinedPositive = finalBalanceWithInvestments >= 0;

  // Calculate min/max for Y-axis based on view mode (including combined values if shown)
  const allBalanceValues = viewMode === "cumulative"
    ? [
        ...balanceData.map((d) => d.balance),
        ...(includeInvestments ? balanceData.map((d) => d.balanceWithInvestments || d.balance) : []),
      ]
    : [
        ...balanceData.map((d) => d.income),
        ...balanceData.map((d) => d.expense),
        ...balanceData.map((d) => d.monthlyBalance),
        ...(includeInvestments ? balanceData.map((d) => d.monthlyBalanceWithInvestments || d.monthlyBalance) : []),
      ];

  const minBalance = Math.min(...allBalanceValues);
  const maxBalance = Math.max(...allBalanceValues);

  // Add 10% padding to Y-axis range for better visualization
  const padding = Math.max(Math.abs(maxBalance), Math.abs(minBalance)) * 0.1;
  const yAxisMin = Math.floor((minBalance - padding) / 1000) * 1000;
  const yAxisMax = Math.ceil((maxBalance + padding) / 1000) * 1000;

  // Check if this is a long duration (5y, 10y, or 20y) - hide dots and limit X axis ticks
  const isLongDuration = timeRange === "60" || timeRange === "120" || timeRange === "240";
  const totalDataPoints = balanceData.length;
  // For long durations, show ~10 ticks spread equally
  const xAxisInterval = isLongDuration ? Math.floor(totalDataPoints / 10) : 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl sm:text-3xl font-black">Monthly Balance Projection</CardTitle>
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

        {/* Investment Toggle */}
        {hasInvestments && (
          <div className="flex items-center justify-between mt-3 sm:mt-4 p-3 bg-teal-50 rounded-lg border border-teal-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-600" />
              <div>
                <Label
                  htmlFor="includeInvestments"
                  className="text-sm font-medium text-teal-900 cursor-pointer"
                >
                  Include Investment Projection
                </Label>
                <p className="text-xs text-teal-700">
                  Add projected investment growth to your balance
                </p>
              </div>
            </div>
            <Switch
              id="includeInvestments"
              checked={includeInvestments}
              onCheckedChange={handleIncludeInvestmentsChange}
            />
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3 sm:mt-4">
          <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
            <p className="text-xs text-gray-600 mb-0.5">Starting Balance</p>
            <p className="text-sm sm:text-lg font-semibold text-gray-900">
              {formatCurrency(startingBalance)}
            </p>
            {includeInvestments && (
              <p className="text-[10px] text-teal-600">
                + {formatCurrency(investmentStartingCapital)} investments
              </p>
            )}
          </div>
          <div className={`rounded-lg p-2 sm:p-3 ${isPositive ? "bg-green-50" : "bg-red-50"}`}>
            <p className="text-xs text-gray-600 mb-0.5">Projected Balance</p>
            <p className={`text-sm sm:text-lg font-semibold ${isPositive ? "text-green-700" : "text-red-700"}`}>
              {formatCurrency(finalBalance)}
            </p>
            {includeInvestments && (
              <p className={`text-[10px] ${isCombinedPositive ? "text-teal-600" : "text-red-600"}`}>
                Combined: {formatCurrency(finalBalanceWithInvestments)}
              </p>
            )}
          </div>
          <div className={`rounded-lg p-2 sm:p-3 ${(finalBalance - startingBalance) >= 0 ? "bg-green-50" : "bg-red-50"}`}>
            <p className="text-xs text-gray-600 mb-0.5">Net Change</p>
            <p className={`text-sm sm:text-lg font-semibold ${(finalBalance - startingBalance) >= 0 ? "text-green-700" : "text-red-700"}`}>
              {(finalBalance - startingBalance) >= 0 ? "+" : ""}{formatCurrency(finalBalance - startingBalance)}
            </p>
            {includeInvestments && (
              <p className="text-[10px] text-teal-600">
                Combined: {(finalBalanceWithInvestments - startingBalance - investmentStartingCapital) >= 0 ? "+" : ""}
                {formatCurrency(finalBalanceWithInvestments - startingBalance - investmentStartingCapital)}
              </p>
            )}
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
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorNetBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCombined" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
                angle={-45}
                textAnchor="end"
                height={80}
                tickLine={false}
                interval={xAxisInterval}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
                tickFormatter={(value) => formatCurrency(value)}
                domain={[yAxisMin, yAxisMax]}
                tickLine={false}
                axisLine={false}
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
                <>
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={isLongDuration ? false : <CustomBalanceDot />}
                    activeDot={{ r: 5 }}
                    fillOpacity={1}
                    fill="url(#colorBalance)"
                    name="Cumulative Balance"
                  />
                  {includeInvestments && (
                    <Area
                      type="monotone"
                      dataKey="balanceWithInvestments"
                      stroke="#14b8a6"
                      strokeWidth={2}
                      dot={isLongDuration ? false : { fill: "#14b8a6", r: 3 }}
                      activeDot={{ r: 5 }}
                      fillOpacity={1}
                      fill="url(#colorCombined)"
                      name="With Investments"
                    />
                  )}
                </>
              ) : (
                <>
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={isLongDuration ? false : { fill: "#10b981", r: 3 }}
                    activeDot={{ r: 5 }}
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                    name="Income"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={isLongDuration ? false : { fill: "#ef4444", r: 3 }}
                    activeDot={{ r: 5 }}
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                    name="Expenses"
                  />
                  <Area
                    type="monotone"
                    dataKey="monthlyBalance"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={isLongDuration ? false : { fill: "#3b82f6", r: 3 }}
                    activeDot={{ r: 5 }}
                    fillOpacity={1}
                    fill="url(#colorNetBalance)"
                    name="Net Balance"
                  />
                  {includeInvestments && (
                    <Area
                      type="monotone"
                      dataKey="monthlyBalanceWithInvestments"
                      stroke="#14b8a6"
                      strokeWidth={2}
                      dot={isLongDuration ? false : { fill: "#14b8a6", r: 3 }}
                      activeDot={{ r: 5 }}
                      fillOpacity={1}
                      fill="url(#colorCombined)"
                      name="Net Balance + Investments"
                    />
                  )}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

      </CardContent>
    </Card>
  );
}
