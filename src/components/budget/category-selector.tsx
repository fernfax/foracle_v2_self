"use client"

import {
  createElement,
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore
} from "react"
import type { ExpenseCategory } from "@/actions/expense-categories"
import { ChevronDown } from "lucide-react"
import * as LucideIcons from "lucide-react"

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

// Recents are read through a tiny external store so the component can subscribe
// via useSyncExternalStore — server snapshot is the stable empty array, the
// client snapshot is the localStorage value — instead of a set-state-in-effect.
// getSnapshot must return a stable reference between reads, so we cache the
// parsed array and only rebuild it when the raw string actually changes.
const EMPTY_RECENTS: string[] = []
let cachedRaw: string | null = null
let cachedRecents: string[] = EMPTY_RECENTS
const recentsListeners = new Set<() => void>()

function readRecents(): string[] {
  if (typeof window === "undefined") return EMPTY_RECENTS
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(RECENT_CATEGORIES_KEY)
  } catch {
    return EMPTY_RECENTS
  }
  if (raw === cachedRaw) return cachedRecents
  cachedRaw = raw
  try {
    const parsed = raw ? JSON.parse(raw) : []
    cachedRecents = Array.isArray(parsed)
      ? parsed.filter((id) => typeof id === "string")
      : EMPTY_RECENTS
  } catch {
    cachedRecents = EMPTY_RECENTS
  }
  return cachedRecents
}

function subscribeRecents(listener: () => void) {
  recentsListeners.add(listener)
  return () => recentsListeners.delete(listener)
}

function writeRecents(ids: string[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(RECENT_CATEGORIES_KEY, JSON.stringify(ids))
  } catch {
    // localStorage can throw in private mode; recents are best-effort.
  }
  // Update the cache eagerly and notify subscribers so the UI reflects the new
  // recents without round-tripping through localStorage.
  cachedRaw = JSON.stringify(ids)
  cachedRecents = [...ids]
  recentsListeners.forEach((l) => l())
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

// Renders the Lucide icon for a category. Hoisted to module scope (rather than
// resolving a capitalized component variable inside render) so it's a stable
// component identity, not one "created during render".
function CategoryIcon({
  iconName,
  categoryName,
  className
}: {
  iconName: string | null
  categoryName: string
  className?: string
}) {
  // getIconComponent returns an existing Lucide component from a lookup table —
  // it never creates one. Use createElement so the looked-up component isn't
  // treated as a component freshly declared during render.
  return createElement(getIconComponent(iconName, categoryName), { className })
}

export function CategorySelector({
  categories,
  selectedCategory,
  onSelect
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false)
  const recentIds = useSyncExternalStore(
    subscribeRecents,
    readRecents,
    () => EMPTY_RECENTS
  )

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

  const handleSelect = useCallback(
    (category: ExpenseCategory) => {
      onSelect(category)
      setOpen(false)
      const next = [
        category.id,
        ...recentIds.filter((id) => id !== category.id)
      ].slice(0, MAX_RECENTS)
      // writeRecents updates the store + notifies, which re-renders us with the
      // fresh recents — no separate setState needed.
      writeRecents(next)
    },
    [onSelect, recentIds]
  )

  const renderItem = (category: ExpenseCategory) => {
    const iconColor = getCategoryIconColor(category.name)
    return (
      <DropdownMenuItem
        key={category.id}
        onClick={() => handleSelect(category)}
        className="flex items-center gap-2">
        <CategoryIcon
          iconName={category.icon}
          categoryName={category.name}
          className={cn("h-4 w-4 shrink-0", iconColor)}
        />
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
              <CategoryIcon
                iconName={selectedCategory.icon}
                categoryName={selectedCategory.name}
                className={cn("h-4 w-4", selectedIconColor)}
              />
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
