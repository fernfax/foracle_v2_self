"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { Sidebar } from "./sidebar";
import { MobileNav } from "@/components/mobile-nav";
// Header quick-links are temporarily hidden across the app. The feature is
// intact in `components/header/*` and `lib/actions/quick-links.ts`. To restore,
// re-enable the import and the `<HeaderQuickLinks />` block below.
// import { HeaderQuickLinks } from "@/components/header/header-quick-links";
import { HelpButton } from "@/components/tour/help-button";
import { FloatingAddButton, GlobalAddExpenseModal } from "@/components/budget";
import { NavigationOverlay } from "@/components/navigation-overlay";
import { RadialDecor } from "@/components/ui/radial-decor";
import { PeranakanTilesDecor } from "@/components/ui/peranakan-tiles-decor";
import type { BackgroundDecor } from "@/lib/services/user-prefs";

interface DashboardShellProps {
  children: ReactNode;
  backgroundDecor?: BackgroundDecor;
}

const SIDEBAR_W_EXPANDED = 260;
const SIDEBAR_W_COLLAPSED = 72;

// Width-only checks (≥ 768px) treat phones in landscape as desktop, which
// is wrong — a 932×430 iPhone has no room for a sidebar + content. Require
// BOTH width AND height so phones in landscape stay on the mobile layout
// (bottom tabs) while tablets (≥ 600px tall) still get the sidebar.
const DESKTOP_MIN_WIDTH = 768;
const DESKTOP_MIN_HEIGHT = 600;

function useIsDesktop() {
  // Default to true for SSR — corrected on client mount.
  const [isDesktop, setIsDesktop] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkIsDesktop = () => {
      setIsDesktop(
        window.innerWidth >= DESKTOP_MIN_WIDTH &&
        window.innerHeight >= DESKTOP_MIN_HEIGHT
      );
    };

    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    // Orientation changes on iOS sometimes fire before innerWidth/Height
    // settle, so listen to that explicitly too.
    window.addEventListener("orientationchange", checkIsDesktop);
    return () => {
      window.removeEventListener("resize", checkIsDesktop);
      window.removeEventListener("orientationchange", checkIsDesktop);
    };
  }, []);

  return mounted ? isDesktop : true;
}

function DashboardContent({ children }: { children: ReactNode }) {
  const { isExpanded } = useSidebar();
  const isDesktop = useIsDesktop();

  // Single CSS Grid coordinates the layout change in one reflow per frame
  // instead of three independent margin/width animations.
  const sidebarW = isExpanded ? SIDEBAR_W_EXPANDED : SIDEBAR_W_COLLAPSED;
  const gridTemplateColumns = isDesktop ? `${sidebarW}px 1fr` : "1fr";

  return (
    <div
      className="grid min-h-screen motion-safe:transition-[grid-template-columns] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{ gridTemplateColumns }}
    >
      {/* Skip-link target — appears on first Tab, lands focus past the sidebar. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:ring-2 focus:ring-primary/40"
      >
        Skip to main content
      </a>
      {isDesktop && <Sidebar />}

      {/* Main column — the min-w-0 prevents grid items from refusing to shrink below their content size */}
      <div className="min-w-0 flex flex-col">
        {/* Status-bar scrim — mobile only. The old 70px header used to supply
            env(safe-area-inset-top); without a cover, scrolling content shows
            under the Dynamic Island. This thin fixed strip keeps the notch area
            opaque. Driven by the JS `isDesktop` check (not `md:hidden`) so
            phone-landscape (width ≥ 768 but height < 600) keeps mobile chrome. */}
        {!isDesktop && (
          <div
            aria-hidden
            className="fixed top-0 inset-x-0 z-40 h-[env(safe-area-inset-top)] bg-background/95 backdrop-blur-md"
          />
        )}

        {/* Main Content — contain layout so internal reflows don't bubble to the grid wrapper */}
        <div className="flex-1 [contain:layout_paint]">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Minimal centered wordmark — mobile only, scrolls with content
                (Whoop-style). Owns the safe-area top inset so content clears the
                notch on first paint. Desktop uses the sidebar instead. */}
            {!isDesktop && (
              <div className="flex justify-center pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-1">
                <Link href="/user?tab=overview" className="flex items-center">
                  <Image
                    src="/wordmark-400.png"
                    alt="Foracle"
                    width={160}
                    height={46}
                    className="h-[26px] w-auto object-contain opacity-90 dark:brightness-0 dark:invert"
                    priority
                  />
                </Link>
              </div>
            )}
            {/* Desktop has no top header anymore — let page headers sit flush
                against the top edge. Mobile keeps the standard top padding;
                PageHeader's negative top margin cancels it. The `desktop:`
                variant requires both width and height, so phone landscape stays
                in mobile layout — see globals.css. */}
            <main id="main" className="pt-6 sm:pt-8 desktop:pt-0 pb-6 sm:pb-8">{children}</main>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      <div className="bottom-spacer h-24"></div>

      <HelpButton />
      <FloatingAddButton />
      <GlobalAddExpenseModal />
      <NavigationOverlay />
    </div>
  );
}

export function DashboardShell({
  children,
  backgroundDecor = "radial",
}: DashboardShellProps) {
  return (
    <SidebarProvider>
      <div className="relative isolate min-h-screen bg-background">
        {/* Atmospheric decor — `fixed inset-0 -z-10` pins it to the viewport
            so it stays put as the page scrolls. `isolate` on this wrapper
            creates a stacking context so `-z-10` lands below normal-flow
            content but above the parent's bg-background fill. */}
        {backgroundDecor === "radial" && <RadialDecor />}
        {backgroundDecor === "peranakan" && <PeranakanTilesDecor />}
        <DashboardContent>{children}</DashboardContent>
      </div>
    </SidebarProvider>
  );
}
