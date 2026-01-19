"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExpenseSubcategory } from "@/lib/actions/expense-subcategories";

interface SubcategorySelectorProps {
  subcategories: ExpenseSubcategory[];
  selectedSubcategory: ExpenseSubcategory | null;
  onSelect: (subcategory: ExpenseSubcategory | null) => void;
  onManageClick: () => void;
  disabled?: boolean;
}

export function SubcategorySelector({
  subcategories,
  selectedSubcategory,
  onSelect,
  onManageClick,
  disabled = false,
}: SubcategorySelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Add/Manage button - always first */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full h-8 px-3 text-xs gap-1"
        onClick={onManageClick}
        disabled={disabled}
      >
        <Plus className="h-3 w-3" />
        Add
      </Button>

      {/* Existing subcategories as pill buttons */}
      {subcategories.map((subcategory) => {
        const isSelected = selectedSubcategory?.id === subcategory.id;

        return (
          <Button
            key={subcategory.id}
            type="button"
            variant={isSelected ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-full h-8 px-3 text-xs",
              isSelected
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-muted/50"
            )}
            onClick={() => {
              // Only allow selecting, not deselecting by clicking same button
              if (!isSelected) {
                onSelect(subcategory);
              }
            }}
            disabled={disabled}
          >
            {subcategory.name}
          </Button>
        );
      })}
    </div>
  );
}
