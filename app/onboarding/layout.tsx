import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { checkOnboardingStatus } from "@/lib/actions/onboarding";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  // Redirect to sign-in if not authenticated
  if (!userId) {
    redirect("/sign-in");
  }

  // Redirect to dashboard if already onboarded
  const isOnboarded = await checkOnboardingStatus();
  if (isOnboarded) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {children}
    </div>
  );
}
