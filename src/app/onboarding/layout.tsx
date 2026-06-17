import { redirect } from "next/navigation"
import { checkOnboardingStatus } from "@/actions/onboarding"
import { auth } from "@clerk/nextjs/server"

import { LandingShader } from "@/components/landing/landing-shader"

export default async function OnboardingLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  // Redirect to sign-in if not authenticated
  if (!userId) {
    redirect("/sign-in")
  }

  // Redirect to dashboard if already onboarded
  const isOnboarded = await checkOnboardingStatus()
  if (isOnboarded) {
    redirect("/overview")
  }

  return (
    <div className="relative min-h-screen bg-transparent">
      {/* Same calm mesh-gradient shader as the landing page. */}
      <LandingShader />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
