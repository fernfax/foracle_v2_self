"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { WizardNavigation } from "../WizardNavigation";
import { addCurrentHolding, getCurrentHoldings } from "@/lib/actions/current-holdings";
import type { FamilyMemberData, HoldingData } from "@/app/onboarding/OnboardingWizard";
import { Plus, Trash2, Building2, Lightbulb } from "lucide-react";

interface HoldingsStepProps {
  familyMember: FamilyMemberData | null;
  holdings: HoldingData[];
  onAdd: (data: HoldingData) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function HoldingsStep({
  familyMember,
  holdings,
  onAdd,
  onNext,
  onBack,
  onSkip,
}: HoldingsStepProps) {
  const [bankName, setBankName] = useState("");
  const [holdingAmount, setHoldingAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localHoldings, setLocalHoldings] = useState<HoldingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch holdings from database on mount (ensures data persists across navigation)
  useEffect(() => {
    async function fetchHoldings() {
      try {
        const dbHoldings = await getCurrentHoldings();
        setLocalHoldings(
          dbHoldings.map((h) => ({
            id: h.id,
            bankName: h.bankName,
            holdingAmount: h.holdingAmount,
          }))
        );
      } catch (error) {
        console.error("Failed to fetch holdings:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHoldings();
  }, []);

  const isFormValid = bankName && holdingAmount && parseFloat(holdingAmount) > 0;

  const handleAddHolding = async () => {
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      const savedHolding = await addCurrentHolding({
        bankName,
        holdingAmount: parseFloat(holdingAmount),
        familyMemberId: familyMember?.id || null,
      });

      const newHolding: HoldingData = {
        id: savedHolding.id,
        bankName,
        holdingAmount,
      };

      setLocalHoldings((prev) => [...prev, newHolding]);
      onAdd(newHolding);

      // Reset form
      setBankName("");
      setHoldingAmount("");
    } catch (error) {
      console.error("Failed to add holding:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalHoldings = localHoldings.reduce(
    (sum, h) => sum + (parseFloat(h.holdingAmount) || 0),
    0
  );

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading holdings...</p>
        </div>
        <WizardNavigation
          onBack={onBack}
          onNext={onNext}
          isOptional
          onSkip={onSkip}
          canProceed={true}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="space-y-6 flex-1">
        {/* Added Holdings List */}
        {localHoldings.length > 0 && (
          <div className="space-y-3">
            <Label>Your Holdings</Label>
            <div className="space-y-2">
              {localHoldings.map((holding, index) => (
                <div
                  key={holding.id || index}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{holding.bankName}</p>
                      <p className="text-sm text-muted-foreground">Bank Account</p>
                    </div>
                  </div>
                  <p className="font-semibold">
                    ${parseFloat(holding.holdingAmount).toLocaleString("en-SG", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="font-medium">Total Holdings</span>
              <span className="text-lg font-semibold">
                ${totalHoldings.toLocaleString("en-SG", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* Add New Holding Form */}
        <div className="space-y-4 rounded-lg border border-border/60 p-4">
          <h3 className="font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Bank Account
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                placeholder="e.g., DBS, OCBC, UOB"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (SGD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={holdingAmount}
                  onChange={(e) => setHoldingAmount(e.target.value)}
                  className="pl-7 bg-background"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleAddHolding}
            disabled={!isFormValid || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Adding..." : "Add Account"}
          </Button>
        </div>

        {localHoldings.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Add your bank accounts and savings to track your total holdings.
            You can skip this step and add them later.
          </p>
        )}

        {/* Add More Later Info Box */}
        <div className="flex gap-3 p-4 rounded-xl bg-[#eaeffc] border border-blue-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <Lightbulb className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Add More Later
            </p>
            <p className="text-sm text-muted-foreground">
              You can add more holdings and holdings for other family members from your dashboard.
            </p>
          </div>
        </div>
      </div>

      <WizardNavigation
        onBack={onBack}
        onNext={onNext}
        isOptional
        onSkip={onSkip}
        canProceed={true}
      />
    </div>
  );
}
