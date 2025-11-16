import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import {
  TrendingUp,
  Home,
  DollarSign,
  Wallet,
  Shield,
  Target,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

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
            <nav className="sticky top-24 space-y-1.5">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium bg-foreground text-background transition-all"
              >
                <Home className="h-5 w-5" />
                Dashboard
              </Link>
              <Link
                href="/dashboard/income"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
              >
                <DollarSign className="h-5 w-5" />
                Income
              </Link>
              <Link
                href="/dashboard/expenses"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
              >
                <Wallet className="h-5 w-5" />
                Expenses
              </Link>
              <Link
                href="/dashboard/assets"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
              >
                <TrendingUp className="h-5 w-5" />
                Assets
              </Link>
              <Link
                href="/dashboard/policies"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
              >
                <Shield className="h-5 w-5" />
                Policies
              </Link>
              <Link
                href="/dashboard/goals"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
              >
                <Target className="h-5 w-5" />
                Goals
              </Link>
              <Link
                href="/dashboard/family"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
              >
                <Users className="h-5 w-5" />
                Family
              </Link>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav fixed bottom-0 left-0 right-0 bg-background border-t border-border/60 z-50">
        <div className="grid grid-cols-5 gap-1 p-2">
          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-1 p-2 text-foreground"
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Link>
          <Link
            href="/dashboard/income"
            className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
          >
            <DollarSign className="h-5 w-5" />
            <span className="text-xs">Income</span>
          </Link>
          <Link
            href="/dashboard/expenses"
            className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
          >
            <Wallet className="h-5 w-5" />
            <span className="text-xs">Expenses</span>
          </Link>
          <Link
            href="/dashboard/goals"
            className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
          >
            <Target className="h-5 w-5" />
            <span className="text-xs">Goals</span>
          </Link>
          <Link
            href="/dashboard/assets"
            className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs">Assets</span>
          </Link>
        </div>
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="bottom-spacer h-16"></div>
    </div>
  );
}
