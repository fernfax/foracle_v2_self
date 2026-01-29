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
  bgColor: string;
  iconColor: string;
  isExpanded: boolean;
  subItems?: SubItem[];
  isSubmenuOpen?: boolean;
  onToggleSubmenu?: () => void;
  comingSoon?: boolean;
}

export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  bgColor,
  iconColor,
  isExpanded,
  subItems,
  isSubmenuOpen = false,
  onToggleSubmenu,
  comingSoon = false,
}: SidebarNavItemProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Check if this nav item is active (exact match only for parent items)
  const isActive = pathname === href;
  const currentTab = searchParams.get("tab");

  // Check which subitem is active
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

  const linkContent = (
    <div className="relative">
      <Link
        href={href}
        onClick={handleClick}
        className={cn(
          "group flex items-center rounded-xl transition-all duration-200 py-1.5 px-1.5 gap-3",
          isActive
            ? "bg-[#4E47DD] text-white"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        )}
      >
        {/* Icon container */}
        <div
          className={cn(
            "flex-shrink-0 p-2 rounded-lg transition-colors flex items-center justify-center",
            isActive ? "bg-white/20" : bgColor
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5 transition-colors",
              isActive ? "text-white" : iconColor
            )}
          />
        </div>

        {/* Label - animated visibility */}
        <span
          className={cn(
            "font-medium text-sm whitespace-nowrap transition-all duration-300 flex-1 flex items-center gap-2",
            isExpanded
              ? "opacity-100 translate-x-0"
              : "opacity-0 w-0 -translate-x-2 overflow-hidden"
          )}
        >
          {label}
          {comingSoon && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
              Soon
            </span>
          )}
        </span>

        {/* Chevron for items with subitems */}
        {hasSubItems && isExpanded && (
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isSubmenuOpen ? "rotate-90" : ""
            )}
          />
        )}
      </Link>

      {/* Submenu - animated expand/collapse */}
      {hasSubItems && isExpanded && (
        <div
          className={cn(
            "grid transition-all duration-300 ease-in-out",
            isSubmenuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <div className="pl-12 mt-1 space-y-0.5">
              {subItems.map((subItem, index) => {
                const isSubActive = getSubItemActive(subItem.href);
                const SubIcon = subItem.icon;
                return (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all duration-200",
                      isSubActive
                        ? "bg-slate-800 text-[#4E47DD] font-medium"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white",
                      isSubmenuOpen
                        ? "translate-x-0 opacity-100"
                        : "-translate-x-2 opacity-0"
                    )}
                    style={{
                      transitionDelay: isSubmenuOpen ? `${index * 50}ms` : "0ms",
                    }}
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

  // Show tooltip when collapsed
  if (!isExpanded) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={href}
              className={cn(
                "group flex items-center justify-center rounded-xl transition-all duration-200 py-1.5 px-1.5",
                isActive
                  ? "bg-[#4E47DD] text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <div
                className={cn(
                  "flex-shrink-0 p-2 rounded-lg transition-colors flex items-center justify-center",
                  isActive ? "bg-white/20" : bgColor
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-white" : iconColor
                  )}
                />
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            <p className="flex items-center gap-2">
              {label}
              {comingSoon && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  Soon
                </span>
              )}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return linkContent;
}
