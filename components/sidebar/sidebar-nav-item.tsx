"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarNavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Legacy prop kept for backwards-compat; ignored in current design. */
  bgColor?: string;
  /** Legacy prop kept for backwards-compat; ignored in current design. */
  iconColor?: string;
  isExpanded: boolean;
  comingSoon?: boolean;
}

/**
 * Sidebar item — see /design_guide/design_guide.md §10.8.
 *
 * Light-mode integrated chrome (post-D2/D10): item sits on a cream sidebar
 * with backdrop-blur. Active state uses bg-muted + a 2px terracotta left
 * indicator. Sub-route navigation lives in page tabs now, not the sidebar
 * (D8) — this component is single-row only.
 */
export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  isExpanded,
  comingSoon = false,
}: SidebarNavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  const itemBaseClasses = cn(
    "group relative flex items-center rounded-md py-2 px-2 gap-3 font-display text-sm transition-colors duration-150 overflow-hidden",
    "outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    isActive
      ? "bg-muted text-foreground font-medium"
      : "text-foreground/70 hover:bg-muted/60 hover:text-foreground"
  );

  const iconClasses = cn(
    "h-[18px] w-[18px] flex-shrink-0 transition-colors",
    isActive ? "text-foreground" : "text-foreground/55 group-hover:text-foreground"
  );

  const trigger = (
    <Link href={href} className={itemBaseClasses} aria-label={label}>
      {/* Active indicator — 2px terracotta bar on the left edge */}
      {isActive && (
        <span
          aria-hidden
          className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-primary"
        />
      )}
      <Icon className={iconClasses} />

      <span
        className={cn(
          "font-medium whitespace-nowrap flex-1 flex items-center gap-2 transition-[opacity,transform] duration-200 motion-reduce:transition-none",
          isExpanded
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-1 pointer-events-none"
        )}
      >
        {label}
        {comingSoon && (
          <span className="font-display text-[10px] px-1.5 py-0.5 rounded-xs bg-[rgba(212,168,67,0.22)] text-[#7A5A00] font-semibold uppercase tracking-wider">
            Soon
          </span>
        )}
      </span>
    </Link>
  );

  return (
    <TooltipProvider delayDuration={0} disableHoverableContent={isExpanded}>
      <Tooltip open={isExpanded ? false : undefined}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          <p className="flex items-center gap-2">
            {label}
            {comingSoon && (
              <span className="font-display text-[10px] px-1.5 py-0.5 rounded-xs bg-[rgba(212,168,67,0.22)] text-[#7A5A00] font-semibold uppercase tracking-wider">
                Soon
              </span>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
