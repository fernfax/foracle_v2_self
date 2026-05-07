import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { FloatingIcons } from "@/components/landing/floating-icons";
import { HeroBlurMask } from "@/components/landing/hero-blur-mask";

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
    <div className="relative min-h-screen bg-gradient-to-br from-background via-background to-[#F0EBE0]/30">
      <div className="absolute inset-0 bg-[#F0EBE0]/20" />
      <FloatingIcons />
      <HeroBlurMask />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
