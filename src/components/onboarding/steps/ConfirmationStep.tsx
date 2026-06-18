"use client"

import { useEffect, useState } from "react"
import { getCurrentHoldings } from "@/actions/current-holdings"
import { getExpenses } from "@/actions/expenses"
import { completeOnboarding } from "@/actions/onboarding"
import {
  Building2,
  CheckCircle2,
  DollarSign,
  PiggyBank,
  Receipt,
  Sparkles,
  User
} from "lucide-react"
import { toast } from "sonner"

import { WizardNavigation } from "@/components/onboarding/WizardNavigation"
import type {
  HoldingData,
  OnboardingData
} from "@/app/onboarding/OnboardingWizard"

interface ConfirmationStepProps {
  data: OnboardingData
  onComplete: () => void
  onBack: () => void
}

interface ExpenseData {
  id: string
  name: string
  category: string
  amount: string
}

export function ConfirmationStep({
  data,
  onComplete,
  onBack
}: ConfirmationStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dbHoldings, setDbHoldings] = useState<HoldingData[]>([])
  const [dbExpenses, setDbExpenses] = useState<ExpenseData[]>([])

  // Fetch holdings and expenses from database to ensure accurate display
  useEffect(() => {
    async function fetchData() {
      try {
        const [holdings, expenses] = await Promise.all([
          getCurrentHoldings(),
          getExpenses()
        ])
        setDbHoldings(
          holdings.map((h) => ({
            id: h.id,
            bankName: h.bankName,
            holdingAmount: h.holdingAmount
          }))
        )
        setDbExpenses(
          expenses.map((e) => ({
            id: e.id,
            name: e.name,
            category: e.category,
            amount: e.amount
          }))
        )
      } catch (error) {
        console.error("Failed to fetch data:", error)
      }
    }
    fetchData()
  }, [])

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      await completeOnboarding()
      // Set flag to trigger app overview tour after redirect to dashboard
      sessionStorage.setItem("foracle_new_user_tour", "true")
      onComplete()
    } catch (error) {
      console.error("Failed to complete onboarding:", error)
      toast.error("Could not complete setup. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const summaryItems = [
    {
      icon: User,
      label: "Profile",
      value: data.familyMember?.name || "Not set",
      subValue: data.familyMember?.relationship,
      isSet: !!data.familyMember,
      bgColor: "bg-brand-terracotta/[0.1]",
      iconColor: "text-on-brand"
    },
    {
      icon: DollarSign,
      label: "Income",
      value: data.income?.name || "Not set",
      subValue: data.income
        ? `$${parseFloat(data.income.amount).toLocaleString("en-SG")} / ${data.income.frequency}`
        : undefined,
      isSet: !!data.income,
      bgColor: "bg-brand-teal/[0.12]",
      iconColor: "text-on-success"
    },
    {
      icon: PiggyBank,
      label: "CPF",
      value: data.cpf ? "Configured" : "Skipped",
      subValue: data.cpf
        ? `OA: $${parseFloat(data.cpf.cpfOrdinaryAccount).toLocaleString("en-SG")} | SA: $${parseFloat(data.cpf.cpfSpecialAccount).toLocaleString("en-SG")} | MA: $${parseFloat(data.cpf.cpfMedisaveAccount).toLocaleString("en-SG")}`
        : undefined,
      isSet: !!data.cpf && parseFloat(data.cpf.cpfOrdinaryAccount) > 0,
      bgColor: "bg-brand-terracotta/[0.1]",
      iconColor: "text-on-brand"
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
      bgColor: "bg-brand-gold/[0.15]",
      iconColor: "text-on-warning"
    },
    {
      icon: Receipt,
      label: "Expenses",
      value:
        dbExpenses.length > 0
          ? `${dbExpenses.length} categor${dbExpenses.length > 1 ? "ies" : "y"}`
          : "Skipped",
      subValue:
        dbExpenses.length > 0
          ? `Total: $${dbExpenses
              .reduce((sum, e) => sum + parseFloat(e.amount), 0)
              .toLocaleString("en-SG")} / monthly`
          : undefined,
      isSet: dbExpenses.length > 0,
      bgColor: "bg-brand-alert-red/[0.12]",
      iconColor: "text-on-danger"
    }
  ]

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-8">
        {/* Success Header */}
        <div className="py-6 text-center">
          <div className="bg-brand-teal/[0.12] mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Sparkles className="text-on-success h-8 w-8" />
          </div>
          <h2 className="mb-2 text-2xl font-semibold">Great job!</h2>
          <p className="text-muted-foreground">
            Here&apos;s a summary of what you&apos;ve set up. You can always
            update these from your dashboard.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="space-y-3">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="border-border/60 bg-card flex items-center gap-4 rounded-xl border p-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  item.isSet ? item.bgColor : "bg-muted"
                }`}>
                <item.icon
                  className={`h-6 w-6 ${
                    item.isSet ? item.iconColor : "text-muted-foreground"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-sm">{item.label}</p>
                <p className="truncate font-medium">{item.value}</p>
                {item.subValue && (
                  <p className="text-muted-foreground truncate text-sm">
                    {item.subValue}
                  </p>
                )}
              </div>
              {item.isSet && (
                <CheckCircle2 className="text-on-success h-5 w-5 shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Next Steps */}
        <div className="border-border/60 bg-muted/30 rounded-xl border p-4">
          <h3 className="mb-2 font-medium">What&apos;s next?</h3>
          <ul className="text-muted-foreground space-y-1 text-sm">
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
  )
}
