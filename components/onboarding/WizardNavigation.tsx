"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface WizardNavigationProps {
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
  isOptional?: boolean;
  canProceed?: boolean;
  isSubmitting?: boolean;
  nextLabel?: string;
  backLabel?: string;
}

export function WizardNavigation({
  onBack,
  onNext,
  onSkip,
  isFirstStep = false,
  isLastStep = false,
  isOptional = false,
  canProceed = true,
  isSubmitting = false,
  nextLabel,
  backLabel = "Back",
}: WizardNavigationProps) {
  const getNextLabel = () => {
    if (nextLabel) return nextLabel;
    if (isLastStep) return "Complete Setup";
    return "Continue";
  };

  return (
    <div className="flex items-center justify-between pt-6 mt-auto border-t border-border/60">
      <div>
        {!isFirstStep && onBack && (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={isSubmitting}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {backLabel}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isOptional && onSkip && (
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            disabled={isSubmitting}
          >
            Skip for now
          </Button>
        )}
        <Button
          type="button"
          onClick={onNext}
          disabled={!canProceed || isSubmitting}
          className={`gap-2 min-w-[140px] ${
            isLastStep
              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
              : ""
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isLastStep ? "Completing..." : "Saving..."}
            </>
          ) : (
            <>
              {getNextLabel()}
              {!isLastStep && <ChevronRight className="h-4 w-4" />}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
