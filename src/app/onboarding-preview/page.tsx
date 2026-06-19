import { OnboardingWizard } from "@/app/onboarding/onboarding-wizard"

export const dynamic = "force-dynamic"

// Read-only walkthrough of the onboarding flow. Reuses the same
// OnboardingWizard component as the real flow (single source of truth so
// the preview stays in sync), driven by the `previewMode` prop which:
//   - prevents router-driven step navigation
//   - wraps the step UI in pointer-events-none so submit buttons can't fire
//   - replaces the wizard's exit with a "restart" loop
export default function OnboardingPreviewPage() {
  return <OnboardingWizard previewMode />
}
