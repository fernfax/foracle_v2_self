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
  LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { href: "/overview", label: "Overview", icon: Home, bgColor: "bg-blue-100", iconColor: "text-blue-600" },
  { href: "/user", label: "User", icon: User, bgColor: "bg-purple-100", iconColor: "text-purple-600" },
  { href: "/expenses", label: "Expenses", icon: Wallet, bgColor: "bg-emerald-100", iconColor: "text-emerald-600" },
  { href: "/assets", label: "Assets", icon: TrendingUp, bgColor: "bg-amber-100", iconColor: "text-amber-600" },
  { href: "/policies", label: "Insurance", icon: Shield, bgColor: "bg-rose-100", iconColor: "text-rose-600" },
  { href: "/investments", label: "Invest", icon: LineChart, bgColor: "bg-teal-100", iconColor: "text-teal-600" },
  { href: "/goals", label: "Goals", icon: Target, bgColor: "bg-cyan-100", iconColor: "text-cyan-600" },
  { href: "/budget", label: "Budget", icon: Calculator, bgColor: "bg-indigo-100", iconColor: "text-indigo-600" },
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
                "flex flex-col items-center justify-center gap-1 py-2 px-1 transition-colors shrink-0 w-[12.5%]",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
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
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
