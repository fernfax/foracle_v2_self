"use client"

import { useEffect, useState } from "react"
import {
  addCurrentHolding,
  getCurrentHoldings
} from "@/actions/current-holdings"
import { Building2, Lightbulb, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WizardNavigation } from "@/components/onboarding/WizardNavigation"
import type {
  FamilyMemberData,
  HoldingData
} from "@/app/onboarding/OnboardingWizard"

interface HoldingsStepProps {
  familyMember: FamilyMemberData | null
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

export function HoldingsStep({
  familyMember,
  onNext,
  onBack,
  onSkip
}: HoldingsStepProps) {
  const [bankName, setBankName] = useState("")
  const [holdingAmount, setHoldingAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localHoldings, setLocalHoldings] = useState<HoldingData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch holdings from database on mount (ensures data persists across navigation)
  useEffect(() => {
    async function fetchHoldings() {
      try {
        const dbHoldings = await getCurrentHoldings()
        setLocalHoldings(
          dbHoldings.map((h) => ({
            id: h.id,
            bankName: h.bankName,
            holdingAmount: h.holdingAmount
          }))
        )
      } catch (error) {
        console.error("Failed to fetch holdings:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchHoldings()
  }, [])

  const isFormValid = bankName && holdingAmount && parseFloat(holdingAmount) > 0

  const handleAddHolding = async () => {
    if (!isFormValid) return

    setIsSubmitting(true)
    try {
      const savedHolding = await addCurrentHolding({
        bankName,
        holdingAmount: parseFloat(holdingAmount),
        familyMemberId: familyMember?.id || null
      })

      const newHolding: HoldingData = {
        id: savedHolding.id,
        bankName,
        holdingAmount
      }

      setLocalHoldings((prev) => [...prev, newHolding])

      // Reset form
      setBankName("")
      setHoldingAmount("")
    } catch (error) {
      console.error("Failed to add holding:", error)
      toast.error("Could not add the account. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalHoldings = localHoldings.reduce(
    (sum, h) => sum + (parseFloat(h.holdingAmount) || 0),
    0
  )

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center">
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
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-6">
        {/* Added Holdings List */}
        {localHoldings.length > 0 && (
          <div className="space-y-3">
            <Label>Your Holdings</Label>
            <div className="space-y-2">
              {localHoldings.map((holding, index) => (
                <div
                  key={holding.id || index}
                  className="border-border/60 bg-card flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                      <Building2 className="text-muted-foreground h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{holding.bankName}</p>
                      <p className="text-muted-foreground text-sm">
                        Bank Account
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">
                    $
                    {parseFloat(holding.holdingAmount).toLocaleString("en-SG", {
                      minimumFractionDigits: 2
                    })}
                  </p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
              <span className="font-medium">Total Holdings</span>
              <span className="text-lg font-semibold">
                $
                {totalHoldings.toLocaleString("en-SG", {
                  minimumFractionDigits: 2
                })}
              </span>
            </div>
          </div>
        )}

        {/* Add New Holding Form */}
        <div className="border-border/60 space-y-4 rounded-lg border p-4">
          <h3 className="flex items-center gap-2 font-medium">
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
                <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={holdingAmount}
                  onChange={(e) => setHoldingAmount(e.target.value)}
                  className="bg-background pl-7"
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
            className="w-full">
            {isSubmitting ? "Adding..." : "Add Account"}
          </Button>
        </div>

        {localHoldings.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            Add your bank accounts and savings to track your total holdings. You
            can skip this step and add them later.
          </p>
        )}

        {/* Add More Later Info Box */}
        <div className="border-brand-terracotta/[0.25] bg-brand-terracotta/[0.06] flex gap-3 rounded-xl border p-4">
          <div className="bg-brand-terracotta/[0.1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            <Lightbulb className="text-on-warning h-4 w-4" />
          </div>
          <div>
            <p className="text-foreground text-sm font-medium">
              Add More Later
            </p>
            <p className="text-muted-foreground text-sm">
              You can add more holdings and holdings for other family members
              from your dashboard.
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
  )
}
