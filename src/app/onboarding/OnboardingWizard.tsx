"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getOnboardingData } from "@/actions/onboarding"
import {
  Building2,
  CheckCircle2,
  DollarSign,
  LucideIcon,
  PiggyBank,
  User,
  Wallet
} from "lucide-react"

import { ConfirmationStep } from "@/components/onboarding/steps/ConfirmationStep"
import { CpfStep } from "@/components/onboarding/steps/CpfStep"
import { ExpensesStep } from "@/components/onboarding/steps/ExpensesStep"
import { HoldingsStep } from "@/components/onboarding/steps/HoldingsStep"
import { IncomeStep } from "@/components/onboarding/steps/IncomeStep"
import { UserDetailsStep } from "@/components/onboarding/steps/UserDetailsStep"
import { WelcomeStep } from "@/components/onboarding/steps/WelcomeStep"
import { WizardContainer } from "@/components/onboarding/WizardContainer"

// Type definitions for wizard data
export interface FamilyMemberData {
  id?: string
  name: string
  relationship: string
  dateOfBirth: string
  isContributing: boolean
  notes?: string
}

export interface BonusGroup {
  month: number
  amount: string
}

export interface IncomeData {
  id?: string
  name: string
  category: string
  amount: string
  frequency: string
  subjectToCpf: boolean
  startDate: string
  accountForBonus?: boolean
  bonusGroups?: BonusGroup[]
}

export interface CpfData {
  cpfOrdinaryAccount: string
  cpfSpecialAccount: string
  cpfMedisaveAccount: string
}

// Holdings are owned solely by the DB during onboarding — HoldingsStep and
// ConfirmationStep both read them back directly — so the wizard never mirrors
// them in its own state. This type stays here as the shared row shape.
export interface HoldingData {
  id?: string
  bankName: string
  holdingAmount: string
}

export interface ExpenseSetupData {
  categories: string[]
  percentageOfIncome: number
}

export interface OnboardingData {
  familyMember: FamilyMemberData | null
  income: IncomeData | null
  cpf: CpfData | null
  expenses: ExpenseSetupData | null
}

const TOTAL_STEPS = 7
const DISPLAYED_STEPS = 6 // Excludes welcome page

interface StepConfig {
  title: string
  subtitle: string
  showProgress?: boolean
  displayStep: number
  icon?: LucideIcon
  iconBgColor?: string
  iconColor?: string
}

const STEP_CONFIG: StepConfig[] = [
  { title: "", subtitle: "", showProgress: false, displayStep: 0 }, // Welcome - no step number
  {
    title: "Tell us about yourself",
    subtitle: "Let's start with your basic information",
    displayStep: 1,
    icon: User,
    iconBgColor: "bg-brand-jungle/[0.12]",
    iconColor: "text-[#3A6B52]"
  },
  {
    title: "Your Income",
    subtitle: "Add your primary source of income",
    displayStep: 2,
    icon: DollarSign,
    iconBgColor: "bg-brand-teal/[0.12]",
    iconColor: "text-on-success"
  },
  {
    title: "CPF Allocation",
    subtitle: "Add your CPF Holdings (Optional)",
    displayStep: 3,
    icon: PiggyBank,
    iconBgColor: "bg-brand-terracotta/[0.12]",
    iconColor: "text-brand-terracotta"
  },
  {
    title: "Current Holdings",
    subtitle: "Add your bank accounts and savings (Optional)",
    displayStep: 4,
    icon: Building2,
    iconBgColor: "bg-brand-gold/[0.15]",
    iconColor: "text-on-warning"
  },
  {
    title: "Your Expenses",
    subtitle: "Choose the categories where you typically spend money",
    displayStep: 5,
    icon: Wallet,
    iconBgColor: "bg-brand-coral/[0.12]",
    iconColor: "text-brand-terracotta"
  },
  {
    title: "You're all set!",
    subtitle: "Review your information and complete setup",
    displayStep: 6,
    icon: CheckCircle2,
    iconBgColor: "bg-brand-teal/[0.15]",
    iconColor: "text-on-success"
  }
]

interface OnboardingWizardProps {
  // When true, the wizard runs in a sandboxed walkthrough mode used by
  // /onboarding-preview. Internal step state replaces router-driven
  // navigation, on-completion routes nowhere, and the caller is expected to
  // wrap renderStep() in `pointer-events-none` so nested submit buttons can
  // never fire. The whole wizard tree (including step components) is shared
  // between real onboarding and preview to guarantee they stay in sync —
  // when the real flow changes, the preview reflects it automatically.
  previewMode?: boolean
}

export function OnboardingWizard({
  previewMode = false
}: OnboardingWizardProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStep = parseInt(searchParams.get("step") || "1", 10)

  const [currentStep, setCurrentStep] = useState(
    isNaN(initialStep) || initialStep < 1 || initialStep > TOTAL_STEPS
      ? 1
      : initialStep
  )

  // Wizard data state
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    familyMember: null,
    income: null,
    cpf: null,
    expenses: null
  })

  // Hydrate from the DB on resume so prior answers come back and the income
  // step reuses the existing row (a fresh, empty wizard would re-insert it).
  // Skipped in preview mode, which is a sandboxed walkthrough with no user data.
  const [isHydrating, setIsHydrating] = useState(!previewMode)

  useEffect(() => {
    if (previewMode) return
    let cancelled = false
    getOnboardingData()
      .then((saved) => {
        if (!cancelled) setOnboardingData((prev) => ({ ...prev, ...saved }))
      })
      .catch((error) => {
        console.error("Failed to hydrate onboarding wizard:", error)
      })
      .finally(() => {
        if (!cancelled) setIsHydrating(false)
      })
    return () => {
      cancelled = true
    }
  }, [previewMode])

  // Navigation handlers — in preview mode the URL is never updated so the
  // user can leave the preview cleanly, and we don't accidentally interact
  // with the real onboarding-status routing logic.
  const goToStep = useCallback(
    (step: number) => {
      setCurrentStep(step)
      if (!previewMode) {
        router.push(`/onboarding?step=${step}`, { scroll: false })
      }
    },
    [router, previewMode]
  )

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      goToStep(currentStep + 1)
    }
  }, [currentStep, goToStep])

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      goToStep(currentStep - 1)
    }
  }, [currentStep, goToStep])

  const handleSkip = useCallback(() => {
    handleNext()
  }, [handleNext])

  // Data update handlers
  const updateFamilyMember = useCallback((data: FamilyMemberData) => {
    setOnboardingData((prev) => ({ ...prev, familyMember: data }))
  }, [])

  const updateIncome = useCallback((data: IncomeData) => {
    setOnboardingData((prev) => ({ ...prev, income: data }))
  }, [])

  const updateCpf = useCallback((data: CpfData) => {
    setOnboardingData((prev) => ({ ...prev, cpf: data }))
  }, [])

  const updateExpenses = useCallback((data: ExpenseSetupData) => {
    setOnboardingData((prev) => ({ ...prev, expenses: data }))
  }, [])

  const handleComplete = useCallback(() => {
    if (previewMode) {
      // Loop back to the start so the previewer can step through repeatedly.
      goToStep(1)
      return
    }
    router.push("/overview")
  }, [router, previewMode, goToStep])

  const config = STEP_CONFIG[currentStep - 1]

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep onNext={handleNext} />
      case 2:
        return (
          <UserDetailsStep
            data={onboardingData.familyMember}
            onSave={updateFamilyMember}
            onNext={handleNext}
            onBack={handleBack}
          />
        )
      case 3:
        return (
          <IncomeStep
            familyMember={onboardingData.familyMember}
            data={onboardingData.income}
            onSave={updateIncome}
            onNext={handleNext}
            onBack={handleBack}
          />
        )
      case 4:
        return (
          <CpfStep
            income={onboardingData.income}
            data={onboardingData.cpf}
            onSave={updateCpf}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        )
      case 5:
        return (
          <HoldingsStep
            familyMember={onboardingData.familyMember}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        )
      case 6:
        return (
          <ExpensesStep
            data={onboardingData.expenses}
            onSave={updateExpenses}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        )
      case 7:
        return (
          <ConfirmationStep
            data={onboardingData}
            onComplete={handleComplete}
            onBack={handleBack}
          />
        )
      default:
        return <WelcomeStep onNext={handleNext} />
    }
  }

  // Hold the flow until hydration settles so a resuming user can't act on an
  // empty form (e.g. submit income before its saved id loads — re-inserting it).
  if (isHydrating) {
    return (
      <WizardContainer
        currentStep={config.displayStep}
        totalSteps={DISPLAYED_STEPS}
        title={config.title}
        subtitle={config.subtitle}
        showProgress={config.showProgress !== false}
        icon={config.icon}
        iconBgColor={config.iconBgColor}
        iconColor={config.iconColor}>
        <div className="flex flex-1 items-center justify-center py-12">
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      </WizardContainer>
    )
  }

  if (previewMode) {
    return (
      <div className="relative">
        {/* Top banner reminding the user this is a sandboxed walkthrough. */}
        <div className="bg-brand-terracotta fixed inset-x-0 top-0 z-50 py-2 text-center text-xs font-semibold tracking-[0.18em] text-white uppercase shadow-md">
          Preview · no data is saved
        </div>
        {/* Visual wizard, completely inert. The real Continue / Save buttons
            inside each step are visible (so the preview matches the real
            layout) but cannot fire because the whole subtree is
            pointer-events-none. */}
        <div className="pt-10">
          <div className="pointer-events-none select-none">
            <WizardContainer
              currentStep={config.displayStep}
              totalSteps={DISPLAYED_STEPS}
              title={config.title}
              subtitle={config.subtitle}
              showProgress={config.showProgress !== false}
              icon={config.icon}
              iconBgColor={config.iconBgColor}
              iconColor={config.iconColor}>
              {renderStep()}
            </WizardContainer>
          </div>
        </div>
        {/* External navigation — sole interactive surface in preview mode. */}
        <div className="border-border/40 bg-background/95 fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep <= 1}
              className="text-foreground hover:bg-muted rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40">
              ← Back
            </button>
            <span className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
              Step {currentStep} of {TOTAL_STEPS}
            </span>
            <button
              type="button"
              onClick={currentStep < TOTAL_STEPS ? handleNext : handleComplete}
              className="bg-brand-terracotta hover:bg-brand-terracotta/90 rounded-md px-4 py-2 text-sm font-semibold text-white">
              {currentStep < TOTAL_STEPS ? "Next →" : "Restart preview"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <WizardContainer
      currentStep={config.displayStep}
      totalSteps={DISPLAYED_STEPS}
      title={config.title}
      subtitle={config.subtitle}
      showProgress={config.showProgress !== false}
      icon={config.icon}
      iconBgColor={config.iconBgColor}
      iconColor={config.iconColor}>
      {renderStep()}
    </WizardContainer>
  )
}
