"use client"

import * as LucideIcons from "lucide-react"
import { LucideIcon } from "lucide-react"

import {
  getCategoryBgColor,
  getCategoryIconColor,
  getDefaultCategoryIcon
} from "@/lib/finance/budget-utils"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"

export interface BudgetCategory {
  categoryName: string
  categoryId: string | null
  icon: string | null
  monthlyBudget: number
  spent: number
  remaining: number
  percentUsed: number
}

interface BudgetTrackerCardProps {
  budgetData: BudgetCategory[]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function getIconComponent(
  iconName: string | null,
  categoryName: string
): LucideIcon {
  const name = iconName || getDefaultCategoryIcon(categoryName)

  // Convert kebab-case to PascalCase
  const pascalCase = name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (LucideIcons as any)[pascalCase] as
    | LucideIcon
    | undefined
  return IconComponent || LucideIcons.Circle
}

function getProgressColor(percentUsed: number): string {
  if (percentUsed >= 100) return "bg-brand-alert-red"
  if (percentUsed >= 80) return "bg-brand-gold"
  return "bg-brand-teal"
}

export function DashboardBudgetTrackerCard({
  budgetData
}: BudgetTrackerCardProps) {
  const hasCategories = budgetData.length > 0

  // Calculate totals
  const totalSpent = budgetData.reduce((sum, cat) => sum + cat.spent, 0)
  const totalBudget = budgetData.reduce(
    (sum, cat) => sum + cat.monthlyBudget,
    0
  )
  const overallPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
  const overallProgressColor = getProgressColor(overallPercent)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-shrink-0 pt-4 pb-2">
        <CardTitle className="text-2xl font-black sm:text-3xl">
          Budget Tracker
        </CardTitle>
        <CardDescription className="mt-0.5 text-xs sm:text-sm">
          Monthly spending by category
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {hasCategories ? (
          <div className="space-y-4">
            {/* Overall Summary */}
            <div className="border-border border-b pb-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-semibold">Overall</span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    overallPercent >= 100
                      ? "text-on-danger"
                      : "text-muted-foreground"
                  )}>
                  {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}
                </span>
              </div>
              <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    overallProgressColor
                  )}
                  style={{ width: `${Math.min(overallPercent, 100)}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-1 text-right text-xs">
                {Math.round(overallPercent)}% used
              </p>
            </div>
            {budgetData.map((category) => {
              const Icon = getIconComponent(
                category.icon,
                category.categoryName
              )
              const iconColor = getCategoryIconColor(category.categoryName)
              const bgColor = getCategoryBgColor(category.categoryName)
              const progressColor = getProgressColor(category.percentUsed)
              const isOverBudget = category.percentUsed >= 100

              return (
                <div
                  key={category.categoryId || category.categoryName}
                  className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex size-6 items-center justify-center rounded-md",
                          bgColor
                        )}>
                        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
                      </div>
                      <span className="max-w-[100px] truncate text-sm font-medium">
                        {category.categoryName}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isOverBudget
                          ? "text-on-danger"
                          : "text-muted-foreground"
                      )}>
                      {Math.round(category.percentUsed)}%
                    </span>
                  </div>
                  <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        progressColor
                      )}
                      style={{
                        width: `${Math.min(category.percentUsed, 100)}%`
                      }}
                    />
                  </div>
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>{formatCurrency(category.spent)} spent</span>
                    <span>of {formatCurrency(category.monthlyBudget)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <LucideIcons.PieChart className="text-muted-foreground/50 mb-3 size-10" />
            <p className="text-muted-foreground text-sm">
              No categories tracked
            </p>
            <p className="text-muted-foreground/70 mt-1 text-xs">
              Set up your budget to track spending
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
