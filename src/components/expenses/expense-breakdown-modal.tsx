"use client"

import React, { useMemo, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Cell, Pie, PieChart, Tooltip } from "recharts"

import { getCategoryColor } from "@/lib/finance/expense-calculator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { ResponsiveChart } from "@/components/ui/responsive-chart"

interface Expense {
  id: string
  name: string
  category: string
  amount: string
  frequency: string
  customMonths?: string | null
  startDate: string | null
  endDate: string | null
  description?: string | null
  isActive: boolean | null
}

interface ExpenseBreakdownModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expenses: Expense[]
  currentMonthTotal: number
  selectedMonth: Date
}

export function ExpenseBreakdownModal({
  open,
  onOpenChange,
  expenses,
  currentMonthTotal,
  selectedMonth
}: ExpenseBreakdownModalProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  )

  // Calculate breakdown details
  const breakdownDetails = useMemo(() => {
    const selectedYear = selectedMonth.getFullYear()
    const selectedMonthNum = selectedMonth.getMonth() + 1

    // For date comparisons, create start/end of selected month
    const monthStart = new Date(selectedYear, selectedMonth.getMonth(), 1)
    const monthEnd = new Date(selectedYear, selectedMonth.getMonth() + 1, 0)

    const categoryBreakdown: Record<
      string,
      { amount: number; count: number; expenses: Expense[] }
    > = {}
    let totalMonthlyExpenses = 0
    let activeExpensesCount = 0

    // Only include monthly, custom (if selected month matches), and one-time (if in selected month)
    // This matches the calculation in expense-list.tsx and getDashboardMetrics
    expenses.forEach((expense) => {
      if (!expense.isActive) return

      const amount = parseFloat(expense.amount)
      // For recurring expenses (current-recurring), startDate may be null - treat as always valid
      const startDate = expense.startDate ? new Date(expense.startDate) : null
      const endDate = expense.endDate ? new Date(expense.endDate) : null

      // Check if expense is valid for selected month (skip check if no startDate - always valid)
      if (startDate && startDate > monthEnd) return
      // Expense must not have ended before selected month started
      if (endDate && endDate < monthStart) return

      let appliesThisMonth = false
      const frequency = expense.frequency.toLowerCase()

      if (frequency === "monthly") {
        appliesThisMonth = true
      } else if (frequency === "custom" && expense.customMonths) {
        try {
          const customMonths = JSON.parse(expense.customMonths)
          appliesThisMonth = customMonths.includes(selectedMonthNum)
        } catch {
          appliesThisMonth = false
        }
      } else if (frequency === "one-time" && startDate) {
        const expenseMonth = startDate.getMonth() + 1
        const expenseYear = startDate.getFullYear()
        appliesThisMonth =
          expenseMonth === selectedMonthNum && expenseYear === selectedYear
      }

      if (appliesThisMonth) {
        totalMonthlyExpenses += amount
        activeExpensesCount += 1

        if (!categoryBreakdown[expense.category]) {
          categoryBreakdown[expense.category] = {
            amount: 0,
            count: 0,
            expenses: []
          }
        }
        categoryBreakdown[expense.category].amount += amount
        categoryBreakdown[expense.category].count += 1
        categoryBreakdown[expense.category].expenses.push(expense)
      }
    })

    // Convert category breakdown to sorted array
    const categoriesArray = Object.entries(categoryBreakdown)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage:
          totalMonthlyExpenses > 0
            ? (data.amount / totalMonthlyExpenses) * 100
            : 0,
        avgPerExpense: data.count > 0 ? data.amount / data.count : 0,
        color: getCategoryColor(category),
        expenses: data.expenses
      }))
      .sort((a, b) => b.amount - a.amount)

    const topCategory = categoriesArray[0] || null

    return {
      categories: categoriesArray,
      totalMonthlyExpenses,
      activeExpensesCount,
      topCategory
    }
  }, [expenses, selectedMonth])

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (expandedCategories.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  // Format month display
  const formatMonthDisplay = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Expense Breakdown - {formatMonthDisplay(selectedMonth)}
          </DialogTitle>
          <DialogDescription>
            Detailed breakdown of your expenses for{" "}
            {formatMonthDisplay(selectedMonth)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats Grid */}
          <div className="bg-muted/30 grid grid-cols-3 gap-4 rounded-lg p-4">
            <div>
              <p className="text-muted-foreground text-xs">
                Expected for {formatMonthDisplay(selectedMonth)}
              </p>
              <p className="text-2xl font-bold">
                ${currentMonthTotal.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Categories</p>
              <p className="text-2xl font-bold">
                {breakdownDetails.categories.length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Top Category</p>
              <p className="text-xl font-bold">
                {breakdownDetails.topCategory?.category || "N/A"}
              </p>
            </div>
          </div>

          {/* Detailed Breakdown */}
          {breakdownDetails.categories.length > 0 ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Left: Enhanced Category List with Individual Expenses */}
              <div className="max-h-[400px] space-y-2 overflow-y-auto pr-2">
                {breakdownDetails.categories.map((cat) => {
                  const isExpanded = expandedCategories.has(cat.category)

                  return (
                    <div
                      key={cat.category}
                      className="bg-background overflow-hidden rounded-lg border">
                      {/* Category Header - Clickable */}
                      <div
                        className="hover:bg-muted/50 cursor-pointer p-3 transition-colors"
                        onClick={() => toggleCategory(cat.category)}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="text-muted-foreground size-4 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="text-muted-foreground size-4 flex-shrink-0" />
                            )}
                            <div
                              className="size-3 flex-shrink-0 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="truncate text-sm font-semibold">
                              {cat.category}
                            </span>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-3">
                            <span className="text-sm font-bold">
                              ${cat.amount.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {cat.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="text-muted-foreground mt-2 ml-6 flex items-center gap-4 text-xs">
                          <span>
                            {cat.count} expense{cat.count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      {/* Individual Expenses - Expandable */}
                      {isExpanded && cat.expenses.length > 0 && (
                        <div className="bg-muted/20 border-t">
                          {cat.expenses.map((expense) => {
                            const displayAmount = parseFloat(expense.amount)

                            // Format frequency display
                            const getFrequencyDisplay = () => {
                              const frequency = expense.frequency.toLowerCase()
                              const capitalizedFrequency =
                                expense.frequency.charAt(0).toUpperCase() +
                                expense.frequency.slice(1).toLowerCase()

                              if (
                                frequency === "custom" &&
                                expense.customMonths
                              ) {
                                try {
                                  const customMonths = JSON.parse(
                                    expense.customMonths
                                  ) as number[]
                                  const monthNames = [
                                    "Jan",
                                    "Feb",
                                    "Mar",
                                    "Apr",
                                    "May",
                                    "Jun",
                                    "Jul",
                                    "Aug",
                                    "Sep",
                                    "Oct",
                                    "Nov",
                                    "Dec"
                                  ]
                                  const monthLabels = customMonths
                                    .sort((a, b) => a - b)
                                    .map((m) => monthNames[m - 1])
                                    .join(", ")
                                  return `Custom (${monthLabels})`
                                } catch {
                                  return capitalizedFrequency
                                }
                              }
                              return capitalizedFrequency
                            }

                            return (
                              <div
                                key={expense.id}
                                className="hover:bg-muted/30 border-b px-3 py-2 last:border-b-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate text-xs font-medium">
                                    {expense.name}
                                  </span>
                                  <span className="text-xs font-semibold">
                                    $
                                    {displayAmount.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}
                                  </span>
                                </div>
                                <div className="text-muted-foreground mt-0.5 text-xs">
                                  {getFrequencyDisplay()}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Right: Larger Interactive Pie Chart */}
              <div className="flex items-center justify-center">
                <ResponsiveChart width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={breakdownDetails.categories.map((cat) => ({
                        name: cat.category,
                        value: cat.amount,
                        color: cat.color,
                        percentage: cat.percentage,
                        count: cat.count,
                        avgPerExpense: cat.avgPerExpense
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({
                        cx,
                        cy,
                        midAngle,
                        innerRadius,
                        outerRadius,
                        percent
                      }) => {
                        if (
                          !percent ||
                          percent < 0.08 ||
                          midAngle === undefined ||
                          innerRadius === undefined ||
                          outerRadius === undefined ||
                          cx === undefined ||
                          cy === undefined
                        )
                          return null
                        const RADIAN = Math.PI / 180
                        const radius =
                          innerRadius + (outerRadius - innerRadius) * 0.5
                        const x = cx + radius * Math.cos(-midAngle * RADIAN)
                        const y = cy + radius * Math.sin(-midAngle * RADIAN)
                        return (
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="text-sm font-bold">
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        )
                      }}
                      outerRadius={140}
                      fill="#3A6B52"
                      dataKey="value">
                      {breakdownDetails.categories.map((cat, index) => (
                        <Cell key={`cell-${index}`} fill={cat.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-card border-border rounded-lg border p-3 shadow-lg">
                              <p className="text-foreground mb-2 text-sm font-bold">
                                {data.name}
                              </p>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">
                                    Total:
                                  </span>
                                  <span className="text-foreground font-semibold">
                                    ${data.value.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">
                                    Percentage:
                                  </span>
                                  <span className="text-foreground font-semibold">
                                    {data.percentage.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">
                                    Count:
                                  </span>
                                  <span className="text-foreground font-semibold">
                                    {data.count}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">
                                    Average:
                                  </span>
                                  <span className="text-foreground font-semibold">
                                    ${data.avgPerExpense.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </PieChart>
                </ResponsiveChart>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground py-8 text-center">
              No expenses found for the current month.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
