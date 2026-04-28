"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser, UserButton } from "@clerk/nextjs";
import {
  Home,
  User,
  Wallet,
  TrendingUp,
  Shield,
  Target,
  Users,
  DollarSign,
  Building2,
  Briefcase,
  Receipt,
  PieChart,
  Home as PropertyIcon,
  Car,
  Package,
  Calculator,
  PanelLeftClose,
  PanelLeft,
  LineChart,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SidebarNavItem } from "./sidebar-nav-item";
import { useSidebar } from "./sidebar-context";

const mainNavItems = [
  { href: "/overview", label: "Overview", icon: Home },
  {
    href: "/user",
    label: "User Homepage",
    icon: User,
    subItems: [
      { href: "/user?tab=family", label: "Family", icon: Users },
      { href: "/user?tab=incomes", label: "Incomes", icon: DollarSign },
      { href: "/user?tab=cpf", label: "CPF", icon: Building2 },
      { href: "/user?tab=current", label: "Holdings", icon: Briefcase },
    ],
  },
  {
    href: "/expenses",
    label: "Expenses",
    icon: Wallet,
    subItems: [
      { href: "/expenses?tab=expenses", label: "Expenses", icon: Receipt },
      { href: "/expenses?tab=graph", label: "Graph", icon: TrendingUp },
      { href: "/expenses?tab=reports", label: "Reports", icon: PieChart },
    ],
  },
  {
    href: "/assets",
    label: "Assets",
    icon: TrendingUp,
    subItems: [
      { href: "/assets?tab=property", label: "Property", icon: PropertyIcon },
      { href: "/assets?tab=vehicle", label: "Vehicle", icon: Car },
      { href: "/assets?tab=others", label: "Others", icon: Package },
    ],
  },
  { href: "/policies", label: "Insurance", icon: Shield },
  { href: "/investments", label: "Investments", icon: LineChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/budget", label: "Budget", icon: Calculator },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
];

export function Sidebar() {
  const { isPinned, setIsPinned, isHovered, setIsHovered, isExpanded } = useSidebar();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const { user, isLoaded } = useUser();

  const handleToggleSubmenu = (href: string) => {
    setOpenSubmenu(openSubmenu === href ? null : href);
  };

  return (
    <aside
      data-tour="sidebar-nav"
      className={cn(
        // Sticky participates in the parent CSS Grid; the grid column drives the visible width.
        "sticky top-0 h-screen w-full self-start overflow-hidden bg-[#1C2B2A] border-r border-[rgba(240,235,224,0.06)]",
        "flex flex-col z-50"
      )}
      onMouseEnter={() => !isPinned && setIsHovered(true)}
      onMouseLeave={() => !isPinned && setIsHovered(false)}
    >
      {/*
        Inner contents stay laid out at the full expanded width (260px) and are clipped
        by the aside's `overflow-hidden` when the grid column shrinks. This keeps icon
        positions stable, removes layout work during the transition, and avoids
        per-element width animation.
      */}
      <div className="flex flex-col w-[260px] h-full">
        {/* Logo lockup — both images mounted, swap via opacity to avoid mid-animation Image swap */}
        <div className="h-[70px] flex items-center flex-shrink-0 relative px-3">
          <Link
            href="/overview"
            className="relative flex items-center h-full w-full"
          >
            {/* Compact mark — visible when collapsed, sits at left edge of the 72px column */}
            <Image
              src="/logo-72.png"
              alt="Foracle"
              width={40}
              height={40}
              className={cn(
                "object-contain brightness-0 invert transition-opacity duration-200",
                isExpanded ? "opacity-0" : "opacity-95"
              )}
              priority
            />
            {/* Wordmark — overlays the compact mark when expanded */}
            <Image
              src="/wordmark-400.png"
              alt="Foracle"
              width={112}
              height={32}
              className={cn(
                "object-contain brightness-0 invert absolute left-2 top-1/2 -translate-y-1/2 transition-opacity duration-200",
                isExpanded ? "opacity-95" : "opacity-0 pointer-events-none"
              )}
              priority
            />
          </Link>
        </div>

        {/* Navigation — overflow-x-hidden prevents label overflow from creating horizontal scroll */}
        <nav className="flex-1 pt-6 sm:pt-8 pb-4 space-y-0.5 overflow-y-auto overflow-x-hidden px-3">
          {mainNavItems.map((item) => (
            <SidebarNavItem
              key={item.href}
              {...item}
              isExpanded={isExpanded}
              isSubmenuOpen={openSubmenu === item.href}
              onToggleSubmenu={() => handleToggleSubmenu(item.href)}
            />
          ))}
        </nav>

        {/* Bottom section — pin toggle + user profile */}
        <div className="flex-shrink-0 border-t border-[rgba(240,235,224,0.06)]">
          <div className="py-2 px-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPinned(!isPinned)}
              className="w-full flex items-center justify-start gap-2 border-transparent bg-transparent text-[rgba(240,235,224,0.55)] hover:bg-[#2C3E3D] hover:text-[#F0EBE0] hover:border-transparent"
            >
              {isPinned ? (
                <>
                  <PanelLeftClose className="h-4 w-4 flex-shrink-0" />
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap transition-opacity duration-200",
                      isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                  >
                    Minimize
                  </span>
                </>
              ) : (
                <>
                  <PanelLeft className="h-4 w-4 flex-shrink-0" />
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap transition-opacity duration-200",
                      isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                  >
                    Pin Open
                  </span>
                </>
              )}
            </Button>
          </div>

          <div className="py-3 border-t border-[rgba(240,235,224,0.06)] px-3 flex items-center gap-3">
            {isLoaded && user ? (
              <>
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10"
                    }
                  }}
                />
                <div
                  className={cn(
                    "flex-1 min-w-0 transition-opacity duration-200",
                    isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                >
                  <p className="font-display text-sm font-medium text-[#F0EBE0] truncate">
                    {user.fullName || user.firstName || "User"}
                  </p>
                  <p className="text-xs text-[rgba(240,235,224,0.45)] truncate">
                    {user.primaryEmailAddress?.emailAddress || ""}
                  </p>
                </div>
              </>
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#2C3E3D] animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
