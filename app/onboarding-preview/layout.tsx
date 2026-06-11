import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { LandingShader } from "@/components/landing/landing-shader";

// Mirrors /onboarding/layout.tsx visually but deliberately omits the
// "already onboarded → redirect to /overview" gate. This is the read-only
// preview accessed from the help-button menu, so it must be reachable
// regardless of the user's onboarding status.
export default async function OnboardingPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="relative min-h-screen bg-transparent">
      {/* Same calm mesh-gradient shader as the landing page. */}
      <LandingShader />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
