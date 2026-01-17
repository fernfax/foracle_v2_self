"use client";

import { Card } from "@/components/ui/card";
import { getDefaultCategoryIcon, formatBudgetCurrency, getCategoryBgColor, getCategoryIconColor } from "@/lib/budget-utils";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryBudgetCardProps {
  categoryName: string;
  icon: string | null;
  spent: number;
  budget: number;
  onClick?: () => void;
}

// Helper to get Lucide icon component by name
function getIconComponent(iconName: string | null, categoryName: string) {
  const name = iconName || getDefaultCategoryIcon(categoryName);
  // Convert kebab-case to PascalCase
  const pascalCase = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[pascalCase];
  return IconComponent || LucideIcons.CircleDollarSign;
}


export function CategoryBudgetCard({
  categoryName,
  icon,
  spent,
  budget,
  onClick,
}: CategoryBudgetCardProps) {
  const Icon = getIconComponent(icon, categoryName);
  const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;
  const bgColor = getCategoryBgColor(categoryName);
  const iconColor = getCategoryIconColor(categoryName);

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer hover:shadow-md transition-shadow flex flex-col items-center text-center",
        onClick && "hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      {/* Category Name */}
      <span className="text-sm font-medium text-muted-foreground mb-2 line-clamp-1">
        {categoryName}
      </span>

      {/* Icon */}
      <div
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center mb-3",
          bgColor
        )}
      >
        <Icon className={cn("h-6 w-6", iconColor)} />
      </div>

      {/* Spent / Budget */}
      <div className="text-sm font-semibold">
        <span
          className={cn(
            percentUsed > 90
              ? "text-destructive"
              : percentUsed > 75
              ? "text-yellow-600"
              : "text-foreground"
          )}
        >
          ${spent.toLocaleString("en-SG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
        <span className="text-muted-foreground">
          /${budget.toLocaleString("en-SG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      </div>
    </Card>
  );
}
