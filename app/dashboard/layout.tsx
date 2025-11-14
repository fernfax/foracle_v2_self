import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { TrendingUp, Home, DollarSign, Wallet, Shield, Target, Users } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/50">
      {/* Top Navigation */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Foracle</span>
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <aside className="w-64 shrink-0">
            <nav className="space-y-2 sticky top-6">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
              >
                <Home className="h-5 w-5" />
                Dashboard
              </Link>
              <Link
                href="/dashboard/income"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
              >
                <DollarSign className="h-5 w-5" />
                Income
              </Link>
              <Link
                href="/dashboard/expenses"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
              >
                <Wallet className="h-5 w-5" />
                Expenses
              </Link>
              <Link
                href="/dashboard/assets"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
              >
                <TrendingUp className="h-5 w-5" />
                Assets
              </Link>
              <Link
                href="/dashboard/policies"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
              >
                <Shield className="h-5 w-5" />
                Policies
              </Link>
              <Link
                href="/dashboard/goals"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
              >
                <Target className="h-5 w-5" />
                Goals
              </Link>
              <Link
                href="/dashboard/family"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
              >
                <Users className="h-5 w-5" />
                Family
              </Link>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
