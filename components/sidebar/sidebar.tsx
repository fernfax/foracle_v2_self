"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarNavItem } from "./sidebar-nav-item";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Home,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    href: "/dashboard/user",
    label: "User Homepage",
    icon: User,
    bgColor: "bg-purple-100",
    iconColor: "text-purple-600",
    subItems: [
      { href: "/dashboard/user?tab=family", label: "Family", icon: Users },
      { href: "/dashboard/user?tab=incomes", label: "Incomes", icon: DollarSign },
      { href: "/dashboard/user?tab=cpf", label: "CPF", icon: Building2 },
      { href: "/dashboard/user?tab=current", label: "Holdings", icon: Briefcase },
    ],
  },
  {
    href: "/dashboard/user/expenses",
    label: "Expenses",
    icon: Wallet,
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-600",
    subItems: [
      { href: "/dashboard/user/expenses?tab=expenses", label: "Expenses", icon: Receipt },
      { href: "/dashboard/user/expenses?tab=graph", label: "Graph", icon: TrendingUp },
      { href: "/dashboard/user/expenses?tab=reports", label: "Reports", icon: PieChart },
    ],
  },
  {
    href: "/dashboard/user/assets",
    label: "Assets",
    icon: TrendingUp,
    bgColor: "bg-amber-100",
    iconColor: "text-amber-600",
    subItems: [
      { href: "/dashboard/user/assets?tab=property", label: "Property", icon: PropertyIcon },
      { href: "/dashboard/user/assets?tab=vehicle", label: "Vehicle", icon: Car },
      { href: "/dashboard/user/assets?tab=others", label: "Others", icon: Package },
    ],
  },
  {
    href: "/dashboard/policies",
    label: "Insurance",
    icon: Shield,
    bgColor: "bg-rose-100",
    iconColor: "text-rose-600",
  },
  {
    href: "/dashboard/goals",
    label: "Goals",
    icon: Target,
    bgColor: "bg-cyan-100",
    iconColor: "text-cyan-600",
  },
];

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside
      data-tour="sidebar-nav"
      className={cn(
        "sidebar-nav fixed left-0 top-20 h-[calc(100vh-5rem)] bg-white border-r border-slate-200/60",
        "flex flex-col z-40 overflow-hidden",
        "transition-all duration-300 ease-in-out",
        "shadow-sm",
        isExpanded ? "w-[260px]" : "w-[72px]"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Navigation items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            {...item}
            isExpanded={isExpanded}
          />
        ))}
      </nav>
    </aside>
  );
}
