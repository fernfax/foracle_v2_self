"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Smartphone } from "lucide-react";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { Sidebar } from "./sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { HeaderQuickLinks } from "@/components/header/header-quick-links";
import { HelpButton } from "@/components/tour/help-button";
import { FloatingAddButton, GlobalAddExpenseModal } from "@/components/budget";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: ReactNode;
}

function useIsDesktop() {
  // Default to true for SSR - will correct on client if needed
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

  // Return true during SSR, actual value after mount
  return mounted ? isDesktop : true;
}

function DashboardContent({ children }: { children: ReactNode }) {
  const { isExpanded } = useSidebar();
  const isDesktop = useIsDesktop();

  // On desktop, use dynamic margin; on mobile, no margin
  const marginLeft = isDesktop ? (isExpanded ? 260 : 72) : 0;

  return (
    <>
      {/* Sidebar - only render on desktop */}
      {isDesktop && <Sidebar />}

      {/* Header */}
      <header
        className={cn(
          "sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl",
          "transition-all duration-300 ease-in-out"
        )}
        style={{ marginLeft }}
      >
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 h-[70px] flex items-center">
          {/* Logo - Only visible on mobile */}
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

          {/* Quick Links - Center (only on desktop) */}
          {isDesktop && (
            <div className="flex-1 flex justify-center">
              <HeaderQuickLinks />
            </div>
          )}

          {/* Right side icons */}
          <div className="flex items-center gap-4 ml-auto">
            <Link
              href="/mobile-guide"
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="Add to Home Screen Guide"
              data-tour="mobile-guide-btn"
            >
              <Smartphone className="h-5 w-5 text-slate-600" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div
        className="transition-all duration-300 ease-in-out"
        style={{ marginLeft }}
      >
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <main className="py-6 sm:py-8">{children}</main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Spacer for mobile bottom nav */}
      <div className="bottom-spacer h-16"></div>

      {/* Help button for guided tours */}
      <HelpButton />

      {/* Floating add expense button (mobile only, non-budget pages) */}
      <FloatingAddButton />

      {/* Global add expense modal (for non-budget pages) */}
      <GlobalAddExpenseModal />
    </>
  );
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <DashboardContent>{children}</DashboardContent>
      </div>
    </SidebarProvider>
  );
}
