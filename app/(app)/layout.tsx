import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { checkOnboardingStatus } from "@/lib/actions/onboarding";
import { TourProvider } from "@/components/tour/tour-provider";
import { AddExpenseProvider } from "@/components/budget";
import { DashboardShell } from "@/components/sidebar/dashboard-shell";

export default async function AppLayout({
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
      <AddExpenseProvider>
        <DashboardShell>{children}</DashboardShell>
      </AddExpenseProvider>
    </TourProvider>
  );
}
