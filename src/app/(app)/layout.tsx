import { redirect } from "next/navigation"
import { checkOnboardingStatus } from "@/actions/onboarding"
import { getBackgroundDecor } from "@/actions/singlish-mode"
import { auth } from "@clerk/nextjs/server"

import { AddExpenseProvider } from "@/components/budget"
import { LayoutDashboardShell } from "@/components/layout/layout-dashboard-shell"
import { TourProvider } from "@/components/tour/tour-provider"

export default async function AppLayout({
  children
}: {
  children: React.ReactNode
}) {
  // First check if user is authenticated
  const { userId } = await auth()
  if (!userId) {
    // Let Clerk handle the redirect to sign-in
    redirect("/sign-in")
  }

  // Then check if user has completed onboarding
  const isOnboarded = await checkOnboardingStatus()
  if (!isOnboarded) {
    redirect("/onboarding")
  }

  const backgroundDecor = await getBackgroundDecor()

  return (
    <TourProvider userId={userId}>
      <AddExpenseProvider>
        {/* RadialDecor / PeranakanTilesDecor mounted inside DashboardShell's
            bg-background div — paints above canvas, below content. */}
        <LayoutDashboardShell backgroundDecor={backgroundDecor}>
          {children}
        </LayoutDashboardShell>
      </AddExpenseProvider>
    </TourProvider>
  )
}
