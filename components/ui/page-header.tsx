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
 * Mobile: the inner overflow-x-auto wrapper lets the tab strip scroll
 * horizontally on narrow viewports without changing component composition (D6).
 *
 * Negative margins (-mx-*) make the sticky bar bleed to the edges of the
 * main column container, matching the rest of the dashboard chrome.
 */
export function PageHeader({ title, actions, tabs }: PageHeaderProps) {
  return (
    <div className="sticky top-[70px] z-30 bg-background/95 backdrop-blur-sm border-b border-border/40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4 py-3">
        <h1 className="text-[18px] font-display font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {tabs ? (
        <div className="overflow-x-auto scrollbar-hide -mt-1 pb-1">{tabs}</div>
      ) : null}
    </div>
  );
}
