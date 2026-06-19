"use client"

import { useSyncExternalStore, type ReactNode } from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/cn"

// Mount gate: `false` during SSR and the first client paint, `true` after.
const emptySubscribe = () => () => {}

// Single source of truth for the bottom-right floating-action-button stack.
//
// `FabStackHost` is mounted ONCE in the dashboard shell, outside the
// `[contain:layout_paint]` content box so its `position: fixed` resolves
// against the viewport (a contained ancestor would otherwise capture it).
// `Fab` components portal their child into the host and stack inside it via
// flexbox — so there are NO hand-chained `bottom-[9rem]` offsets to keep in
// sync. Hide a button and the stack recollapses automatically.
const FAB_HOST_ID = "fab-stack-host"

export function FabStackHost() {
  return (
    <div
      id={FAB_HOST_ID}
      // `column-reverse` so the lowest `order` sits at the BOTTOM and higher
      // orders climb upward. `items-end` right-aligns mixed-width buttons (the
      // round help/add icons and the wider timeline "Edit" pill). The container
      // is click-through (`pointer-events-none`); each Fab re-enables itself.
      className={cn(
        "pointer-events-none fixed right-6 z-40 flex flex-col-reverse items-end gap-3",
        // Anchor: 1.5rem from the bottom on desktop; on mobile, clear the
        // bottom nav (h-24 spacer) plus any notched safe-area inset.
        "desktop:bottom-6 bottom-[calc(6rem+env(safe-area-inset-bottom))]"
      )}
    />
  )
}

/**
 * Places its child in the shared bottom-right FAB stack.
 *
 * `order` controls vertical position (lower = closer to the bottom), so the
 * stack stays deterministic regardless of which route mounts its Fab first:
 *   0  — help button (anchor)
 *   10 — add-expense button (global, mobile-only / budget page, all sizes)
 *   20 — page-specific actions (e.g. Timeline edit toggle)
 */
export function Fab({
  order,
  className,
  children
}: {
  order: number
  className?: string
  children: ReactNode
}) {
  // Gate on client mount so SSR renders nothing (the host is an empty div on
  // both server and first client paint — no hydration mismatch). After mount we
  // re-render and the always-present host is in the DOM to query.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
  if (!mounted) return null

  const host = document.getElementById(FAB_HOST_ID)
  if (!host) return null

  return createPortal(
    <div className={cn("pointer-events-auto", className)} style={{ order }}>
      {children}
    </div>,
    host
  )
}
