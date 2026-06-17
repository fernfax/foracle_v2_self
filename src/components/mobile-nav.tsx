"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Calculator,
  LineChart,
  Shield,
  Target,
  TrendingUp,
  User
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useGlassRefraction } from "@/hooks/use-glass-refraction"
import { ClerkUserButton } from "@/components/clerk-user-button"

const mobileNavItems = [
  { href: "/user", label: "User", icon: User },
  // Expenses lives as a tab under the User homepage (/user?tab=expenses), so it
  // is reached via User — not surfaced as its own bottom-nav entry. Only
  // top-level pages (or single pages with no children) belong here.
  { href: "/assets", label: "Assets", icon: TrendingUp },
  { href: "/policies", label: "Insurance", icon: Shield },
  { href: "/investments", label: "Invest", icon: LineChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/budget", label: "Budget", icon: Calculator }
  // Hidden for now — AI Assistant feature paused.
  // { href: "/assistant", label: "Assistant", icon: Sparkles },
]

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
  const pathname = usePathname()
  // Gate the Chromium-only edge refraction; false on WebKit/SSR (baseline glass).
  const glassRefract = useGlassRefraction()
  const navRef = useRef<HTMLElement>(null)
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map())
  const indicatorRef = useRef<HTMLSpanElement>(null)

  // Optimistic active href: updated immediately on tap so the indicator slides
  // right away, then resynced to the real pathname when navigation commits (and
  // on back/forward). null = current route isn't a bottom-nav destination.
  const pathnameMatch =
    mobileNavItems.find((i) => i.href === pathname)?.href ?? null
  const [activeHref, setActiveHref] = useState<string | null>(pathnameMatch)
  const [prevPathname, setPrevPathname] = useState(pathname)
  // Resync to the real route during render (back/forward, commit) instead of in
  // an effect — React re-runs this render synchronously before painting, so no
  // extra committed frame and no set-state-in-effect.
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setActiveHref(pathnameMatch)
  }
  // Transitions are enabled only AFTER the first positioning paints, so the
  // highlight snaps onto the active tab on mount instead of sliding in from the
  // corner. Subsequent moves animate.
  const [animate, setAnimate] = useState(false)
  const firstPositioned = useRef(false)

  // The indicator's geometry is pure layout output (measured from the DOM), not
  // React state — so we write it straight to the span's style in a layout effect
  // instead of round-tripping through setState (which would force an extra render
  // for a value React never needs to reason about).
  const updateIndicator = useCallback(() => {
    const nav = navRef.current
    const span = indicatorRef.current
    if (!span) return
    const el = activeHref ? itemRefs.current.get(activeHref) : null
    if (!nav || !el) {
      span.style.opacity = "0"
      return
    }
    const navRect = nav.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    span.style.left = `${r.left - navRect.left}px`
    span.style.top = `${r.top - navRect.top}px`
    span.style.width = `${r.width}px`
    span.style.height = `${r.height}px`
    span.style.opacity = "1"
    if (!firstPositioned.current) {
      firstPositioned.current = true
      requestAnimationFrame(() => setAnimate(true))
    }
  }, [activeHref])

  // Measure-and-position must happen after the DOM commits (refs in place) but
  // before paint, so the highlight never flashes at the wrong spot. This mutates
  // the DOM directly — no React state is set here.
  useLayoutEffect(() => {
    updateIndicator()
  }, [activeHref, updateIndicator])

  useEffect(() => {
    window.addEventListener("resize", updateIndicator)
    // Re-measure once after fonts settle so the highlight lines up exactly.
    const t = setTimeout(updateIndicator, 100)
    return () => {
      window.removeEventListener("resize", updateIndicator)
      clearTimeout(t)
    }
  }, [updateIndicator])

  const setItemRef = (href: string) => (el: HTMLAnchorElement | null) => {
    if (el) itemRefs.current.set(href, el)
    else itemRefs.current.delete(href)
  }

  return (
    <div
      data-tour="mobile-nav"
      className="bottom-nav fixed right-[max(0.75rem,env(safe-area-inset-right))] bottom-[calc(0.5rem+env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] z-50">
      {/* Inline SVG displacement filter for the Chromium-only edge refraction.
          Static, zero-size, aria-hidden — SSR-safe and offline-safe (no external
          fetch). Referenced by .glass-pill[data-glass-refract] in globals.css. */}
      <svg
        aria-hidden
        focusable={false}
        width="0"
        height="0"
        style={{ position: "absolute", width: 0, height: 0 }}>
        <filter
          id="glass-refraction"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB">
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
        className="glass-pill font-display relative isolate flex h-14 items-center rounded-3xl px-1.5">
        {/* Sliding active highlight — measures the active item and moves to it. */}
        <span
          ref={indicatorRef}
          aria-hidden
          className={cn(
            "glass-active pointer-events-none absolute rounded-2xl opacity-0",
            animate && "transition-all duration-300 ease-out"
          )}
        />

        {mobileNavItems.map((item) => {
          const isActive = activeHref === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={setItemRef(item.href)}
              onClick={() => setActiveHref(item.href)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0 py-1.5",
                // One transition-property covering BOTH color (active fade) and
                // transform (press) so the two never override each other; the
                // motion itself is motion-safe-gated below.
                "transition-[color,transform] duration-150 ease-out",
                "motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.93]",
                "touch-manipulation select-none [-webkit-tap-highlight-color:transparent]",
                isActive ? "text-foreground" : "text-foreground/55"
              )}>
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  isActive && "text-primary"
                )}
              />
              <span className="w-full truncate text-center text-[9px] leading-none font-medium">
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* Account avatar — same island, separated by a hairline divider. */}
        <div aria-hidden className="bg-border/40 mx-1 h-7 w-px shrink-0" />
        <div className="relative z-10 flex shrink-0 items-center justify-center pr-1 pl-0.5">
          <ClerkUserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: { width: "2.25rem", height: "2.25rem" }
              }
            }}
          />
        </div>
      </nav>
    </div>
  )
}
