"use client";

import { useState, useEffect } from "react";
import { WizardNavigation } from "../WizardNavigation";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { getCurrentHoldings } from "@/lib/actions/current-holdings";
import type { OnboardingData, HoldingData } from "@/app/onboarding/OnboardingWizard";
import {
  User,
  DollarSign,
  PiggyBank,
  Building2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface ConfirmationStepProps {
  data: OnboardingData;
  onComplete: () => void;
  onBack: () => void;
}

export function ConfirmationStep({ data, onComplete, onBack }: ConfirmationStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbHoldings, setDbHoldings] = useState<HoldingData[]>([]);

  // Fetch holdings from database to ensure accurate display
  useEffect(() => {
    async function fetchHoldings() {
      try {
        const holdings = await getCurrentHoldings();
        setDbHoldings(
          holdings.map((h) => ({
            id: h.id,
            bankName: h.bankName,
            holdingAmount: h.holdingAmount,
          }))
        );
      } catch (error) {
        console.error("Failed to fetch holdings:", error);
      }
    }
    fetchHoldings();
  }, []);

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding();
      onComplete();
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const summaryItems = [
    {
      icon: User,
      label: "Profile",
      value: data.familyMember?.name || "Not set",
      subValue: data.familyMember?.relationship,
      isSet: !!data.familyMember,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      icon: DollarSign,
      label: "Income",
      value: data.income?.name || "Not set",
      subValue: data.income
        ? `$${parseFloat(data.income.amount).toLocaleString("en-SG")} / ${data.income.frequency}`
        : undefined,
      isSet: !!data.income,
      bgColor: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      icon: PiggyBank,
      label: "CPF",
      value: data.cpf ? "Configured" : "Skipped",
      subValue: data.cpf
        ? `OA: $${parseFloat(data.cpf.cpfOrdinaryAccount).toLocaleString("en-SG")} | SA: $${parseFloat(data.cpf.cpfSpecialAccount).toLocaleString("en-SG")} | MA: $${parseFloat(data.cpf.cpfMedisaveAccount).toLocaleString("en-SG")}`
        : undefined,
      isSet: !!data.cpf && parseFloat(data.cpf.cpfOrdinaryAccount) > 0,
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      icon: Building2,
      label: "Holdings",
      value:
        dbHoldings.length > 0
          ? `${dbHoldings.length} account${dbHoldings.length > 1 ? "s" : ""}`
          : "Skipped",
      subValue:
        dbHoldings.length > 0
          ? `Total: $${dbHoldings
              .reduce((sum, h) => sum + parseFloat(h.holdingAmount), 0)
              .toLocaleString("en-SG")}`
          : undefined,
      isSet: dbHoldings.length > 0,
      bgColor: "bg-amber-100",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 space-y-8">
        {/* Success Header */}
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Great job!</h2>
          <p className="text-muted-foreground">
            Here's a summary of what you've set up. You can always update these
            from your dashboard.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="space-y-3">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  item.isSet ? item.bgColor : "bg-muted"
                }`}
              >
                <item.icon
                  className={`h-6 w-6 ${
                    item.isSet ? item.iconColor : "text-muted-foreground"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="font-medium truncate">{item.value}</p>
                {item.subValue && (
                  <p className="text-sm text-muted-foreground truncate">
                    {item.subValue}
                  </p>
                )}
              </div>
              {item.isSet && (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Next Steps */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
          <h3 className="font-medium mb-2">What's next?</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• View your financial dashboard with projections</li>
            <li>• Add more income sources and family members</li>
            <li>• Set up your financial goals</li>
            <li>• Track your expenses</li>
          </ul>
        </div>
      </div>

      <WizardNavigation
        onBack={onBack}
        onNext={handleComplete}
        isLastStep
        canProceed={true}
        isSubmitting={isSubmitting}
        nextLabel="Complete Setup"
      />
    </div>
  );
}
