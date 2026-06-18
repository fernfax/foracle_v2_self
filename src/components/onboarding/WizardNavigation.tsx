"use client"

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

interface WizardNavigationProps {
  onBack?: () => void
  onNext: () => void
  onSkip?: () => void
  isFirstStep?: boolean
  isLastStep?: boolean
  isOptional?: boolean
  canProceed?: boolean
  isSubmitting?: boolean
  nextLabel?: string
  backLabel?: string
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
  backLabel = "Back"
}: WizardNavigationProps) {
  const getNextLabel = () => {
    if (nextLabel) return nextLabel
    if (isLastStep) return "Complete Setup"
    return "Continue"
  }

  return (
    <div className="border-border/60 mt-auto flex items-center justify-between border-t pt-6">
      <div>
        {!isFirstStep && onBack && (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={isSubmitting}
            className="gap-2">
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
            disabled={isSubmitting}>
            Skip for now
          </Button>
        )}
        <Button
          type="button"
          onClick={onNext}
          disabled={!canProceed || isSubmitting}
          className={`min-w-[140px] gap-2 ${
            isLastStep
              ? "bg-brand-terracotta shadow-brand-terracotta/20 hover:bg-brand-terracotta text-white shadow-lg"
              : ""
          }`}>
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
  )
}
