"use client"

import { useMemo } from "react"
import type { BudgetVsActual } from "@/actions/budget-calculator"
import { TrendingUp } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveChart } from "@/components/ui/responsive-chart"

interface CategoryBudgetBarChartProps {
  budgetData: BudgetVsActual[]
}

function getBarColor(percentUsed: number): string {
  if (percentUsed >= 90) return "#E05555" // red
  if (percentUsed >= 75) return "#D4A843" // amber
  return "#3A6B52" // blue
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0]?.payload
  if (!data) return null

  return (
    <div className="bg-card border-border rounded-lg border p-3 text-sm shadow-lg">
      <p className="mb-1 font-semibold">{data.name}</p>
      <div className="text-muted-foreground space-y-0.5">
        <p>
          Budget:{" "}
          <span className="text-foreground font-medium">
            ${data.budget.toLocaleString()}
          </span>
        </p>
        <p>
          Spent:{" "}
          <span className="text-foreground font-medium">
            ${data.spent.toLocaleString()}
          </span>
        </p>
        <p>
          Remaining:{" "}
          <span className="text-foreground font-medium">
            ${data.remaining.toLocaleString()}
          </span>
        </p>
        <p>
          Used:{" "}
          <span className="text-foreground font-medium">
            {Math.round(data.percent)}%
          </span>
        </p>
      </div>
    </div>
  )
}

export function BudgetCategoryBarChart({
  budgetData
}: CategoryBudgetBarChartProps) {
  const chartData = useMemo(() => {
    return budgetData
      .filter((b) => b.monthlyBudget > 0 || b.spent > 0)
      .sort((a, b) => b.percentUsed - a.percentUsed)
      .map((b) => ({
        name:
          b.categoryName.length > 14
            ? b.categoryName.slice(0, 12) + "..."
            : b.categoryName,
        fullName: b.categoryName,
        spent: Math.round(b.spent),
        remaining: Math.max(0, Math.round(b.remaining)),
        budget: Math.round(b.monthlyBudget),
        percent: b.percentUsed
      }))
  }, [budgetData])

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <TrendingUp className="text-primary h-4 w-4" />
            Budget vs Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex h-[200px] items-center justify-center text-sm">
            No budget data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartHeight = Math.max(200, chartData.length * 44)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <TrendingUp className="text-primary h-4 w-4" />
          Budget vs Actual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: chartHeight }} className="w-full">
          <ResponsiveChart width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="hsl(var(--foreground) / 0.10)"
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--foreground) / 0.10)" }}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "hsl(var(--foreground) / 0.06)" }}
              />
              <Bar dataKey="spent" stackId="a" radius={[0, 0, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`spent-${index}`}
                    fill={getBarColor(entry.percent)}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="remaining"
                stackId="a"
                fill="hsl(var(--foreground) / 0.10)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveChart>
        </div>

        {/* Legend */}
        <div className="text-muted-foreground mt-3 flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="bg-brand-terracotta h-2.5 w-2.5 rounded-sm" />
            <span>&lt;75%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="bg-brand-gold h-2.5 w-2.5 rounded-sm" />
            <span>75-90%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="bg-brand-alert-red h-2.5 w-2.5 rounded-sm" />
            <span>&gt;90%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="bg-muted h-2.5 w-2.5 rounded-sm" />
            <span>Remaining</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
