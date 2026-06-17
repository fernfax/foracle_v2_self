"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"

// Anti-flash: don't show the blur until a navigation has been pending this long,
// so instant/prefetched tab switches stay crisp and never flicker.
const SHOW_DELAY_MS = 150
// Swap the copy after a long wait (e.g. a Render cold start) so it reads as
// intentional rather than frozen.
const LONG_WAIT_MS = 7000
// Failsafe: never leave the overlay stuck (e.g. a link that preventDefaults and
// never navigates). Longer than a typical cold start so real loads aren't cut off.
const SAFETY_MS = 30000

/**
 * Immersive route-change overlay.
 *
 * Instead of a route-level loading.tsx (which REPLACES the page, leaving nothing
 * to blur), this client overlay renders over the still-mounted previous page
 * while the next route streams in — frosting the content and floating the
 * Foracle mark + a thin top progress bar on top. The bottom nav / sidebar sit at
 * z-50 and paint ABOVE the z-45 blur, so they stay crisp.
 *
 * Navigation is detected with a single capture-phase click listener on any
 * internal <a> (covers nav, sidebar, cards — no per-link wiring), and dismissed
 * when usePathname commits to the new route. Respects prefers-reduced-motion.
 */
export function NavigationOverlay() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [longWait, setLongWait] = useState(false)
  const [lastPathname, setLastPathname] = useState(pathname)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Route committed (pathname changed) — hide the overlay. Done during render
  // via React's "adjust state when a value changes" pattern so the overlay
  // vanishes in the same commit the new route mounts, with no extra render pass
  // and no flash. (https://react.dev/learn/you-might-not-need-an-effect)
  if (lastPathname !== pathname) {
    setLastPathname(pathname)
    setVisible(false)
    setLongWait(false)
  }

  // Pending timers belong to the route we just left; clear them once the new
  // route has committed. (Ref mutation is side-effect work, so it lives here.)
  useEffect(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [pathname])

  useEffect(() => {
    const clearAll = () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
    const onClick = (e: MouseEvent) => {
      // Ignore modified clicks (new tab/window) and non-primary buttons.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return
      }
      const anchor = (e.target as HTMLElement | null)?.closest("a")
      if (!anchor) return
      const href = anchor.getAttribute("href")
      if (
        !href ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return
      }
      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      // Same-origin, and a real segment change (not a #hash or ?query on the
      // current path, which doesn't trigger a page load).
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname) return

      clearAll()
      const showT = setTimeout(() => {
        setVisible(true)
        const longT = setTimeout(
          () => setLongWait(true),
          LONG_WAIT_MS - SHOW_DELAY_MS
        )
        const safeT = setTimeout(() => {
          setVisible(false)
          setLongWait(false)
        }, SAFETY_MS)
        timersRef.current.push(longT, safeT)
      }, SHOW_DELAY_MS)
      timersRef.current.push(showT)
    }

    document.addEventListener("click", onClick, true)
    return () => {
      document.removeEventListener("click", onClick, true)
      clearAll()
    }
  }, [])

  if (!visible) return null

  return (
    <>
      {/* Thin indeterminate progress bar — above the nav (z-50). Motion only. */}
      <div className="bg-primary/10 pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-[60] hidden h-[3px] overflow-hidden motion-safe:block">
        <div className="bg-primary h-full w-full motion-safe:animate-[navProgress_1.1s_ease-in-out_infinite]" />
      </div>

      {/* Content-area frost — nav/sidebar (z-50) paint on top and stay crisp.
          pointer-events-none so a navigation that never commits (e.g. a
          preventDefault'd link) can't trap the page behind the blur for the
          full safety timeout — the user can still tap through to recover. */}
      <div
        aria-live="polite"
        aria-busy="true"
        className="bg-background/30 motion-safe:animate-in motion-safe:fade-in pointer-events-none fixed inset-0 z-[45] flex items-center justify-center backdrop-blur-md motion-safe:duration-150">
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="border-primary/15 border-t-primary/70 absolute inset-0 rounded-full border-2 motion-safe:animate-spin" />
            {/* Native gunmetal mark reads well on the light frost; in dark mode
                invert it to cream so it doesn't vanish on the nightfall blur.
                Mirrors the shell wordmark's dark:brightness-0 dark:invert. */}
            <Image
              src="/logo-144.png"
              alt=""
              width={32}
              height={32}
              priority
              className="opacity-90 dark:brightness-0 dark:invert"
            />
          </div>
          <span className="font-display text-muted-foreground text-xs tracking-wide">
            {longWait ? "Taking a little longer…" : "Loading…"}
          </span>
        </div>
      </div>
    </>
  )
}
