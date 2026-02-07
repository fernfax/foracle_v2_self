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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SidebarNavItem } from "./sidebar-nav-item";
import { useSidebar } from "./sidebar-context";

const mainNavItems = [
  {
    href: "/overview",
    label: "Overview",
    icon: Home,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    href: "/user",
    label: "User Homepage",
    icon: User,
    bgColor: "bg-purple-100",
    iconColor: "text-purple-600",
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
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-600",
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
    bgColor: "bg-amber-100",
    iconColor: "text-amber-600",
    subItems: [
      { href: "/assets?tab=property", label: "Property", icon: PropertyIcon },
      { href: "/assets?tab=vehicle", label: "Vehicle", icon: Car },
      { href: "/assets?tab=others", label: "Others", icon: Package },
    ],
  },
  {
    href: "/policies",
    label: "Insurance",
    icon: Shield,
    bgColor: "bg-rose-100",
    iconColor: "text-rose-600",
  },
  {
    href: "/investments",
    label: "Investments",
    icon: LineChart,
    bgColor: "bg-teal-100",
    iconColor: "text-teal-600",
  },
  {
    href: "/goals",
    label: "Goals",
    icon: Target,
    bgColor: "bg-cyan-100",
    iconColor: "text-cyan-600",
  },
  {
    href: "/budget",
    label: "Budget",
    icon: Calculator,
    bgColor: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
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
        "sidebar-nav fixed left-0 top-0 h-screen bg-slate-900 border-r border-slate-800",
        "flex flex-col z-50 overflow-hidden",
        "transition-all duration-300 ease-in-out",
        "shadow-lg",
        isExpanded ? "w-[260px]" : "w-[72px]"
      )}
      onMouseEnter={() => !isPinned && setIsHovered(true)}
      onMouseLeave={() => !isPinned && setIsHovered(false)}
    >
      {/* Logo */}
      <div className={cn(
        "h-[70px] flex items-center flex-shrink-0",
        isExpanded ? "px-5" : "px-3 justify-center"
      )}>
        <Link href="/overview" className="flex items-center justify-center">
          {isExpanded ? (
            <Image
              src="/wordmark-400.png"
              alt="Foracle"
              width={112}
              height={32}
              className="object-contain brightness-0 invert"
              priority
            />
          ) : (
            <Image
              src="/logo-72.png"
              alt="Foracle"
              width={40}
              height={40}
              className="object-contain brightness-0 invert"
              priority
            />
          )}
        </Link>
      </div>

      {/* Navigation items */}
      <nav className={cn(
        "flex-1 pt-6 sm:pt-8 pb-4 space-y-1 overflow-y-auto",
        isExpanded ? "px-5" : "px-3"
      )}>
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

      {/* Bottom section - pushed to bottom */}
      <div className="flex-shrink-0 border-t border-slate-800">
        {/* Pin/Minimize button */}
        <div className={cn("py-2", isExpanded ? "px-5" : "px-3")}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPinned(!isPinned)}
            className={cn(
              "w-full flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800",
              !isExpanded && "justify-center"
            )}
          >
            {isPinned ? (
              <>
                <PanelLeftClose className="h-4 w-4 flex-shrink-0" />
                {isExpanded && <span className="text-xs">Minimize</span>}
              </>
            ) : (
              <>
                <PanelLeft className="h-4 w-4 flex-shrink-0" />
                {isExpanded && <span className="text-xs">Pin Open</span>}
              </>
            )}
          </Button>
        </div>

        {/* User profile section */}
        <div className={cn(
          "py-3 border-t border-slate-800",
          isExpanded ? "px-5 flex items-center gap-3" : "px-3 flex justify-center"
        )}>
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
              {isExpanded && (
                <div className="flex-1 min-w-0 transition-all duration-300">
                  <p className="text-sm font-medium text-white truncate">
                    {user.fullName || user.firstName || "User"}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {user.primaryEmailAddress?.emailAddress || ""}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse" />
          )}
        </div>
      </div>
    </aside>
  );
}
