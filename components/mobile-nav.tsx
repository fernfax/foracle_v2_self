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

const mobileNavItems = [
  { href: "/overview", label: "Overview", icon: Home, bgColor: "bg-blue-100", iconColor: "text-blue-600" },
  { href: "/user", label: "User", icon: User, bgColor: "bg-purple-100", iconColor: "text-purple-600" },
  { href: "/expenses", label: "Expenses", icon: Wallet, bgColor: "bg-emerald-100", iconColor: "text-emerald-600" },
  { href: "/assets", label: "Assets", icon: TrendingUp, bgColor: "bg-amber-100", iconColor: "text-amber-600" },
  { href: "/policies", label: "Insurance", icon: Shield, bgColor: "bg-rose-100", iconColor: "text-rose-600" },
  { href: "/investments", label: "Invest", icon: LineChart, bgColor: "bg-teal-100", iconColor: "text-teal-600" },
  { href: "/goals", label: "Goals", icon: Target, bgColor: "bg-cyan-100", iconColor: "text-cyan-600" },
  { href: "/budget", label: "Budget", icon: Calculator, bgColor: "bg-indigo-100", iconColor: "text-indigo-600" },
  { href: "/assistant", label: "Assistant", icon: Sparkles, bgColor: "bg-emerald-100", iconColor: "text-emerald-600" },
];

const VISIBLE_ITEMS = 8;
const ITEM_WIDTH_PERCENT = 100 / VISIBLE_ITEMS; // 12.5%

export function MobileNav() {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(mobileNavItems.length / VISIBLE_ITEMS);

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

    const activeIndex = mobileNavItems.findIndex(item => item.href === pathname);
    if (activeIndex >= VISIBLE_ITEMS) {
      // Scroll to show the active item
      const itemWidth = scrollEl.scrollWidth / mobileNavItems.length;
      scrollEl.scrollLeft = (activeIndex - VISIBLE_ITEMS + 1) * itemWidth;
    }
  }, [pathname]);

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border/60 z-50 pb-safe">
      {/* Swipeable nav items */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ scrollBehavior: "smooth" }}
      >
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-1 transition-colors shrink-0 snap-start",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
              style={{ width: `${ITEM_WIDTH_PERCENT}%` }}
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

      {/* Page indicator dots */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 pb-2">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1 rounded-full transition-all",
                currentPage === idx
                  ? "w-4 bg-foreground/60"
                  : "w-1 bg-foreground/20"
              )}
            />
          ))}
        </div>
      )}
    </nav>
  );
}
