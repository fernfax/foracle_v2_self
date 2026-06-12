"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TrendingUp,
  Target,
  User,
  Shield,
  Calculator,
  LineChart,
} from "lucide-react";
import { ClerkUserButton } from "@/components/clerk-user-button";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { href: "/user", label: "User", icon: User },
  // Expenses lives as a tab under the User homepage (/user?tab=expenses), so it
  // is reached via User — not surfaced as its own bottom-nav entry. Only
  // top-level pages (or single pages with no children) belong here.
  { href: "/assets", label: "Assets", icon: TrendingUp },
  { href: "/policies", label: "Insurance", icon: Shield },
  { href: "/investments", label: "Invest", icon: LineChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/budget", label: "Budget", icon: Calculator },
  // Hidden for now — AI Assistant feature paused.
  // { href: "/assistant", label: "Assistant", icon: Sparkles },
];

/**
 * Floating bottom navigation (Whoop-style).
 *
 * A frosted, rounded pill that floats above content — detached from the screen
 * edges with side + bottom margins — holding the labeled nav items. The account
 * avatar (Clerk user button: sign-out + Family/Display settings) lives in a
 * separate frosted circle to the pill's right, matching Whoop's standalone
 * profile bubble.
 *
 * Mobile-only: hidden on desktop via the `.bottom-nav` utility (globals.css),
 * which swaps in the sidebar at ≥ 768×600. The pill's left/right offsets use
 * max(…, env(safe-area-inset-*)) so it clears the home indicator in landscape.
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <div
      data-tour="mobile-nav"
      className="bottom-nav fixed z-50 left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] bottom-[calc(0.5rem+env(safe-area-inset-bottom))]"
    >
      {/* Flex row lives on an inner wrapper — the `.bottom-nav` utility
          (globals.css) drives display:block/none for mobile/desktop visibility,
          so keep the flex layout off that element to avoid a display conflict. */}
      <div className="flex items-center gap-2">
      {/* The nav pill — frameless (no border), Whoop-style: just a frosted
          surface + soft shadow. Fixed h-14 to match the standalone avatar. */}
      <nav
        aria-label="Primary"
        className="flex-1 flex h-14 items-center rounded-3xl bg-background/80 backdrop-blur-xl shadow-pop px-1.5 font-display"
      >
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 px-0 transition-colors",
                isActive
                  ? "bg-foreground/[0.06] text-foreground"
                  : "text-foreground/55"
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  isActive && "text-primary"
                )}
              />
              <span className="w-full truncate text-center text-[9px] font-medium leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Separate account avatar — the Clerk letter-circle itself, sized to the
          pill height. No frosted bubble; the avatar is the standalone. Clerk's
          internal CSS ignores Tailwind size classes on avatarBox, so size it
          with an inline style object (inline wins over Clerk's stylesheet). */}
      <div className="flex h-14 w-14 shrink-0 items-center justify-center">
        <ClerkUserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: { width: "3.5rem", height: "3.5rem" },
            },
          }}
        />
      </div>
      </div>
    </div>
  );
}
