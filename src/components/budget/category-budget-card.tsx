"use client"

import { createElement } from "react"
import * as LucideIcons from "lucide-react"

import {
  getCategoryBgColor,
  getCategoryIconColor,
  getDefaultCategoryIcon
} from "@/lib/budget-utils"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

interface CategoryBudgetCardProps {
  categoryName: string
  icon: string | null
  spent: number
  budget: number
  onClick?: () => void
}

// Helper to get Lucide icon component by name
function getIconComponent(iconName: string | null, categoryName: string) {
  const name = iconName || getDefaultCategoryIcon(categoryName)
  // Convert kebab-case to PascalCase
  const pascalCase = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")

  const IconComponent = (
    LucideIcons as unknown as Record<
      string,
      React.ComponentType<{ className?: string }>
    >
  )[pascalCase]
  return IconComponent || LucideIcons.CircleDollarSign
}

// Resolve + render the category's icon in a module-scope component. We resolve
// the Lucide component (a value, not a freshly-defined component) and render it
// via createElement, so we never create a component during render
// (react-hooks/static-components).
function CategoryIcon({
  iconName,
  categoryName,
  className
}: {
  iconName: string | null
  categoryName: string
  className?: string
}) {
  return createElement(getIconComponent(iconName, categoryName), { className })
}

export function CategoryBudgetCard({
  categoryName,
  icon,
  spent,
  budget,
  onClick
}: CategoryBudgetCardProps) {
  const percentUsed = budget > 0 ? (spent / budget) * 100 : 0
  const bgColor = getCategoryBgColor(categoryName)
  const iconColor = getCategoryIconColor(categoryName)

  return (
    <Card
      className={cn(
        "flex cursor-pointer flex-col items-center p-4 text-center transition-shadow hover:shadow-md",
        onClick && "hover:bg-muted/50"
      )}
      onClick={onClick}>
      {/* Category Name */}
      <span className="text-muted-foreground mb-2 line-clamp-1 text-sm font-medium">
        {categoryName}
      </span>

      {/* Icon */}
      <div
        className={cn(
          "mb-3 flex h-12 w-12 items-center justify-center rounded-full",
          bgColor
        )}>
        <CategoryIcon
          iconName={icon}
          categoryName={categoryName}
          className={cn("h-6 w-6", iconColor)}
        />
      </div>

      {/* Spent / Budget */}
      <div className="mb-2 text-sm font-semibold">
        <span
          className={cn(
            percentUsed > 90
              ? "text-destructive"
              : percentUsed > 75
                ? "text-on-warning"
                : "text-foreground"
          )}>
          $
          {spent.toLocaleString("en-SG", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}
        </span>
        <span className="text-muted-foreground">
          /$
          {budget.toLocaleString("en-SG", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="bg-muted mt-1 h-2 w-full overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            percentUsed > 90
              ? "bg-brand-alert-red"
              : percentUsed > 75
                ? "bg-brand-gold"
                : "bg-brand-terracotta"
          )}
          style={{ width: `${Math.max(Math.min(percentUsed, 100), 0)}%` }}
        />
      </div>
    </Card>
  )
}
