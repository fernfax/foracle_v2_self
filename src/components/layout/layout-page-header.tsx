import { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  /** Optional right-side controls (e.g. <Button>Timeline View</Button>). */
  actions?: ReactNode
  /** Optional tab strip rendered below the title row. */
  tabs?: ReactNode
}

/**
 * Slim integrated page header.
 *
 * Stacking contract (revised after the mobile app-shell header was removed —
 * the top is now just a small scrolling wordmark + a fixed status-bar scrim):
 * - Sidebar             → sticky top-0  z-50
 * - Status-bar scrim    → mobile only (fixed top-0, covers env(safe-area-inset-top), z-40)
 * - PageHeader (this)   → sticky top-[env(safe-area-inset-top)] on mobile / top-0 on desktop, z-30
 *
 * On mobile the header pins just below the status bar (the scrim keeps that
 * strip opaque, so content never peeks under the Dynamic Island). The
 * negative top margin offsets <main>'s top padding so the header's natural
 * position aligns with its sticky anchor. On desktop <main> has pt-0 (sidebar
 * layout, no header to clear), so the negative margin zeroes out too —
 * otherwise the header would scroll up past the column edge.
 *
 * Uses the custom `desktop:` variant (width ≥ 768 AND height ≥ 600) instead
 * of `md:` so phone-landscape (width-passes, height-fails) stays on the
 * mobile sticky offset and below the still-visible mobile shell header.
 *
 * Negative horizontal margins (-mx-*) bleed the bar to the edges of the
 * main column container.
 *
 * Mobile: the inner overflow-x-auto wrapper lets the tab strip scroll
 * horizontally on narrow viewports (D6).
 */
export function LayoutPageHeader({ title, actions, tabs }: PageHeaderProps) {
  return (
    <div className="desktop:top-0 bg-background border-border/20 desktop:mt-0 sticky top-[env(safe-area-inset-top)] z-30 -mx-4 -mt-6 border-b px-4 sm:-mx-6 sm:-mt-8 sm:px-6 lg:-mx-8 lg:px-8">
      {/* min-h keeps the title row a uniform height across all tabs whether or
          not a page supplies `actions` (e.g. Budget's month pill) — so e.g. the
          Insurance header isn't shorter than the Budget header. */}
      <div className="flex min-h-[3.25rem] items-center justify-between gap-4 py-2">
        <h1 className="font-display text-foreground text-[17px] font-medium tracking-tight">
          {title}
        </h1>
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {tabs ? (
        <div className="scrollbar-hide -mt-0.5 overflow-x-auto">{tabs}</div>
      ) : null}
    </div>
  )
}
