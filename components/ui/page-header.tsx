import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  /** Optional right-side controls (e.g. <Button>Beta View</Button>). */
  actions?: ReactNode;
  /** Optional tab strip rendered below the title row. */
  tabs?: ReactNode;
}

/**
 * Slim integrated page header.
 *
 * Stacking contract (locked in eng review D9):
 * - Sidebar             → sticky top-0  z-50
 * - App shell header    → sticky top-0  z-40 (70px tall, in dashboard-shell.tsx)
 * - PageHeader (this)   → sticky top-[70px] z-30
 *
 * Negative top margin (-mt-6 sm:-mt-8) offsets <main>'s py-6 sm:py-8 top
 * padding so the header's natural position aligns with its sticky anchor
 * (y=70). Without this, the header would scroll with content for 24–32px
 * before locking — a visible "moving" effect on initial scroll.
 *
 * Negative horizontal margins (-mx-*) bleed the bar to the edges of the
 * main column container.
 *
 * Mobile: the inner overflow-x-auto wrapper lets the tab strip scroll
 * horizontally on narrow viewports (D6).
 */
export function PageHeader({ title, actions, tabs }: PageHeaderProps) {
  return (
    <div className="sticky top-[70px] z-30 bg-background border-b border-border/20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8">
      <div className="flex items-center justify-between gap-4 py-2">
        <h1 className="text-[17px] font-display font-medium tracking-tight text-foreground">
          {title}
        </h1>
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {tabs ? (
        <div className="overflow-x-auto scrollbar-hide -mt-0.5 pb-1">{tabs}</div>
      ) : null}
    </div>
  );
}
