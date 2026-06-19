"use client"

import { useEffect, useRef } from "react"

/**
 * Custom cursor (full replace, Griffin-style): hides the native cursor on the
 * landing and renders a precise dot (exact pointer position) + a ring that
 * lerp-trails behind. Ring grows over interactive elements, contracts on press.
 *
 * Landing-only (mounted in app/page.tsx, never the root layout) so the authed
 * app keeps its normal cursor. Desktop pointer:fine only; disabled entirely
 * under reduced-motion (native cursor stays). Blend tuned for the warm light
 * mesh (terracotta + multiply); a .dark override flips to coral + screen.
 */
const INTERACTIVE =
  "a,button,[role='button'],summary,label,input,select,textarea,[data-cursor='grow']"

export function LandingCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    const root = document.documentElement
    root.classList.add("cursor-hidden")

    let mx = window.innerWidth / 2
    let my = window.innerHeight / 2
    let rx = mx
    let ry = my
    let shown = false
    let raf = 0

    const reveal = () => {
      if (shown) return
      shown = true
      dot.style.opacity = "1"
      ring.style.opacity = "1"
    }

    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
      reveal()
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`
    }
    const onOver = (e: MouseEvent) => {
      const t = (e.target as HTMLElement)?.closest?.(INTERACTIVE)
      ring.classList.toggle("cursor-ring-grow", !!t)
    }
    const onLeave = () => {
      shown = false
      dot.style.opacity = "0"
      ring.style.opacity = "0"
    }
    const onDown = () => ring.classList.add("cursor-ring-press")
    const onUp = () => ring.classList.remove("cursor-ring-press")

    const loop = () => {
      rx += (mx - rx) * 0.18
      ry += (my - ry) * 0.18
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    window.addEventListener("mousemove", onMove, { passive: true })
    window.addEventListener("mouseover", onOver, { passive: true })
    document.addEventListener("mouseleave", onLeave)
    window.addEventListener("mousedown", onDown)
    window.addEventListener("mouseup", onUp)

    return () => {
      cancelAnimationFrame(raf)
      root.classList.remove("cursor-hidden")
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseover", onOver)
      document.removeEventListener("mouseleave", onLeave)
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("mouseup", onUp)
    }
  }, [])

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden
        className="cursor-ring"
        style={{ opacity: 0 }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="cursor-dot"
        style={{ opacity: 0 }}
      />
    </>
  )
}
