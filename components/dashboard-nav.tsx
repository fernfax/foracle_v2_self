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
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/user", label: "User Homepage", icon: User },
  { href: "/dashboard/user/expenses", label: "Expenses", icon: Wallet },
  { href: "/dashboard/user/assets", label: "Assets", icon: TrendingUp },
  { href: "/dashboard/policies", label: "Insurance", icon: Shield },
  { href: "/dashboard/goals", label: "Goals", icon: Target },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-24 space-y-2">
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
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                : "bg-white text-slate-600 hover:shadow-md"
            )}
          >
            <div className={cn(
              "p-2 rounded-lg transition-colors",
              isActive
                ? "bg-white/20"
                : "bg-slate-100 group-hover:bg-indigo-50"
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="font-semibold text-sm">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
