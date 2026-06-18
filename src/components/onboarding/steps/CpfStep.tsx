"use client"

import { useEffect, useState } from "react"
import { updateIncome } from "@/actions/incomes"
import { Info, Lightbulb } from "lucide-react"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WizardNavigation } from "@/components/onboarding/WizardNavigation"
import type { CpfData, IncomeData } from "@/app/onboarding/OnboardingWizard"

interface CpfStepProps {
  income: IncomeData | null
  data: CpfData | null
  onSave: (data: CpfData) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

export function CpfStep({
  income,
  data,
  onSave,
  onNext,
  onBack,
  onSkip
}: CpfStepProps) {
  const [oaAmount, setOaAmount] = useState(data?.cpfOrdinaryAccount || "")
  const [saAmount, setSaAmount] = useState(data?.cpfSpecialAccount || "")
  const [maAmount, setMaAmount] = useState(data?.cpfMedisaveAccount || "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update form when data changes
  useEffect(() => {
    if (data) {
      setOaAmount(data.cpfOrdinaryAccount)
      setSaAmount(data.cpfSpecialAccount)
      setMaAmount(data.cpfMedisaveAccount)
    }
  }, [data])

  // If income is not subject to CPF, skip this step
  const shouldShowCpf = income?.subjectToCpf === true

  // Calculate total CPF
  const totalCpf =
    (parseFloat(oaAmount) || 0) +
    (parseFloat(saAmount) || 0) +
    (parseFloat(maAmount) || 0)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Update income with CPF allocation if we have valid amounts
      if (income?.id && totalCpf > 0) {
        await updateIncome(income.id, {
          cpfOrdinaryAccount: parseFloat(oaAmount) || 0,
          cpfSpecialAccount: parseFloat(saAmount) || 0,
          cpfMedisaveAccount: parseFloat(maAmount) || 0
        })
      }

      onSave({
        cpfOrdinaryAccount: oaAmount || "0",
        cpfSpecialAccount: saAmount || "0",
        cpfMedisaveAccount: maAmount || "0"
      })
      onNext()
    } catch (error) {
      console.error("Failed to save CPF data:", error)
      toast.error("Could not save your CPF details. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!shouldShowCpf) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Info className="text-muted-foreground h-8 w-8" />
          </div>
          <h3 className="mb-2 text-lg font-medium">CPF Not Applicable</h3>
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
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-6">
        <div className="border-border/60 bg-muted/30 rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">
            Enter your current CPF Holdings. This helps track your retirement
            savings and housing funds.
          </p>
        </div>

        {/* OA Amount */}
        <div className="space-y-2">
          <Label htmlFor="oa">Ordinary Account (OA)</Label>
          <div className="relative">
            <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
              $
            </span>
            <Input
              id="oa"
              type="number"
              placeholder="0.00"
              value={oaAmount}
              onChange={(e) => setOaAmount(e.target.value)}
              className="bg-background pl-7"
              min="0"
              step="0.01"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Used for housing, education, and investments
          </p>
        </div>

        {/* SA Amount */}
        <div className="space-y-2">
          <Label htmlFor="sa">Special Account (SA)</Label>
          <div className="relative">
            <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
              $
            </span>
            <Input
              id="sa"
              type="number"
              placeholder="0.00"
              value={saAmount}
              onChange={(e) => setSaAmount(e.target.value)}
              className="bg-background pl-7"
              min="0"
              step="0.01"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            For retirement and investment in retirement-related products
          </p>
        </div>

        {/* MA Amount */}
        <div className="space-y-2">
          <Label htmlFor="ma">Medisave Account (MA)</Label>
          <div className="relative">
            <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
              $
            </span>
            <Input
              id="ma"
              type="number"
              placeholder="0.00"
              value={maAmount}
              onChange={(e) => setMaAmount(e.target.value)}
              className="bg-background pl-7"
              min="0"
              step="0.01"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            For healthcare expenses and medical insurance
          </p>
        </div>

        {/* Customize Later Info Box */}
        <div className="flex gap-3 rounded-xl border border-[rgba(184,98,42,0.25)] bg-[rgba(184,98,42,0.06)] p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(184,98,42,0.10)]">
            <Lightbulb className="h-4 w-4 text-[#7A5A00]" />
          </div>
          <div>
            <p className="text-foreground text-sm font-medium">
              Customize Later
            </p>
            <p className="text-muted-foreground text-sm">
              You can update your CPF holdings and add CPF for other family
              members from your dashboard.
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
  )
}
