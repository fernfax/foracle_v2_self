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
    <nav className="sticky top-24 space-y-1.5">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out",
              isActive
                ? "bg-secondary text-secondary-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
