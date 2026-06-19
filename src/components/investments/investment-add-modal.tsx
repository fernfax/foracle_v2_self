"use client"

import { useEffect, useState } from "react"
import { HelpCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooterSticky,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoneyInput } from "@/components/ui/money-input"
import { MonthPicker } from "@/components/ui/month-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"

interface Investment {
  id: string
  name: string
  type: string
  currentCapital: string
  projectedYield: string
  contributionAmount: string
  contributionFrequency: string
  customMonths: string | null
  isActive: boolean | null
}

interface AddInvestmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  investment?: Investment | null
  onSubmit: (data: {
    name: string
    type: string
    currentCapital: string
    projectedYield: string
    contributionAmount: string
    contributionFrequency: string
    customMonths?: string
  }) => Promise<void>
}

const INVESTMENT_TYPES = [
  { value: "stock", label: "Stock" },
  { value: "cash", label: "Cash" },
  { value: "bonds", label: "Bonds" },
  { value: "etf", label: "ETF" },
  { value: "crypto", label: "Crypto" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "reit", label: "REIT" }
]

export function InvestmentAddModal({
  open,
  onOpenChange,
  investment,
  onSubmit
}: AddInvestmentModalProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState("stock")
  const [currentCapital, setCurrentCapital] = useState("")
  const [projectedYield, setProjectedYield] = useState("")
  const [contributionAmount, setContributionAmount] = useState("")
  const [contributionFrequency, setContributionFrequency] = useState("monthly")
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal opens/closes or investment changes
  useEffect(() => {
    if (open) {
      if (investment) {
        setName(investment.name)
        setType(investment.type)
        setCurrentCapital(investment.currentCapital)
        setProjectedYield(investment.projectedYield)
        setContributionAmount(investment.contributionAmount)
        setContributionFrequency(investment.contributionFrequency)
        if (investment.customMonths) {
          try {
            setSelectedMonths(JSON.parse(investment.customMonths))
          } catch {
            setSelectedMonths([])
          }
        } else {
          setSelectedMonths([])
        }
      } else {
        resetForm()
      }
    }
  }, [open, investment])

  const resetForm = () => {
    setName("")
    setType("stock")
    setCurrentCapital("")
    setProjectedYield("")
    setContributionAmount("")
    setContributionFrequency("monthly")
    setSelectedMonths([])
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm()
    }
    onOpenChange(isOpen)
  }

  const handleSubmit = async () => {
    if (!name || !currentCapital || !projectedYield || !contributionAmount) {
      return
    }

    if (contributionFrequency === "custom" && selectedMonths.length === 0) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit({
        name,
        type,
        currentCapital,
        projectedYield,
        contributionAmount,
        contributionFrequency,
        customMonths:
          contributionFrequency === "custom"
            ? JSON.stringify(selectedMonths)
            : undefined
      })
      handleClose(false)
    } catch (error) {
      console.error("Failed to save investment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid =
    name &&
    currentCapital &&
    projectedYield &&
    contributionAmount &&
    (contributionFrequency !== "custom" || selectedMonths.length > 0)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {investment ? "Edit Investment" : "Add Investment"}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-6 py-4">
            {/* Basic Details */}
            <div className="space-y-4">
              <div className="border-border border-b pb-3">
                <h3 className="text-foreground text-sm font-semibold">
                  Investment Details
                </h3>
              </div>
              <div className="bg-muted space-y-4 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Investment Name" htmlFor="name" required>
                    <Input
                      id="name"
                      aria-required="true"
                      placeholder="e.g., S&P 500 ETF, High Yield Savings"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                  <Field label="Type" htmlFor="type" required>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger id="type" aria-required="true">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {INVESTMENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-4">
              <div className="border-border border-b pb-3">
                <h3 className="text-foreground text-sm font-semibold">
                  Financial Details
                </h3>
              </div>
              <div className="bg-muted space-y-4 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Current Portfolio Capital"
                    htmlFor="currentCapital"
                    required>
                    <MoneyInput
                      id="currentCapital"
                      aria-required="true"
                      placeholder="0.00"
                      value={currentCapital}
                      onChange={(e) => setCurrentCapital(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </Field>
                  <Field
                    htmlFor="projectedYield"
                    required
                    label={
                      <span className="flex items-center gap-1">
                        Projected Annual Yield %
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                aria-label="Wealth projection formula"
                                className="text-muted-foreground hover:text-foreground transition-colors">
                                <HelpCircle className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="bg-card max-w-[320px] border p-3 text-xs shadow-lg">
                              <p className="mb-2 font-semibold">
                                Wealth Projection Formula
                              </p>
                              <p className="mb-2">
                                <strong>With Contributions:</strong>
                                <br />
                                FV = C × (1 + r/12)<sup>n</sup> + PMT × ((1 +
                                r/12)<sup>n</sup> - 1) / (r/12)
                              </p>
                              <p className="mb-2">
                                <strong>Without Contributions:</strong>
                                <br />
                                FV = C × (1 + r/12)<sup>n</sup>
                              </p>
                              <p className="text-muted-foreground text-[10px]">
                                Where C = capital, r = annual yield, n = months,
                                PMT = monthly contribution. Interest compounds
                                monthly.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                    }>
                    <MoneyInput
                      symbol="%"
                      side="suffix"
                      id="projectedYield"
                      aria-required="true"
                      placeholder="0.00"
                      value={projectedYield}
                      onChange={(e) => setProjectedYield(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Contribution Details */}
            <div className="space-y-4">
              <div className="border-border border-b pb-3">
                <h3 className="text-foreground text-sm font-semibold">
                  Contribution Details
                </h3>
              </div>
              <div className="bg-muted space-y-4 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Contribution Amount"
                    htmlFor="contributionAmount"
                    required>
                    <MoneyInput
                      id="contributionAmount"
                      aria-required="true"
                      placeholder="0.00"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </Field>
                  <div className="space-y-2">
                    <Label>Contribution Frequency</Label>
                    <div className="flex h-10 items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="frequency"
                          checked={contributionFrequency === "custom"}
                          onCheckedChange={(checked) =>
                            setContributionFrequency(
                              checked ? "custom" : "monthly"
                            )
                          }
                        />
                        <Label
                          htmlFor="frequency"
                          className="cursor-pointer text-sm font-normal">
                          {contributionFrequency === "monthly"
                            ? "Monthly"
                            : "Custom"}
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom Months Selector */}
                {contributionFrequency === "custom" && (
                  <Field label="Select Months" required className="pt-2">
                    <MonthPicker
                      value={selectedMonths}
                      onChange={setSelectedMonths}
                    />
                    {selectedMonths.length > 0 && (
                      <p className="text-muted-foreground text-xs">
                        {selectedMonths.length} contribution
                        {selectedMonths.length > 1 ? "s" : ""} per year
                      </p>
                    )}
                  </Field>
                )}
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooterSticky>
          <Button
            variant="ghost"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : investment
                ? "Update Investment"
                : "Add Investment"}
          </Button>
        </DialogFooterSticky>
      </DialogContent>
    </Dialog>
  )
}
