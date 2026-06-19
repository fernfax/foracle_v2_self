"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"

interface SubItem {
  href: string
  label: string
  icon?: LucideIcon
}

interface SidebarNavItemProps {
  href: string
  label: string
  icon: LucideIcon
  /** Legacy prop kept for backwards-compat; ignored in current design. */
  bgColor?: string
  /** Legacy prop kept for backwards-compat; ignored in current design. */
  iconColor?: string
  isExpanded: boolean
  subItems?: SubItem[]
  isSubmenuOpen?: boolean
  onToggleSubmenu?: () => void
  comingSoon?: boolean
}

/**
 * Sidebar item — see /docs/design_guide/design_guide.md §10.8.
 *
 * Performance notes:
 * - Single render tree across expanded/collapsed states (no remount on toggle).
 * - Tooltip stays mounted; suppressed via `open={false}` when expanded.
 * - Label and chevron animate via opacity + transform only (GPU-friendly).
 * - Submenu DOM stays mounted across toggles; visibility gated via classes.
 */
export function NavigationSidebarItem({
  href,
  label,
  icon: Icon,
  isExpanded,
  subItems,
  isSubmenuOpen = false,
  onToggleSubmenu,
  comingSoon = false
}: SidebarNavItemProps) {
  const pathname = usePathname()

  // Path-based active state (routes, not ?tab=). A parent highlights for its
  // whole section (e.g. /user highlights on /user/incomes); a sub-item only on
  // its exact route.
  const isActive = pathname === href || pathname.startsWith(`${href}/`)
  const getSubItemActive = (subHref: string) => pathname === subHref

  const hasSubItems = subItems && subItems.length > 0

  // Stable id linking a parent disclosure button to its submenu (aria-controls).
  const submenuId = `sidebar-submenu-${href.replace(/[^a-zA-Z0-9]+/g, "-")}`

  const itemBaseClasses = cn(
    // pr-3 keeps the label/chevron off the pill's right edge (the left side is
    // spaced by the w-12 icon slot). Clipped away in the collapsed rail.
    "group flex w-full items-center rounded-md py-2 pr-3 font-display text-sm transition-colors duration-150 overflow-hidden",
    isActive
      ? "bg-brand-terracotta text-brand-warm-white shadow-sm shadow-brand-terracotta/20"
      : "text-brand-cream/[0.55] hover:bg-brand-forest-mid hover:text-brand-cream"
  )

  const iconClasses = cn(
    "h-[18px] w-[18px] flex-shrink-0 transition-colors",
    isActive
      ? "text-brand-warm-white"
      : "text-brand-cream/[0.55] group-hover:text-brand-cream"
  )

  const itemInner = (
    <>
      {/* Fixed-width leading slot (= collapsed rail inner width) centers every
          icon on the same x as the rail center, and aligns all labels. */}
      <span className="flex w-12 shrink-0 items-center justify-center">
        <Icon className={iconClasses} />
      </span>

      <span
        className={cn(
          "flex flex-1 items-center gap-2 font-medium whitespace-nowrap transition-[opacity,transform] duration-200",
          isExpanded
            ? "translate-x-0 opacity-100"
            : "pointer-events-none -translate-x-1 opacity-0"
        )}>
        {label}
        {comingSoon && (
          <span className="font-display bg-brand-gold/[0.18] text-brand-gold rounded-xs px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
            Soon
          </span>
        )}
      </span>

      {hasSubItems && (
        <ChevronRight
          className={cn(
            "h-4 w-4 flex-shrink-0 transition-[transform,opacity] duration-200",
            isExpanded ? "opacity-60" : "opacity-0",
            isSubmenuOpen ? "rotate-90" : ""
          )}
        />
      )}
    </>
  )

  // Parents with a submenu are disclosure BUTTONS — they only toggle the submenu
  // open, never navigate. Leaf items are navigation LINKS. (Previously parents
  // were Links that called preventDefault, which mis-announced as links and let
  // middle/⌘-click still open the page.)
  const trigger = hasSubItems ? (
    <button
      type="button"
      onClick={onToggleSubmenu}
      aria-expanded={isSubmenuOpen}
      aria-controls={submenuId}
      aria-label={label}
      className={itemBaseClasses}>
      {itemInner}
    </button>
  ) : (
    <Link href={href} className={itemBaseClasses} aria-label={label}>
      {itemInner}
    </Link>
  )

  return (
    <div className="relative">
      <TooltipProvider delayDuration={0} disableHoverableContent={isExpanded}>
        <Tooltip open={isExpanded ? false : undefined}>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            <p className="flex items-center gap-2">
              {label}
              {comingSoon && (
                <span className="font-display bg-brand-gold/[0.18] text-brand-gold rounded-xs px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
                  Soon
                </span>
              )}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/*
        Submenu — DOM stays mounted across sidebar toggles to avoid React reconciliation
        during the grid animation. Visibility gated via class only.
      */}
      {hasSubItems && (
        <div
          id={submenuId}
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            isExpanded && isSubmenuOpen
              ? "grid-rows-[1fr] opacity-100"
              : "pointer-events-none grid-rows-[0fr] opacity-0"
          )}
          aria-hidden={!(isExpanded && isSubmenuOpen)}>
          <div className="overflow-hidden">
            {/* ml-6 (24px) centers the guide line on the parent icon, which sits
                at the center of the w-12 leading slot (48px / 2 = 24px). pl-2 is a
                single indent step off the line; each row's own px-3 spaces the
                icon inside its hover pill. */}
            <div className="border-brand-cream/[0.08] mt-1 ml-6 space-y-0.5 border-l pl-3">
              {subItems.map((subItem) => {
                const isSubActive = getSubItemActive(subItem.href)
                const SubIcon = subItem.icon
                return (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    className={cn(
                      "font-display flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm transition-colors duration-150",
                      isSubActive
                        ? "bg-brand-terracotta/[0.15] text-brand-coral font-medium"
                        : "text-brand-cream/[0.5] hover:bg-brand-forest-mid hover:text-brand-cream"
                    )}
                    tabIndex={isExpanded && isSubmenuOpen ? 0 : -1}>
                    {SubIcon && <SubIcon className="h-[18px] w-[18px]" />}
                    {subItem.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
