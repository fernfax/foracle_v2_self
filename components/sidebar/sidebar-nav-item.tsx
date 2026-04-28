"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LucideIcon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SubItem {
  href: string;
  label: string;
  icon?: LucideIcon;
}

interface SidebarNavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Legacy prop kept for backwards-compat; ignored in current design. */
  bgColor?: string;
  /** Legacy prop kept for backwards-compat; ignored in current design. */
  iconColor?: string;
  isExpanded: boolean;
  subItems?: SubItem[];
  isSubmenuOpen?: boolean;
  onToggleSubmenu?: () => void;
  comingSoon?: boolean;
}

/**
 * Sidebar item — see /design_guide/design_guide.md §10.8.
 *
 * Performance notes:
 * - Single render tree across expanded/collapsed states (no remount on toggle).
 * - Tooltip stays mounted; suppressed via `open={false}` when expanded.
 * - Label and chevron animate via opacity + transform only (GPU-friendly).
 * - Submenu DOM stays mounted across toggles; visibility gated via classes.
 */
export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  isExpanded,
  subItems,
  isSubmenuOpen = false,
  onToggleSubmenu,
  comingSoon = false,
}: SidebarNavItemProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActive = pathname === href;
  const currentTab = searchParams.get("tab");

  const getSubItemActive = (subHref: string) => {
    const url = new URL(subHref, "http://localhost");
    const subTab = url.searchParams.get("tab");
    return pathname === url.pathname && currentTab === subTab;
  };

  const hasSubItems = subItems && subItems.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    if (hasSubItems && onToggleSubmenu) {
      e.preventDefault();
      onToggleSubmenu();
    }
  };

  const itemBaseClasses = cn(
    "group flex items-center rounded-md py-2 px-2 gap-3 font-display text-sm transition-colors duration-150 overflow-hidden",
    isActive
      ? "bg-[#B8622A] text-[#FBF7F1] shadow-sm shadow-[#B8622A]/20"
      : "text-[rgba(240,235,224,0.55)] hover:bg-[#2C3E3D] hover:text-[#F0EBE0]"
  );

  const iconClasses = cn(
    "h-[18px] w-[18px] flex-shrink-0 transition-colors",
    isActive ? "text-[#FBF7F1]" : "text-[rgba(240,235,224,0.55)] group-hover:text-[#F0EBE0]"
  );

  const trigger = (
    <Link
      href={href}
      onClick={handleClick}
      className={itemBaseClasses}
      aria-label={label}
    >
      <Icon className={iconClasses} />

      <span
        className={cn(
          "font-medium whitespace-nowrap flex-1 flex items-center gap-2 transition-[opacity,transform] duration-200",
          isExpanded
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-1 pointer-events-none"
        )}
      >
        {label}
        {comingSoon && (
          <span className="font-display text-[10px] px-1.5 py-0.5 rounded-xs bg-[rgba(212,168,67,0.18)] text-[#D4A843] font-semibold uppercase tracking-wider">
            Soon
          </span>
        )}
      </span>

      {hasSubItems && (
        <ChevronRight
          className={cn(
            "h-4 w-4 transition-[transform,opacity] duration-200 flex-shrink-0",
            isExpanded ? "opacity-60" : "opacity-0",
            isSubmenuOpen ? "rotate-90" : ""
          )}
        />
      )}
    </Link>
  );

  return (
    <div className="relative">
      <TooltipProvider delayDuration={0} disableHoverableContent={isExpanded}>
        <Tooltip open={isExpanded ? false : undefined}>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            <p className="flex items-center gap-2">
              {label}
              {comingSoon && (
                <span className="font-display text-[10px] px-1.5 py-0.5 rounded-xs bg-[rgba(212,168,67,0.18)] text-[#D4A843] font-semibold uppercase tracking-wider">
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
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            isExpanded && isSubmenuOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0 pointer-events-none"
          )}
          aria-hidden={!(isExpanded && isSubmenuOpen)}
        >
          <div className="overflow-hidden">
            <div className="pl-9 mt-1 space-y-0.5 border-l border-[rgba(240,235,224,0.08)] ml-4">
              {subItems.map((subItem) => {
                const isSubActive = getSubItemActive(subItem.href);
                const SubIcon = subItem.icon;
                return (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 font-display text-[13px] rounded-sm transition-colors duration-150",
                      isSubActive
                        ? "bg-[rgba(184,98,42,0.15)] text-[#D4845A] font-medium"
                        : "text-[rgba(240,235,224,0.50)] hover:bg-[#2C3E3D] hover:text-[#F0EBE0]"
                    )}
                    tabIndex={isExpanded && isSubmenuOpen ? 0 : -1}
                  >
                    {SubIcon && <SubIcon className="h-4 w-4" />}
                    {subItem.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
