"use client"

import { useSyncExternalStore, type ComponentProps } from "react"
import { ResponsiveContainer } from "recharts"

/**
 * Mount-gated wrapper around Recharts' `ResponsiveContainer`.
 *
 * Recharts measures its parent on the first render. On a server-rendered
 * (`force-dynamic`) page that first measure is `width(-1)/height(-1)`, which
 * Recharts logs as a noisy console warning. Gating the container on a client
 * mount means it only renders once a real layout box exists, so the warning
 * never fires. Until mounted we render a same-size placeholder so the layout
 * doesn't shift.
 *
 * Drop-in replacement: same props as `ResponsiveContainer`.
 */
// Mount gate: `false` during SSR and first client paint, `true` afterwards.
const emptySubscribe = () => () => {}

export function ResponsiveChart(
  props: ComponentProps<typeof ResponsiveContainer>
) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  if (!mounted) {
    const { width = "100%", height = "100%", className, style } = props
    return (
      <div
        className={typeof className === "string" ? className : undefined}
        style={{ width, height, ...style }}
        aria-hidden
      />
    )
  }

  return <ResponsiveContainer {...props} />
}
