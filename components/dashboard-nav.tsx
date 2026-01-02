"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TrendingUp,
  Home,
  Wallet,
  Shield,
  Target,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home, bgColor: "bg-blue-100", iconColor: "text-blue-600" },
  { href: "/dashboard/user", label: "User Homepage", icon: User, bgColor: "bg-purple-100", iconColor: "text-purple-600" },
  { href: "/dashboard/user/expenses", label: "Expenses", icon: Wallet, bgColor: "bg-emerald-100", iconColor: "text-emerald-600" },
  { href: "/dashboard/user/assets", label: "Assets", icon: TrendingUp, bgColor: "bg-amber-100", iconColor: "text-amber-600" },
  { href: "/dashboard/policies", label: "Insurance", icon: Shield, bgColor: "bg-rose-100", iconColor: "text-rose-600" },
  { href: "/dashboard/goals", label: "Goals", icon: Target, bgColor: "bg-cyan-100", iconColor: "text-cyan-600" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-28 space-y-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              isActive
                ? "bg-[#387DF5] text-white shadow-lg shadow-blue-200 border border-[#387DF5]"
                : "bg-white text-slate-600 shadow-sm hover:shadow-md border border-slate-200"
            )}
          >
            <div className={cn(
              "p-2 rounded-lg transition-colors",
              isActive
                ? "bg-white/20"
                : item.bgColor
            )}>
              <Icon className={cn("h-5 w-5", !isActive && item.iconColor)} />
            </div>
            <span className="font-semibold text-sm">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
