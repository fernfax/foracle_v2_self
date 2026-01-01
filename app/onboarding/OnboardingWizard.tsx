"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WizardContainer } from "@/components/onboarding/WizardContainer";
import { WelcomeStep } from "@/components/onboarding/steps/WelcomeStep";
import { UserDetailsStep } from "@/components/onboarding/steps/UserDetailsStep";
import { IncomeStep } from "@/components/onboarding/steps/IncomeStep";
import { CpfStep } from "@/components/onboarding/steps/CpfStep";
import { HoldingsStep } from "@/components/onboarding/steps/HoldingsStep";
import { ExpensesStep } from "@/components/onboarding/steps/ExpensesStep";
import { ConfirmationStep } from "@/components/onboarding/steps/ConfirmationStep";
import { User, DollarSign, PiggyBank, Building2, Wallet, CheckCircle2, LucideIcon } from "lucide-react";

// Type definitions for wizard data
export interface FamilyMemberData {
  id?: string;
  name: string;
  relationship: string;
  dateOfBirth: string;
  isContributing: boolean;
  notes?: string;
}

export interface BonusGroup {
  month: number;
  amount: string;
}

export interface IncomeData {
  id?: string;
  name: string;
  category: string;
  amount: string;
  frequency: string;
  subjectToCpf: boolean;
  startDate: string;
  accountForBonus?: boolean;
  bonusGroups?: BonusGroup[];
}

export interface CpfData {
  cpfOrdinaryAccount: string;
  cpfSpecialAccount: string;
  cpfMedisaveAccount: string;
}

export interface HoldingData {
  id?: string;
  bankName: string;
  holdingAmount: string;
}

export interface ExpenseSetupData {
  categories: string[];
  percentageOfIncome: number;
}

export interface OnboardingData {
  familyMember: FamilyMemberData | null;
  income: IncomeData | null;
  cpf: CpfData | null;
  holdings: HoldingData[];
  expenses: ExpenseSetupData | null;
}

const TOTAL_STEPS = 7;
const DISPLAYED_STEPS = 6; // Excludes welcome page

interface StepConfig {
  title: string;
  subtitle: string;
  showProgress?: boolean;
  displayStep: number;
  icon?: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
}

const STEP_CONFIG: StepConfig[] = [
  { title: "", subtitle: "", showProgress: false, displayStep: 0 }, // Welcome - no step number
  { title: "Tell us about yourself", subtitle: "Let's start with your basic information", displayStep: 1, icon: User, iconBgColor: "bg-blue-100", iconColor: "text-blue-600" },
  { title: "Your Income", subtitle: "Add your primary source of income", displayStep: 2, icon: DollarSign, iconBgColor: "bg-emerald-100", iconColor: "text-emerald-600" },
  { title: "CPF Allocation", subtitle: "Add your CPF Holdings (Optional)", displayStep: 3, icon: PiggyBank, iconBgColor: "bg-purple-100", iconColor: "text-purple-600" },
  { title: "Current Holdings", subtitle: "Add your bank accounts and savings (Optional)", displayStep: 4, icon: Building2, iconBgColor: "bg-amber-100", iconColor: "text-amber-600" },
  { title: "Your Expenses", subtitle: "Choose the categories where you typically spend money", displayStep: 5, icon: Wallet, iconBgColor: "bg-rose-100", iconColor: "text-rose-600" },
  { title: "You're all set!", subtitle: "Review your information and complete setup", displayStep: 6, icon: CheckCircle2, iconBgColor: "bg-emerald-100", iconColor: "text-emerald-600" },
];

export function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStep = parseInt(searchParams.get("step") || "1", 10);

  const [currentStep, setCurrentStep] = useState(
    isNaN(initialStep) || initialStep < 1 || initialStep > TOTAL_STEPS ? 1 : initialStep
  );

  // Wizard data state
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    familyMember: null,
    income: null,
    cpf: null,
    holdings: [],
    expenses: null,
  });

  // Navigation handlers
  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
    router.push(`/onboarding?step=${step}`, { scroll: false });
  }, [router]);

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, goToStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  const handleSkip = useCallback(() => {
    handleNext();
  }, [handleNext]);

  // Data update handlers
  const updateFamilyMember = useCallback((data: FamilyMemberData) => {
    setOnboardingData((prev) => ({ ...prev, familyMember: data }));
  }, []);

  const updateIncome = useCallback((data: IncomeData) => {
    setOnboardingData((prev) => ({ ...prev, income: data }));
  }, []);

  const updateCpf = useCallback((data: CpfData) => {
    setOnboardingData((prev) => ({ ...prev, cpf: data }));
  }, []);

  const addHolding = useCallback((data: HoldingData) => {
    setOnboardingData((prev) => ({
      ...prev,
      holdings: [...prev.holdings, data],
    }));
  }, []);

  const updateExpenses = useCallback((data: ExpenseSetupData) => {
    setOnboardingData((prev) => ({ ...prev, expenses: data }));
  }, []);

  const handleComplete = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const config = STEP_CONFIG[currentStep - 1];

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep onNext={handleNext} />;
      case 2:
        return (
          <UserDetailsStep
            data={onboardingData.familyMember}
            onSave={updateFamilyMember}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <IncomeStep
            familyMember={onboardingData.familyMember}
            data={onboardingData.income}
            onSave={updateIncome}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
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
        );
      case 5:
        return (
          <HoldingsStep
            familyMember={onboardingData.familyMember}
            holdings={onboardingData.holdings}
            onAdd={addHolding}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );
      case 6:
        return (
          <ExpensesStep
            income={onboardingData.income}
            data={onboardingData.expenses}
            onSave={updateExpenses}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );
      case 7:
        return (
          <ConfirmationStep
            data={onboardingData}
            onComplete={handleComplete}
            onBack={handleBack}
          />
        );
      default:
        return <WelcomeStep onNext={handleNext} />;
    }
  };

  return (
    <WizardContainer
      currentStep={config.displayStep}
      totalSteps={DISPLAYED_STEPS}
      title={config.title}
      subtitle={config.subtitle}
      showProgress={config.showProgress !== false}
      icon={config.icon}
      iconBgColor={config.iconBgColor}
      iconColor={config.iconColor}
    >
      {renderStep()}
    </WizardContainer>
  );
}
