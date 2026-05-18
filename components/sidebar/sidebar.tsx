"use client";

import Link from "next/link";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { ClerkUserButton } from "@/components/clerk-user-button";
import {
  Home,
  User,
  Wallet,
  TrendingUp,
  Shield,
  Target,
  Calculator,
  PanelLeftClose,
  PanelLeft,
  LineChart,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SidebarNavItem } from "./sidebar-nav-item";
import { useSidebar } from "./sidebar-context";

// D8: sub-routes (Family/Incomes/CPF/Holdings, Expenses/Graph/Reports, etc.)
// live in page tabs now, not the sidebar. URLs still work via query params;
// the sidebar simply doesn't surface them as a nested accordion.
const mainNavItems = [
  { href: "/overview", label: "Overview", icon: Home },
  { href: "/user", label: "User Homepage", icon: User },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/assets", label: "Assets", icon: TrendingUp },
  { href: "/policies", label: "Insurance", icon: Shield },
  { href: "/investments", label: "Investments", icon: LineChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/budget", label: "Budget", icon: Calculator },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
];

export function Sidebar() {
  const { isPinned, setIsPinned, setIsHovered, isExpanded } = useSidebar();
  const { user, isLoaded } = useUser();

  return (
    <aside
      data-tour="sidebar-nav"
      aria-label="Primary navigation"
      className={cn(
        // Light, integrated sidebar (D2/D10) — bg-background/70 + backdrop-blur
        // lets ~30% of the peranakan/radial decor show through, softened.
        // Hairline right border at foreground/8 (Deep Forest @ 8% alpha).
        "sticky top-0 h-screen w-full self-start overflow-hidden",
        "bg-background/70 backdrop-blur-sm border-r border-foreground/[0.08]",
        "flex flex-col z-50"
      )}
      onMouseEnter={() => !isPinned && setIsHovered(true)}
      onMouseLeave={() => !isPinned && setIsHovered(false)}
    >
      {/*
        Inner contents stay laid out at the full expanded width (260px) and are clipped
        by the aside's `overflow-hidden` when the grid column shrinks. This keeps icon
        positions stable, removes layout work during the transition, and avoids
        per-element width animation.
      */}
      <div className="flex flex-col w-[260px] h-full">
        {/* Logo lockup — both images mounted, swap via opacity */}
        <div className="h-[70px] flex items-center flex-shrink-0 relative px-3">
          <Link
            href="/overview"
            className="relative flex items-center h-full w-full"
          >
            {/* Compact mark — visible when collapsed */}
            <Image
              src="/logo-72.png"
              alt="Foracle"
              width={40}
              height={40}
              className={cn(
                "object-contain transition-opacity duration-200 motion-reduce:transition-none",
                isExpanded ? "opacity-0" : "opacity-95"
              )}
              priority
            />
            {/* Wordmark — overlays the compact mark when expanded */}
            <Image
              src="/wordmark-400.png"
              alt="Foracle"
              width={112}
              height={32}
              className={cn(
                "object-contain absolute left-2 top-1/2 -translate-y-1/2 transition-opacity duration-200 motion-reduce:transition-none",
                isExpanded ? "opacity-95" : "opacity-0 pointer-events-none"
              )}
              priority
            />
          </Link>
        </div>

        {/* Navigation — overflow-x-hidden prevents label overflow from creating horizontal scroll */}
        <nav className="flex-1 pt-6 sm:pt-8 pb-4 space-y-0.5 overflow-y-auto overflow-x-hidden px-3">
          {mainNavItems.map((item) => (
            <SidebarNavItem
              key={item.href}
              {...item}
              isExpanded={isExpanded}
            />
          ))}
        </nav>

        {/* Bottom section — pin toggle + user profile */}
        <div className="flex-shrink-0 border-t border-foreground/[0.08]">
          <div className="py-2 px-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPinned(!isPinned)}
              className="w-full flex items-center justify-start gap-2 border-transparent bg-transparent text-foreground/55 hover:bg-muted/60 hover:text-foreground hover:border-transparent"
            >
              {isPinned ? (
                <>
                  <PanelLeftClose className="h-4 w-4 flex-shrink-0" />
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap transition-opacity duration-200 motion-reduce:transition-none",
                      isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                  >
                    Minimize
                  </span>
                </>
              ) : (
                <>
                  <PanelLeft className="h-4 w-4 flex-shrink-0" />
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap transition-opacity duration-200 motion-reduce:transition-none",
                      isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                  >
                    Pin Open
                  </span>
                </>
              )}
            </Button>
          </div>

          <div className="py-3 border-t border-foreground/[0.08] px-3 flex items-center gap-3">
            {isLoaded && user ? (
              <>
                <ClerkUserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10"
                    }
                  }}
                />
                <div
                  className={cn(
                    "flex-1 min-w-0 transition-opacity duration-200 motion-reduce:transition-none",
                    isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                >
                  <p className="font-display text-sm font-medium text-foreground truncate">
                    {user.fullName || user.firstName || "User"}
                  </p>
                  <p className="text-xs text-foreground/55 truncate">
                    {user.primaryEmailAddress?.emailAddress || ""}
                  </p>
                </div>
              </>
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
