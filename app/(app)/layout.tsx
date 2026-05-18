import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { checkOnboardingStatus } from "@/lib/actions/onboarding";
import { getBackgroundDecor } from "@/lib/actions/singlish-mode";
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

  const backgroundDecor = await getBackgroundDecor();

  return (
    <TourProvider userId={userId}>
      <AddExpenseProvider>
        {/* RadialDecor / PeranakanTilesDecor mounted inside DashboardShell's
            bg-background div — paints above canvas, below content. */}
        <DashboardShell backgroundDecor={backgroundDecor}>{children}</DashboardShell>
      </AddExpenseProvider>
    </TourProvider>
  );
}
