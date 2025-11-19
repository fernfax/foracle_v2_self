import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardNav } from "@/components/dashboard-nav";
import { MobileNav } from "@/components/mobile-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 h-16 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-foreground">
              <TrendingUp className="h-5 w-5 text-background" />
            </div>
            <span className="text-xl font-semibold tracking-tight">
              Foracle
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation - Hidden on mobile, visible on md+ */}
          <aside className="sidebar-nav w-64 shrink-0">
            <DashboardNav />
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Spacer for mobile bottom nav */}
      <div className="bottom-spacer h-16"></div>
    </div>
  );
}
