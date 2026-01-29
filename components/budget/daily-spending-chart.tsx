"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMonthName } from "@/lib/budget-utils";

interface DailySpendingChartProps {
  dailySpendingData: { day: number; date: string; amount: number }[];
  dailyBudget: number;
  month: number;
  year: number;
  gradientId?: string;
}

export function DailySpendingChart({
  dailySpendingData,
  dailyBudget,
  month,
  year,
  gradientId = "spendingGradient-inline",
}: DailySpendingChartProps) {
  // Calculate days in month and prepare chart data
  const chartData = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
    const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;

    const data: { day: number; spending: number | null }[] = [];
    const spendingMap = new Map<number, number>();
    dailySpendingData.forEach((d) => {
      spendingMap.set(d.day, d.amount);
    });

    for (let day = 1; day <= currentDay; day++) {
      data.push({
        day,
        spending: spendingMap.get(day) ?? 0,
      });
    }

    return data;
  }, [dailySpendingData, month, year]);

  // Calculate average spending (only days with spending)
  const averageSpending = useMemo(() => {
    const daysWithSpending = chartData.filter((d) => d.spending !== null && d.spending > 0);
    if (daysWithSpending.length === 0) return 0;
    const total = daysWithSpending.reduce((sum, d) => sum + (d.spending || 0), 0);
    return total / daysWithSpending.length;
  }, [chartData]);

  // Calculate max value for Y axis
  const maxValue = useMemo(() => {
    const maxSpending = Math.max(...chartData.map((d) => d.spending || 0), 0);
    return Math.max(maxSpending, dailyBudget, averageSpending) * 1.2;
  }, [chartData, dailyBudget, averageSpending]);

  const monthName = getMonthName(month, "long");
  const hasData = dailySpendingData.length > 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Daily Spending Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {!hasData ? (
          <div className="flex-1 min-h-[250px] flex items-center justify-center text-sm text-muted-foreground">
            No spending data available
          </div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-xs mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Daily Spending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0 border-t-2 border-dashed border-orange-400" />
                <span className="text-muted-foreground">Daily Budget</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0 border-t-2 border-dashed border-green-500" />
                <span className="text-muted-foreground">Average</span>
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                    label={{
                      value: `${monthName} (Days)`,
                      position: "bottom",
                      offset: 5,
                      style: { fontSize: 11, fill: "#6b7280" },
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickFormatter={(value) => `$${value}`}
                    domain={[0, maxValue]}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Spent"]}
                    labelFormatter={(label) => `Day ${label}`}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  {/* Daily Budget Reference Line */}
                  <ReferenceLine
                    y={dailyBudget}
                    stroke="#f97316"
                    strokeDasharray="6 4"
                    strokeWidth={2}
                  />
                  {/* Average Spending Reference Line */}
                  {averageSpending > 0 && (
                    <ReferenceLine
                      y={averageSpending}
                      stroke="#22c55e"
                      strokeDasharray="6 4"
                      strokeWidth={2}
                    />
                  )}
                  {/* Spending Area */}
                  <Area
                    type="monotone"
                    dataKey="spending"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    dot={{ fill: "#3b82f6", strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, stroke: "#3b82f6", strokeWidth: 2, fill: "white" }}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
