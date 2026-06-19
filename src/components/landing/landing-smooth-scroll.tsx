"use client"

import { useEffect } from "react"
import Lenis from "lenis"

/**
 * Landing-only smooth/momentum scroll (Lenis). Mounted inside <main> in
 * app/page.tsx — NEVER the root layout — so the authed app keeps native scroll.
 * Renders nothing; drives window scroll and tears down on unmount (restoring
 * native scroll when the user navigates to /sign-up etc.).
 *
 * Skipped entirely under reduced-motion and on coarse pointers (mobile), where
 * momentum scroll fights touch/rubber-banding. Calm-forward tuning (duration
 * 1.1, gentle exponential ease). Exposes the instance on window.__lenis so
 * in-page anchor links can request a smooth scrollTo.
 */
declare global {
  interface Window {
    __lenis?: Lenis
  }
}

export function LandingSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (!window.matchMedia("(pointer: fine)").matches) return

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    })
    window.__lenis = lenis

    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // Smooth in-page anchor jumps (#how, #features, …).
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.(
        'a[href^="#"]'
      ) as HTMLAnchorElement | null
      if (!a) return
      const id = a.getAttribute("href")
      if (!id || id === "#") return
      const target = document.querySelector(id)
      if (!target) return
      e.preventDefault()
      lenis.scrollTo(target as HTMLElement, { offset: -72 })
    }
    document.addEventListener("click", onClick)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener("click", onClick)
      lenis.destroy()
      delete window.__lenis
    }
  }, [])

  return null
}
