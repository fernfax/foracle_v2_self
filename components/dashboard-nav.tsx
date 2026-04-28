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
  { href: "/overview", label: "Overview", icon: Home },
  { href: "/user", label: "User Homepage", icon: User },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/assets", label: "Assets", icon: TrendingUp },
  { href: "/policies", label: "Insurance", icon: Shield },
  { href: "/goals", label: "Goals", icon: Target },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-28 space-y-1.5">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 px-3.5 py-2.5 rounded-md transition-all duration-200 font-display text-sm font-medium",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "bg-card text-foreground/65 border border-border/30 hover:bg-muted/70 hover:text-foreground hover:border-border/60"
            )}
          >
            <Icon
              className={cn(
                "h-[18px] w-[18px] flex-shrink-0",
                isActive ? "text-primary-foreground" : "text-foreground/55 group-hover:text-foreground"
              )}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
