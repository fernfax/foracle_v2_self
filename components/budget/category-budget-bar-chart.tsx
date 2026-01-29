"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BudgetVsActual } from "@/lib/actions/budget-calculator";

interface CategoryBudgetBarChartProps {
  budgetData: BudgetVsActual[];
}

function getBarColor(percentUsed: number): string {
  if (percentUsed >= 90) return "#ef4444"; // red
  if (percentUsed >= 75) return "#f59e0b"; // amber
  return "#3b82f6"; // blue
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-1">{data.name}</p>
      <div className="space-y-0.5 text-muted-foreground">
        <p>Budget: <span className="text-foreground font-medium">${data.budget.toLocaleString()}</span></p>
        <p>Spent: <span className="text-foreground font-medium">${data.spent.toLocaleString()}</span></p>
        <p>Remaining: <span className="text-foreground font-medium">${data.remaining.toLocaleString()}</span></p>
        <p>Used: <span className="text-foreground font-medium">{Math.round(data.percent)}%</span></p>
      </div>
    </div>
  );
}

export function CategoryBudgetBarChart({ budgetData }: CategoryBudgetBarChartProps) {
  const chartData = useMemo(() => {
    return budgetData
      .filter((b) => b.monthlyBudget > 0 || b.spent > 0)
      .sort((a, b) => b.percentUsed - a.percentUsed)
      .map((b) => ({
        name: b.categoryName.length > 14 ? b.categoryName.slice(0, 12) + "..." : b.categoryName,
        fullName: b.categoryName,
        spent: Math.round(b.spent),
        remaining: Math.max(0, Math.round(b.remaining)),
        budget: Math.round(b.monthlyBudget),
        percent: b.percentUsed,
      }));
  }, [budgetData]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Budget vs Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            No budget data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartHeight = Math.max(200, chartData.length * 44);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Budget vs Actual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: chartHeight }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Bar dataKey="spent" stackId="a" radius={[0, 0, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`spent-${index}`} fill={getBarColor(entry.percent)} />
                ))}
              </Bar>
              <Bar dataKey="remaining" stackId="a" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs mt-3 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            <span>&lt;75%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            <span>75-90%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
            <span>&gt;90%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-gray-200" />
            <span>Remaining</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
