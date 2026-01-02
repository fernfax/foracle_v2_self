"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TrendingUp,
  Home,
  Wallet,
  Target,
  User,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/user", label: "User", icon: User },
  { href: "/dashboard/user/expenses", label: "Expenses", icon: Wallet },
  { href: "/dashboard/goals", label: "Goals", icon: Target },
  { href: "/dashboard/user/assets", label: "Assets", icon: TrendingUp },
  { href: "/dashboard/policies", label: "Insurance", icon: Shield },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border/60 z-50">
      <div className="flex overflow-x-auto scrollbar-hide p-2">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 py-3 px-2 transition-colors shrink-0 w-[20%]",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
