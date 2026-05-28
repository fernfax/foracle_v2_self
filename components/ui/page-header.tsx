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
 * Stacking contract (locked in eng review D9, revised after the desktop
 * app-shell header was removed):
 * - Sidebar             → sticky top-0  z-50
 * - App shell header    → mobile only (sticky top-0 z-40, 70px tall, in dashboard-shell.tsx)
 * - PageHeader (this)   → sticky top-[70px] on mobile / top-0 on desktop, z-30
 *
 * The negative top margin offsets <main>'s top padding so the header's
 * natural position aligns with its sticky anchor. On desktop <main> has
 * pt-0 (no app-shell header to clear), so the negative margin zeroes out
 * too — otherwise the header would scroll up past the column edge.
 *
 * Negative horizontal margins (-mx-*) bleed the bar to the edges of the
 * main column container.
 *
 * Mobile: the inner overflow-x-auto wrapper lets the tab strip scroll
 * horizontally on narrow viewports (D6).
 */
export function PageHeader({ title, actions, tabs }: PageHeaderProps) {
  return (
    <div className="sticky top-[70px] md:top-0 z-30 bg-background border-b border-border/20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 md:mt-0">
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
