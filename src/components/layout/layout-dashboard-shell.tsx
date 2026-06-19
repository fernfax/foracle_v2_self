"use client"

import { CSSProperties, ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"

import type { BackgroundDecor } from "@/lib/services/user-prefs"
import { FabStackHost } from "@/components/ui/fab-stack"
import {
  BudgetFloatingAddButton,
  BudgetGlobalAddExpenseModal
} from "@/components/budget"
import { LayoutPeranakanTilesDecor } from "@/components/layout/layout-peranakan-tiles-decor"
import { LayoutRadialDecor } from "@/components/layout/layout-radial-decor"
import { NavigationClerkUserButton } from "@/components/navigation/navigation-clerk-user-button"
import { NavigationMobileNav } from "@/components/navigation/navigation-mobile-nav"
import { NavigationOverlay } from "@/components/navigation/navigation-overlay"
import { NavigationSidebar } from "@/components/navigation/navigation-sidebar"
import {
  SidebarProvider,
  useSidebar
} from "@/components/navigation/navigation-sidebar-context"
import { TourHelpButton } from "@/components/tour/tour-help-button"

interface DashboardShellProps {
  children: ReactNode
  backgroundDecor?: BackgroundDecor
}

const SIDEBAR_W_EXPANDED = 260
const SIDEBAR_W_COLLAPSED = 72

function DashboardContent({ children }: { children: ReactNode }) {
  const { isExpanded } = useSidebar()

  // Layout is CSS-driven via the `desktop:` media variant (width ≥ 768 AND
  // height ≥ 600 — see globals.css), NOT a JS viewport check. That means the
  // very first server-rendered paint is already correct on mobile: no flash of
  // the desktop sidebar before hydration, and phone-landscape stays on mobile
  // chrome. The dynamic sidebar width rides in on a CSS var that only the
  // `desktop:` grid column consumes; on mobile the grid is a single 1fr column,
  // so the (CSS-hidden) sidebar takes no space.
  const sidebarW = isExpanded ? SIDEBAR_W_EXPANDED : SIDEBAR_W_COLLAPSED

  return (
    <div
      className="desktop:grid-cols-[var(--sidebar-w)_1fr] grid min-h-screen grid-cols-[1fr] motion-safe:transition-[grid-template-columns] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{ "--sidebar-w": `${sidebarW}px` } as CSSProperties}>
      {/* Skip-link target — appears on first Tab, lands focus past the sidebar. */}
      <a
        href="#main"
        className="focus:bg-background focus:ring-primary/40 sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:ring-2">
        Skip to main content
      </a>
      {/* Sidebar is always rendered; it hides itself on mobile via CSS
          (`hidden desktop:flex`), so SSR/first paint is correct without a JS
          viewport check. display:none keeps it out of the grid on mobile. */}
      <NavigationSidebar />

      {/* Main column — the min-w-0 prevents grid items from refusing to shrink below their content size */}
      <div className="flex min-w-0 flex-col">
        {/* Status-bar scrim — mobile only (CSS-gated via `desktop:hidden`). The
            old 70px header used to supply env(safe-area-inset-top); without a
            cover, scrolling content shows under the Dynamic Island. This thin
            fixed strip keeps the notch area opaque. */}
        <div
          aria-hidden
          className="bg-background/95 desktop:hidden fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] backdrop-blur-md"
        />

        {/* Main Content — contain layout so internal reflows don't bubble to the grid wrapper */}
        <div className="flex-1 [contain:layout_paint]">
          <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
            {/* Minimal centered wordmark — mobile only (CSS-gated via
                `desktop:hidden`), scrolls with content (Whoop-style). Owns the
                safe-area top inset so content clears the notch on first paint.
                Desktop uses the sidebar instead. */}
            <div className="desktop:hidden relative flex items-center justify-center pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-1">
              <Link href="/user/overview" className="flex items-center">
                <Image
                  src="/wordmark-400.png"
                  alt="Foracle"
                  width={160}
                  height={46}
                  className="h-[26px] w-auto object-contain opacity-90 dark:brightness-0 dark:invert"
                  priority
                />
              </Link>
              {/* Account avatar — top-right of the mobile header (native app
                  pattern: avatar up top, tabs at the bottom). Opens the Clerk
                  menu (sign-out + Family/Display). Vertically aligned with the
                  wordmark by sharing the same safe-area top inset. */}
              <div className="absolute top-[calc(env(safe-area-inset-top)+0.5rem)] right-0 flex items-center">
                <NavigationClerkUserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: { width: "2rem", height: "2rem" }
                    }
                  }}
                />
              </div>
            </div>
            {/* Desktop has no top header anymore — let page headers sit flush
                against the top edge. Mobile keeps the standard top padding;
                PageHeader's negative top margin cancels it. The `desktop:`
                variant requires both width and height, so phone landscape stays
                in mobile layout — see globals.css. */}
            <main id="main" className="desktop:pt-0 pt-6 pb-6 sm:pt-8 sm:pb-8">
              {children}
            </main>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <NavigationMobileNav />

      <div className="bottom-spacer h-24"></div>

      {/* Shared bottom-right FAB stack. The host lives here (outside the
          contained content box); HelpButton/FloatingAddButton and any
          page-level FABs (budget add, timeline edit) portal into it. */}
      <FabStackHost />
      <TourHelpButton />
      <BudgetFloatingAddButton />
      <BudgetGlobalAddExpenseModal />
      <NavigationOverlay />
    </div>
  )
}

export function LayoutDashboardShell({
  children,
  backgroundDecor = "radial"
}: DashboardShellProps) {
  return (
    <SidebarProvider>
      <div className="bg-background relative isolate min-h-screen">
        {/* Atmospheric decor — `fixed inset-0 -z-10` pins it to the viewport
            so it stays put as the page scrolls. `isolate` on this wrapper
            creates a stacking context so `-z-10` lands below normal-flow
            content but above the parent's bg-background fill. */}
        {backgroundDecor === "radial" && <LayoutRadialDecor />}
        {backgroundDecor === "peranakan" && <LayoutPeranakanTilesDecor />}
        <DashboardContent>{children}</DashboardContent>
      </div>
    </SidebarProvider>
  )
}
