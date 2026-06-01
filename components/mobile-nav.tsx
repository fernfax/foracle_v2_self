"use client";

import { useRef, useState, useEffect } from "react";
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
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeatureFlags } from "@/components/feature-flags/feature-flag-provider";
import type { FlagKey } from "@/lib/feature-flags/registry";

const mobileNavItems: {
  href: string;
  label: string;
  icon: typeof Home;
  flag?: FlagKey;
}[] = [
  { href: "/overview", label: "Overview", icon: Home, flag: "overview" },
  { href: "/user", label: "User", icon: User, flag: "income" },
  { href: "/expenses", label: "Expenses", icon: Wallet, flag: "expenses" },
  { href: "/assets", label: "Assets", icon: TrendingUp, flag: "assets" },
  { href: "/policies", label: "Insurance", icon: Shield, flag: "policies" },
  { href: "/investments", label: "Invest", icon: LineChart, flag: "investments" },
  { href: "/goals", label: "Goals", icon: Target, flag: "goals" },
  { href: "/budget", label: "Budget", icon: Calculator, flag: "budget" },
  { href: "/assistant", label: "Assistant", icon: Sparkles, flag: "assistant" },
];

const VISIBLE_ITEMS = 8;
const ITEM_WIDTH_PERCENT = 100 / VISIBLE_ITEMS; // 12.5%

export function MobileNav() {
  const pathname = usePathname();
  const flags = useFeatureFlags();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const visibleNavItems = mobileNavItems.filter(
    (item) => item.flag === undefined || flags[item.flag]
  );
  const totalPages = Math.ceil(visibleNavItems.length / VISIBLE_ITEMS);

  // Update current page based on scroll position
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const handleScroll = () => {
      const scrollLeft = scrollEl.scrollLeft;
      const scrollWidth = scrollEl.scrollWidth - scrollEl.clientWidth;
      const page = Math.round((scrollLeft / scrollWidth) * (totalPages - 1));
      setCurrentPage(page);
    };

    scrollEl.addEventListener("scroll", handleScroll);
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [totalPages]);

  // Scroll to active item on mount
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const activeIndex = visibleNavItems.findIndex(item => item.href === pathname);
    if (activeIndex >= VISIBLE_ITEMS) {
      const itemWidth = scrollEl.scrollWidth / visibleNavItems.length;
      scrollEl.scrollLeft = (activeIndex - VISIBLE_ITEMS + 1) * itemWidth;
    }
  }, [pathname, visibleNavItems]);

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 bg-background/85 backdrop-blur-xl border-t border-border/30 z-50 pb-safe">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ scrollBehavior: "smooth" }}
      >
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-1 transition-colors shrink-0 snap-start font-display",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              style={{ width: `${ITEM_WIDTH_PERCENT}%` }}
            >
              <div
                className={cn(
                  "p-2 rounded-md transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-foreground/55"
                )}
              >
                <Icon className="h-5 w-5 transition-colors" />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-1 pb-2">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1 rounded-full transition-all",
                currentPage === idx
                  ? "w-4 bg-primary/70"
                  : "w-1 bg-foreground/20"
              )}
            />
          ))}
        </div>
      )}
    </nav>
  );
}
