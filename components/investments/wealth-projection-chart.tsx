"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface WealthProjectionChartProps {
  investments: Investment[];
}

interface DataPoint {
  period: number;
  periodLabel: string;
  withContributions: number;
  withoutContributions: number;
}

const TIME_RANGES = [
  { value: 1, label: "12m", displayLabel: "12 months" },
  { value: 2, label: "24m", displayLabel: "24 months" },
  { value: 3, label: "3y", displayLabel: "3 years" },
  { value: 5, label: "5y", displayLabel: "5 years" },
  { value: 10, label: "10y", displayLabel: "10 years" },
  { value: 15, label: "15y", displayLabel: "15 years" },
  { value: 20, label: "20y", displayLabel: "20 years" },
];

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#00C4AA]" />
            <span className="text-foreground">With Contributions:</span>
            <span className="font-medium">
              {formatCurrencyFull(payload[0]?.value || 0)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-muted" />
            <span className="text-foreground">Without Contributions:</span>
            <span className="font-medium">
              {formatCurrencyFull(payload[1]?.value || 0)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function WealthProjectionChart({ investments }: WealthProjectionChartProps) {
  const [selectedRange, setSelectedRange] = useState(10);

  const activeInvestments = investments.filter((i) => i.isActive);

  // Get display label for selected range
  const selectedRangeConfig = TIME_RANGES.find((r) => r.value === selectedRange);
  const rangeDisplayLabel = selectedRangeConfig?.displayLabel || `${selectedRange} years`;

  // Calculate projection data with accurate custom contribution timing
  const projectionData = useMemo(() => {
    if (activeInvestments.length === 0) {
      return [];
    }

    // For short ranges (1-2 years), show monthly data points
    // For longer ranges, show yearly data points
    const useMonthly = selectedRange <= 2;
    const totalMonths = selectedRange * 12;

    // Pre-calculate month-by-month values for each investment
    // This handles custom contribution frequencies accurately
    const investmentProjections = activeInvestments.map((inv) => {
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

      // Calculate month-by-month for accurate custom frequency handling
      const monthlyValues: { withContributions: number; withoutContributions: number }[] = [];
      let balanceWith = capital;
      let balanceWithout = capital;

      // Month 0 is starting point
      monthlyValues.push({ withContributions: balanceWith, withoutContributions: balanceWithout });

      for (let month = 1; month <= totalMonths; month++) {
        // Apply monthly compound interest
        balanceWith *= (1 + monthlyRate);
        balanceWithout *= (1 + monthlyRate);

        // Add contribution based on frequency
        if (inv.contributionFrequency === "monthly") {
          // Monthly: contribute every month
          balanceWith += contribution;
        } else if (contributionMonths) {
          // Custom: contribute only in specified months
          // month % 12 gives us 0-11, we need to map to 1-12
          const calendarMonth = ((month - 1) % 12) + 1;
          if (contributionMonths.includes(calendarMonth)) {
            balanceWith += contribution;
          }
        }

        monthlyValues.push({ withContributions: balanceWith, withoutContributions: balanceWithout });
      }

      return monthlyValues;
    });

    // Aggregate all investments and create data points
    const data: { period: number; periodLabel: string; withContributions: number; withoutContributions: number }[] = [];

    if (useMonthly) {
      // Show every month for short ranges
      for (let month = 0; month <= totalMonths; month++) {
        let withContributions = 0;
        let withoutContributions = 0;

        investmentProjections.forEach((projection) => {
          withContributions += projection[month].withContributions;
          withoutContributions += projection[month].withoutContributions;
        });

        data.push({
          period: month,
          periodLabel: `M${month}`,
          withContributions,
          withoutContributions,
        });
      }
    } else {
      // Show yearly data points for longer ranges
      for (let year = 0; year <= selectedRange; year++) {
        const month = year * 12;
        let withContributions = 0;
        let withoutContributions = 0;

        investmentProjections.forEach((projection) => {
          withContributions += projection[month].withContributions;
          withoutContributions += projection[month].withoutContributions;
        });

        data.push({
          period: year,
          periodLabel: `Year ${year}`,
          withContributions,
          withoutContributions,
        });
      }
    }

    return data;
  }, [activeInvestments, selectedRange]);

  // Get the projected value at the end of the range
  const projectedValue = projectionData[projectionData.length - 1]?.withContributions || 0;

  if (activeInvestments.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl font-bold">Wealth Projection</CardTitle>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="max-w-[350px] text-xs bg-white border shadow-lg p-3"
                >
                  <p className="font-semibold mb-2">How the projection is calculated</p>
                  <p className="mb-2">
                    For each time period, we calculate the future value using compound interest with monthly compounding:
                  </p>
                  <p className="mb-2">
                    <strong>With Contributions:</strong><br />
                    FV = C × (1 + r/12)<sup>n</sup> + PMT × ((1 + r/12)<sup>n</sup> - 1) / (r/12)
                  </p>
                  <p className="mb-2">
                    <strong>Without Contributions:</strong><br />
                    FV = C × (1 + r/12)<sup>n</sup>
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    C = current capital, r = annual yield rate, n = number of months, PMT = monthly contribution amount.
                    All investments are summed together for the total projection.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription>
            Add investments to see your projected growth
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No active investments to project
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold">Wealth Projection</CardTitle>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="max-w-[350px] text-xs bg-white border shadow-lg p-3"
                  >
                    <p className="font-semibold mb-2">How the projection is calculated</p>
                    <p className="mb-2">
                      For each time period, we calculate the future value using compound interest with monthly compounding:
                    </p>
                    <p className="mb-2">
                      <strong>With Contributions:</strong><br />
                      FV = C × (1 + r/12)<sup>n</sup> + PMT × ((1 + r/12)<sup>n</sup> - 1) / (r/12)
                    </p>
                    <p className="mb-2">
                      <strong>Without Contributions:</strong><br />
                      FV = C × (1 + r/12)<sup>n</sup>
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      C = current capital, r = annual yield rate, n = number of months, PMT = monthly contribution amount.
                      All investments are summed together for the total projection.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>
              Projected growth over the next {rangeDisplayLabel}
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {/* Projected Value Display */}
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">
                {rangeDisplayLabel} estimate
              </p>
              <p className="text-lg font-bold text-[#007A68]">
                {formatCurrencyFull(projectedValue)}
              </p>
            </div>

            {/* Time Range Selector */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setSelectedRange(range.value)}
                  className={cn(
                    "px-2 py-1.5 text-sm font-medium rounded-md transition-colors",
                    selectedRange === range.value
                      ? "bg-white text-foreground shadow-sm"
                      : "text-foreground hover:text-foreground"
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Projected Value */}
        <div className="sm:hidden mt-2 p-3 bg-[rgba(0,196,170,0.12)] rounded-lg">
          <p className="text-xs text-muted-foreground">
            {rangeDisplayLabel} estimate
          </p>
          <p className="text-xl font-bold text-[#007A68]">
            {formatCurrencyFull(projectedValue)}
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={projectionData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorWith" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5A9470" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5A9470" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorWithout" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgba(28,43,42,0.45)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="rgba(28,43,42,0.45)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,42,0.10)" />
              <XAxis
                dataKey="periodLabel"
                stroke="rgba(28,43,42,0.55)"
                style={{ fontSize: "12px" }}
                tickLine={false}
              />
              <YAxis
                stroke="rgba(28,43,42,0.55)"
                style={{ fontSize: "12px" }}
                tickFormatter={formatCurrency}
                tickLine={false}
                axisLine={false}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
              <Area
                type="monotone"
                dataKey="withContributions"
                name="With Contributions"
                stroke="#5A9470"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorWith)"
              />
              <Area
                type="monotone"
                dataKey="withoutContributions"
                name="Without Contributions"
                stroke="rgba(28,43,42,0.45)"
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorWithout)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
