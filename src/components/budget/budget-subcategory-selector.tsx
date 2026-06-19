"use client"

import type { ExpenseSubcategory } from "@/actions/expense-subcategories"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SubcategorySelectorProps {
  subcategories: ExpenseSubcategory[]
  selectedSubcategory: ExpenseSubcategory | null
  onSelect: (subcategory: ExpenseSubcategory | null) => void
  onManageClick: () => void
  disabled?: boolean
}

export function SubcategorySelector({
  subcategories,
  selectedSubcategory,
  onSelect,
  onManageClick,
  disabled = false
}: SubcategorySelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Add/Manage button - always first */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 rounded-full px-3 text-xs"
        onClick={onManageClick}
        disabled={disabled}>
        <Plus className="h-3 w-3" />
        Add
      </Button>

      {/* Existing subcategories as pill buttons */}
      {subcategories.map((subcategory) => {
        const isSelected = selectedSubcategory?.id === subcategory.id

        return (
          <Button
            key={subcategory.id}
            type="button"
            variant={isSelected ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 rounded-full px-3 text-xs",
              isSelected
                ? "bg-primary hover:bg-primary text-primary-foreground"
                : "bg-muted/50"
            )}
            onClick={() => {
              // Toggle selection - click to select, click again to deselect
              if (isSelected) {
                onSelect(null)
              } else {
                onSelect(subcategory)
              }
            }}
            disabled={disabled}>
            {subcategory.name}
          </Button>
        )
      })}
    </div>
  )
}
