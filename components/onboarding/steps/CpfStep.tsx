"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WizardNavigation } from "../WizardNavigation";
import { updateIncome } from "@/lib/actions/income";
import type { IncomeData, CpfData } from "@/app/onboarding/OnboardingWizard";
import { Info, Lightbulb } from "lucide-react";

interface CpfStepProps {
  income: IncomeData | null;
  data: CpfData | null;
  onSave: (data: CpfData) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function CpfStep({ income, data, onSave, onNext, onBack, onSkip }: CpfStepProps) {
  const [oaAmount, setOaAmount] = useState(data?.cpfOrdinaryAccount || "");
  const [saAmount, setSaAmount] = useState(data?.cpfSpecialAccount || "");
  const [maAmount, setMaAmount] = useState(data?.cpfMedisaveAccount || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when data changes
  useEffect(() => {
    if (data) {
      setOaAmount(data.cpfOrdinaryAccount);
      setSaAmount(data.cpfSpecialAccount);
      setMaAmount(data.cpfMedisaveAccount);
    }
  }, [data]);

  // If income is not subject to CPF, skip this step
  const shouldShowCpf = income?.subjectToCpf === true;

  // Calculate total CPF
  const totalCpf =
    (parseFloat(oaAmount) || 0) +
    (parseFloat(saAmount) || 0) +
    (parseFloat(maAmount) || 0);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Update income with CPF allocation if we have valid amounts
      if (income?.id && totalCpf > 0) {
        await updateIncome(income.id, {
          cpfOrdinaryAccount: parseFloat(oaAmount) || 0,
          cpfSpecialAccount: parseFloat(saAmount) || 0,
          cpfMedisaveAccount: parseFloat(maAmount) || 0,
        });
      }

      onSave({
        cpfOrdinaryAccount: oaAmount || "0",
        cpfSpecialAccount: saAmount || "0",
        cpfMedisaveAccount: maAmount || "0",
      });
      onNext();
    } catch (error) {
      console.error("Failed to save CPF data:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shouldShowCpf) {
    return (
      <div className="flex flex-col flex-1">
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Info className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">CPF Not Applicable</h3>
          <p className="text-muted-foreground max-w-sm">
            Your income is not subject to CPF deductions. You can skip this step
            and proceed to the next section.
          </p>
        </div>

        <WizardNavigation
          onBack={onBack}
          onNext={onSkip}
          isOptional
          onSkip={onSkip}
          nextLabel="Skip"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="space-y-6 flex-1">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Enter your current CPF Holdings. This helps track your retirement
            savings and housing funds.
          </p>
        </div>

        {/* OA Amount */}
        <div className="space-y-2">
          <Label htmlFor="oa">Ordinary Account (OA)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="oa"
              type="number"
              placeholder="0.00"
              value={oaAmount}
              onChange={(e) => setOaAmount(e.target.value)}
              className="pl-7 bg-background"
              min="0"
              step="0.01"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Used for housing, education, and investments
          </p>
        </div>

        {/* SA Amount */}
        <div className="space-y-2">
          <Label htmlFor="sa">Special Account (SA)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="sa"
              type="number"
              placeholder="0.00"
              value={saAmount}
              onChange={(e) => setSaAmount(e.target.value)}
              className="pl-7 bg-background"
              min="0"
              step="0.01"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            For retirement and investment in retirement-related products
          </p>
        </div>

        {/* MA Amount */}
        <div className="space-y-2">
          <Label htmlFor="ma">Medisave Account (MA)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="ma"
              type="number"
              placeholder="0.00"
              value={maAmount}
              onChange={(e) => setMaAmount(e.target.value)}
              className="pl-7 bg-background"
              min="0"
              step="0.01"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            For healthcare expenses and medical insurance
          </p>
        </div>

        {/* Customize Later Info Box */}
        <div className="flex gap-3 p-4 rounded-xl bg-[#eaeffc] border border-blue-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <Lightbulb className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Customize Later
            </p>
            <p className="text-sm text-muted-foreground">
              You can update your CPF holdings and add CPF for other family members from your dashboard.
            </p>
          </div>
        </div>
      </div>

      <WizardNavigation
        onBack={onBack}
        onNext={handleSubmit}
        isOptional
        onSkip={onSkip}
        canProceed={true}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
