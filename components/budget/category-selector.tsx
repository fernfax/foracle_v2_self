"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { getDefaultCategoryIcon, getCategoryIconColor } from "@/lib/budget-utils";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExpenseCategory } from "@/lib/actions/expense-categories";

interface CategorySelectorProps {
  categories: ExpenseCategory[];
  selectedCategory: ExpenseCategory | null;
  onSelect: (category: ExpenseCategory) => void;
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

export function CategorySelector({
  categories,
  selectedCategory,
  onSelect,
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false);

  const SelectedIcon = selectedCategory
    ? getIconComponent(selectedCategory.icon, selectedCategory.name)
    : null;
  const selectedIconColor = selectedCategory
    ? getCategoryIconColor(selectedCategory.name)
    : "";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          {selectedCategory ? (
            <>
              {SelectedIcon && <SelectedIcon className={cn("h-4 w-4", selectedIconColor)} />}
              <span>{selectedCategory.name}</span>
            </>
          ) : (
            <span>Please Select</span>
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56 max-h-[300px] overflow-y-auto">
        {categories.map((category) => {
          const Icon = getIconComponent(category.icon, category.name);
          const iconColor = getCategoryIconColor(category.name);
          return (
            <DropdownMenuItem
              key={category.id}
              onClick={() => {
                onSelect(category);
                setOpen(false);
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Icon className={cn("h-4 w-4", iconColor)} />
              <span>{category.name}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { getIconComponent };
