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
  bgColor: string;
  iconColor: string;
  isExpanded: boolean;
}

export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  bgColor,
  iconColor,
  isExpanded,
}: SidebarNavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  const linkContent = (
    <Link
      href={href}
      className={cn(
        "group flex items-center rounded-xl transition-all duration-200 py-1.5",
        isExpanded ? "gap-3 px-3" : "px-1.5 justify-center",
        isActive
          ? "bg-[#387DF5] text-white shadow-lg shadow-blue-200/50"
          : "text-slate-600 hover:bg-slate-100"
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
          "font-medium text-sm whitespace-nowrap transition-all duration-300",
          isExpanded
            ? "opacity-100 translate-x-0"
            : "opacity-0 w-0 -translate-x-2 overflow-hidden"
        )}
      >
        {label}
      </span>
    </Link>
  );

  // Show tooltip when collapsed
  if (!isExpanded) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return linkContent;
}
