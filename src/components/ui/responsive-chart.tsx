"use client"

import { useLayoutEffect, useRef, useState, type ComponentProps } from "react"
import { ResponsiveContainer } from "recharts"

/**
 * Layout-gated wrapper around Recharts' `ResponsiveContainer`.
 *
 * Recharts measures its parent on first render and logs a noisy
 * `width(-1)/height(-1)` warning whenever that first measure lands before the
 * box has a real size — server-rendered pages, freshly mounted tab routes, a
 * `calc()`/`%` height that hasn't resolved yet. Mount-gating alone isn't enough:
 * an element can be mounted and still report a zero box for a frame.
 *
 * Two things kill the warning together:
 *  1. `initialDimension` seeds Recharts' dimension state with a positive value.
 *     Recharts defaults it to `{ -1, -1 }` and logs on its very first render
 *     (before its own ResizeObserver fires) — that is the warning's true source.
 *  2. The layout gate renders a same-size placeholder and only mounts the real
 *     container once its box has positive width AND height, so the observer
 *     resolves to real dimensions immediately and there's no layout shift.
 *
 * Drop-in replacement: same props as `ResponsiveContainer`.
 */
export function ResponsiveChart({
  width = "100%",
  height = "100%",
  className,
  style,
  ...rest
}: ComponentProps<typeof ResponsiveContainer>) {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      const box = el.getBoundingClientRect()
      if (box.width > 0 && box.height > 0) setReady(true)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={typeof className === "string" ? className : undefined}
      style={{ width, height, ...style }}>
      {ready ? (
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 1, height: 1 }}
          {...rest}
        />
      ) : null}
    </div>
  )
}
