"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Smartphone } from "lucide-react";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { Sidebar } from "./sidebar";
import { MobileNav } from "@/components/mobile-nav";
// Header quick-links are temporarily hidden across the app. The feature is
// intact in `components/header/*` and `lib/actions/quick-links.ts`. To restore,
// re-enable the import and the `<HeaderQuickLinks />` block below.
// import { HeaderQuickLinks } from "@/components/header/header-quick-links";
import { HelpButton } from "@/components/tour/help-button";
import { FloatingAddButton, GlobalAddExpenseModal } from "@/components/budget";
import { ClerkUserButton } from "@/components/clerk-user-button";
import { RadialDecor } from "@/components/ui/radial-decor";
import { PeranakanTilesDecor } from "@/components/ui/peranakan-tiles-decor";
import type { BackgroundDecor } from "@/lib/services/user-prefs";

interface DashboardShellProps {
  children: ReactNode;
  backgroundDecor?: BackgroundDecor;
}

const SIDEBAR_W_EXPANDED = 260;
const SIDEBAR_W_COLLAPSED = 72;

function useIsDesktop() {
  // Default to true for SSR — corrected on client mount.
  const [isDesktop, setIsDesktop] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
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
        <header className="sticky top-0 z-40 border-b border-border/30 bg-background/95">
          <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 h-[70px] flex items-center">
            {/* Logo - mobile only */}
            <Link href="/overview" className="flex items-center md:hidden">
              <Image
                src="/wordmark-400.png"
                alt="Foracle"
                width={112}
                height={32}
                className="object-contain"
                priority
              />
            </Link>

            {/* Header quick-links hidden — see the comment near the import
                at the top of this file for how to put them back. */}
            {/* {isDesktop && (
              <div className="flex-1 flex justify-center">
                <HeaderQuickLinks />
              </div>
            )} */}

            <div className="flex items-center gap-4 ml-auto">
              <Link
                href="/mobile-guide"
                className="p-2 rounded-md hover:bg-muted transition-colors"
                title="Add to Home Screen Guide"
                data-tour="mobile-guide-btn"
              >
                <Smartphone className="h-5 w-5 text-foreground/55" />
              </Link>
              {/* Avatar / Manage Account — mobile only. Desktop has its own
                  ClerkUserButton inside the sidebar footer. */}
              <div className="md:hidden">
                <ClerkUserButton
                  afterSignOutUrl="/"
                  appearance={{ elements: { avatarBox: "w-8 h-8" } }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content — contain layout so internal reflows don't bubble to the grid wrapper */}
        <div className="flex-1 [contain:layout_paint]">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <main id="main" className="py-6 sm:py-8">{children}</main>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      <div className="bottom-spacer h-16"></div>

      <HelpButton />
      <FloatingAddButton />
      <GlobalAddExpenseModal />
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
