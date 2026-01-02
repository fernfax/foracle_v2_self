import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardNav } from "@/components/dashboard-nav";
import { MobileNav } from "@/components/mobile-nav";
import { HeaderQuickLinks } from "@/components/header/header-quick-links";
import { ClerkUserButton } from "@/components/clerk-user-button";
import { checkOnboardingStatus } from "@/lib/actions/onboarding";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // First check if user is authenticated
  const { userId } = await auth();
  if (!userId) {
    // Let Clerk handle the redirect to sign-in
    redirect("/sign-in");
  }

  // Then check if user has completed onboarding
  const isOnboarded = await checkOnboardingStatus();
  if (!isOnboarded) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 h-20 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/wordmark-168.png"
              alt="Foracle"
              width={97}
              height={28}
              className="object-contain"
            />
          </Link>

          {/* Quick Links - Center */}
          <div className="flex items-center">
            <HeaderQuickLinks />
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <ClerkUserButton />
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation - Hidden on mobile, visible on md+ */}
          <aside className="sidebar-nav w-64 shrink-0 pr-8 border-r border-border/60 py-6 sm:py-8">
            <DashboardNav />
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 py-6 sm:py-8">{children}</main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Spacer for mobile bottom nav */}
      <div className="bottom-spacer h-16"></div>
    </div>
  );
}
