"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import * as LucideIcons from "lucide-react"

import type { ExpenseCategory } from "@/lib/actions/expense-categories"
import {
  getCategoryIconColor,
  getDefaultCategoryIcon
} from "@/lib/budget-utils"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

interface CategorySelectorProps {
  categories: ExpenseCategory[]
  selectedCategory: ExpenseCategory | null
  onSelect: (category: ExpenseCategory) => void
}

const RECENT_CATEGORIES_KEY = "foracle_recent_expense_category_ids"
const MAX_RECENTS = 3

function readRecents(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(RECENT_CATEGORIES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((id) => typeof id === "string")
      : []
  } catch {
    return []
  }
}

function writeRecents(ids: string[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(RECENT_CATEGORIES_KEY, JSON.stringify(ids))
  } catch {
    // localStorage can throw in private mode; recents are best-effort.
  }
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

export function CategorySelector({
  categories,
  selectedCategory,
  onSelect
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false)
  const [recentIds, setRecentIds] = useState<string[]>([])

  useEffect(() => {
    setRecentIds(readRecents())
  }, [])

  const SelectedIcon = selectedCategory
    ? getIconComponent(selectedCategory.icon, selectedCategory.name)
    : null
  const selectedIconColor = selectedCategory
    ? getCategoryIconColor(selectedCategory.name)
    : ""

  const { recentCategories, otherCategories } = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]))
    const recents = recentIds
      .map((id) => byId.get(id))
      .filter((c): c is ExpenseCategory => Boolean(c))
      .slice(0, MAX_RECENTS)
    const recentIdSet = new Set(recents.map((c) => c.id))
    const others = categories.filter((c) => !recentIdSet.has(c.id))
    return { recentCategories: recents, otherCategories: others }
  }, [categories, recentIds])

  const handleSelect = (category: ExpenseCategory) => {
    onSelect(category)
    setOpen(false)
    const next = [
      category.id,
      ...recentIds.filter((id) => id !== category.id)
    ].slice(0, MAX_RECENTS)
    setRecentIds(next)
    writeRecents(next)
  }

  const renderItem = (category: ExpenseCategory) => {
    const Icon = getIconComponent(category.icon, category.name)
    const iconColor = getCategoryIconColor(category.name)
    return (
      <DropdownMenuItem
        key={category.id}
        onClick={() => handleSelect(category)}
        className="flex cursor-pointer items-center gap-2">
        <Icon className={cn("h-4 w-4 shrink-0", iconColor)} />
        <span className="truncate">{category.name}</span>
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground flex touch-manipulation items-center gap-2">
          {selectedCategory ? (
            <>
              {SelectedIcon && (
                <SelectedIcon className={cn("h-4 w-4", selectedIconColor)} />
              )}
              <span>{selectedCategory.name}</span>
            </>
          ) : (
            <span>Please Select</span>
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="max-h-[320px] w-72 overflow-y-auto">
        {recentCategories.length > 0 && (
          <>
            <DropdownMenuLabel className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Recents
            </DropdownMenuLabel>
            {recentCategories.map(renderItem)}
            {otherCategories.length > 0 && <DropdownMenuSeparator />}
          </>
        )}
        {otherCategories.map(renderItem)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { getIconComponent }
