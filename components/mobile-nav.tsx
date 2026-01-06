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
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home, bgColor: "bg-blue-100", iconColor: "text-blue-600" },
  { href: "/dashboard/user", label: "User", icon: User, bgColor: "bg-purple-100", iconColor: "text-purple-600" },
  { href: "/dashboard/user/expenses", label: "Expenses", icon: Wallet, bgColor: "bg-emerald-100", iconColor: "text-emerald-600" },
  { href: "/dashboard/user/assets", label: "Assets", icon: TrendingUp, bgColor: "bg-amber-100", iconColor: "text-amber-600" },
  { href: "/dashboard/policies", label: "Insurance", icon: Shield, bgColor: "bg-rose-100", iconColor: "text-rose-600" },
  { href: "/dashboard/goals", label: "Goals", icon: Target, bgColor: "bg-cyan-100", iconColor: "text-cyan-600" },
  { href: "/dashboard/budget", label: "Budget", icon: Calculator, bgColor: "bg-indigo-100", iconColor: "text-indigo-600", comingSoon: true },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border/60 z-50">
      <div className="flex overflow-x-auto scrollbar-hide p-2">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          const comingSoon = 'comingSoon' in item && item.comingSoon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-1 transition-colors shrink-0 w-[14.285%]",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <div
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isActive ? "bg-[#387DF5]" : item.bgColor
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-white" : item.iconColor
                    )}
                  />
                </div>
                {comingSoon && (
                  <span className="absolute -top-1 -right-1 text-[6px] px-1 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
                    Soon
                  </span>
                )}
              </div>
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
