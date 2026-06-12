"use client";

import { useRef, useState, useEffect, useCallback } from "react";
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
 * One frameless, frosted pill that floats above content — detached from the
 * screen edges with side + bottom margins — holding the labeled nav items AND
 * the account avatar (Clerk user button: sign-out + Family/Display settings) in
 * the same island.
 *
 * The active highlight is a single absolutely-positioned element that slides to
 * the selected item via a CSS transform transition (measure-and-translate, the
 * same pattern as components/ui/sliding-tabs.tsx). It updates optimistically on
 * tap so it moves the instant you click — not after the next route finishes
 * loading.
 *
 * Mobile-only: hidden on desktop via the `.bottom-nav` utility (globals.css),
 * which swaps in the sidebar at ≥ 768×600. The left/right offsets use
 * max(…, env(safe-area-inset-*)) so it clears the home indicator in landscape.
 */
export function MobileNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

  // Optimistic active href: updated immediately on tap so the indicator slides
  // right away, then resynced to the real pathname when navigation commits (and
  // on back/forward). null = current route isn't a bottom-nav destination.
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const [indicator, setIndicator] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    visible: false,
  });
  // Transitions are enabled only AFTER the first positioning paints, so the
  // highlight snaps onto the active tab on mount instead of sliding in from the
  // corner. Subsequent moves animate.
  const [animate, setAnimate] = useState(false);
  const firstPositioned = useRef(false);

  useEffect(() => {
    const match = mobileNavItems.find((i) => i.href === pathname);
    setActiveHref(match ? match.href : null);
  }, [pathname]);

  const updateIndicator = useCallback(() => {
    const nav = navRef.current;
    const el = activeHref ? itemRefs.current.get(activeHref) : null;
    if (!nav || !el) {
      setIndicator((s) => ({ ...s, visible: false }));
      return;
    }
    const navRect = nav.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setIndicator({
      left: r.left - navRect.left,
      top: r.top - navRect.top,
      width: r.width,
      height: r.height,
      visible: true,
    });
    if (!firstPositioned.current) {
      firstPositioned.current = true;
      requestAnimationFrame(() => setAnimate(true));
    }
  }, [activeHref]);

  useEffect(() => {
    updateIndicator();
  }, [activeHref, updateIndicator]);

  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    // Re-measure once after fonts settle so the highlight lines up exactly.
    const t = setTimeout(updateIndicator, 100);
    return () => {
      window.removeEventListener("resize", updateIndicator);
      clearTimeout(t);
    };
  }, [updateIndicator]);

  const setItemRef = (href: string) => (el: HTMLAnchorElement | null) => {
    if (el) itemRefs.current.set(href, el);
    else itemRefs.current.delete(href);
  };

  return (
    <div
      data-tour="mobile-nav"
      className="bottom-nav fixed z-50 left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] bottom-[calc(0.5rem+env(safe-area-inset-bottom))]"
    >
      {/* The single nav pill — frameless, frosted, Whoop-style. */}
      <nav
        ref={navRef}
        aria-label="Primary"
        className="relative flex h-14 items-center rounded-3xl bg-background/80 backdrop-blur-xl shadow-pop px-1.5 font-display"
      >
        {/* Sliding active highlight — measures the active item and moves to it. */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute rounded-2xl bg-foreground/[0.06]",
            animate && "transition-all duration-300 ease-out",
            indicator.visible ? "opacity-100" : "opacity-0"
          )}
          style={{
            left: indicator.left,
            top: indicator.top,
            width: indicator.width,
            height: indicator.height,
          }}
        />

        {mobileNavItems.map((item) => {
          const isActive = activeHref === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={setItemRef(item.href)}
              onClick={() => setActiveHref(item.href)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative z-10 flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 py-1.5 px-0 transition-colors",
                isActive ? "text-foreground" : "text-foreground/55"
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

        {/* Account avatar — same island, separated by a hairline divider. */}
        <div aria-hidden className="mx-1 h-7 w-px shrink-0 bg-border/40" />
        <div className="relative z-10 flex shrink-0 items-center justify-center pl-0.5 pr-1">
          <ClerkUserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: { width: "2.25rem", height: "2.25rem" },
              },
            }}
          />
        </div>
      </nav>
    </div>
  );
}
