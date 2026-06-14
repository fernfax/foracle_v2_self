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
import { useGlassRefraction } from "@/lib/use-glass-refraction";
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
  // Gate the Chromium-only edge refraction; false on WebKit/SSR (baseline glass).
  const glassRefract = useGlassRefraction();
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
      {/* Inline SVG displacement filter for the Chromium-only edge refraction.
          Static, zero-size, aria-hidden — SSR-safe and offline-safe (no external
          fetch). Referenced by .glass-pill[data-glass-refract] in globals.css. */}
      <svg
        aria-hidden
        focusable={false}
        width="0"
        height="0"
        style={{ position: "absolute", width: 0, height: 0 }}
      >
        <filter
          id="glass-refraction"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.014"
            numOctaves={2}
            seed={7}
            stitchTiles="stitch"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="1.2" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale={10}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      {/* The single nav pill — frameless Liquid Glass island, Whoop-style. */}
      <nav
        ref={navRef}
        aria-label="Primary"
        data-glass-refract={glassRefract ? "true" : undefined}
        className="glass-pill relative isolate flex h-14 items-center rounded-3xl px-1.5 font-display"
      >
        {/* Sliding active highlight — measures the active item and moves to it. */}
        <span
          aria-hidden
          className={cn(
            "glass-active pointer-events-none absolute rounded-2xl",
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
                "relative z-10 flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 py-1.5 px-0",
                // One transition-property covering BOTH color (active fade) and
                // transform (press) so the two never override each other; the
                // motion itself is motion-safe-gated below.
                "transition-[color,transform] duration-150 ease-out",
                "motion-safe:active:scale-[0.93] motion-safe:hover:-translate-y-px",
                "select-none touch-manipulation [-webkit-tap-highlight-color:transparent]",
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
