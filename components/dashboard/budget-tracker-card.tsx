"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getDefaultCategoryIcon, getCategoryIconColor, getCategoryBgColor } from "@/lib/budget-utils";
import * as LucideIcons from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface BudgetCategory {
  categoryName: string;
  categoryId: string | null;
  icon: string | null;
  monthlyBudget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
}

interface BudgetTrackerCardProps {
  budgetData: BudgetCategory[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getIconComponent(iconName: string | null, categoryName: string): LucideIcon {
  const name = iconName || getDefaultCategoryIcon(categoryName);

  // Convert kebab-case to PascalCase
  const pascalCase = name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (LucideIcons as any)[pascalCase] as LucideIcon | undefined;
  return IconComponent || LucideIcons.Circle;
}

function getProgressColor(percentUsed: number): string {
  if (percentUsed >= 100) return "bg-red-500";
  if (percentUsed >= 80) return "bg-amber-500";
  return "bg-emerald-500";
}

export function BudgetTrackerCard({ budgetData }: BudgetTrackerCardProps) {
  const hasCategories = budgetData.length > 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 pt-4 flex-shrink-0">
        <CardTitle className="text-lg sm:text-xl">Budget Tracker</CardTitle>
        <CardDescription className="mt-0.5 text-xs sm:text-sm">
          Monthly spending by category
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {hasCategories ? (
          <div className="space-y-4">
            {budgetData.map((category) => {
              const Icon = getIconComponent(category.icon, category.categoryName);
              const iconColor = getCategoryIconColor(category.categoryName);
              const bgColor = getCategoryBgColor(category.categoryName);
              const progressColor = getProgressColor(category.percentUsed);
              const isOverBudget = category.percentUsed >= 100;

              return (
                <div key={category.categoryId || category.categoryName} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("flex items-center justify-center w-6 h-6 rounded-md", bgColor)}>
                        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
                      </div>
                      <span className="text-sm font-medium truncate max-w-[100px]">
                        {category.categoryName}
                      </span>
                    </div>
                    <span className={cn(
                      "text-xs font-medium",
                      isOverBudget ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {Math.round(category.percentUsed)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", progressColor)}
                      style={{ width: `${Math.min(category.percentUsed, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(category.spent)} spent</span>
                    <span>of {formatCurrency(category.monthlyBudget)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <LucideIcons.PieChart className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No categories tracked</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Set up your budget to track spending
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
