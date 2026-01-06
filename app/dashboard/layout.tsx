import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Smartphone } from "lucide-react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { HeaderQuickLinks } from "@/components/header/header-quick-links";
import { ClerkUserButton } from "@/components/clerk-user-button";
import { checkOnboardingStatus } from "@/lib/actions/onboarding";
import { TourProvider } from "@/components/tour/tour-provider";
import { HelpButton } from "@/components/tour/help-button";

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
    <TourProvider userId={userId}>
      <div className="min-h-screen bg-background">
        {/* Fixed Sidebar - Hidden on mobile, visible on md+ */}
        <Sidebar />

        {/* Top Navigation */}
        <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl md:pl-[72px]">
          <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 h-[70px] flex justify-between items-center">
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/wordmark-400.png"
                alt="Foracle"
                width={112}
                height={32}
                className="object-contain"
                priority
              />
            </Link>

            {/* Quick Links - Center */}
            <div className="flex items-center">
              <HeaderQuickLinks />
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/mobile-guide"
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                title="Add to Home Screen Guide"
                data-tour="mobile-guide-btn"
              >
                <Smartphone className="h-5 w-5 text-slate-600" />
              </Link>
              <ClerkUserButton />
            </div>
          </div>
        </header>

        {/* Main Content - Add left margin for sidebar on desktop */}
        <div className="md:ml-[72px]">
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
      </div>
    </TourProvider>
  );
}
