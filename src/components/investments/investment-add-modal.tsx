"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import type { Investment } from "@/db/types"
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

// Form-layer schema. Required fields mirror the original isFormValid gate;
// custom months are required only when frequency is Custom.
const investmentFormSchema = z
  .object({
    name: z.string().min(1, "Investment name is required"),
    type: z.string(),
    currentCapital: z.string().min(1, "Current capital is required"),
    projectedYield: z.string().min(1, "Projected yield is required"),
    contributionAmount: z.string().min(1, "Contribution amount is required"),
    contributionFrequency: z.string(),
    selectedMonths: z.array(z.number())
  })
  .superRefine((v, ctx) => {
    if (v.contributionFrequency === "custom" && v.selectedMonths.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selectedMonths"],
        message: "Select at least one month"
      })
    }
  })
type InvestmentFormValues = z.infer<typeof investmentFormSchema>

const emptyValues: InvestmentFormValues = {
  name: "",
  type: "stock",
  currentCapital: "",
  projectedYield: "",
  contributionAmount: "",
  contributionFrequency: "monthly",
  selectedMonths: []
}

function toFormValues(investment: Investment): InvestmentFormValues {
  let selectedMonths: number[] = []
  if (investment.customMonths) {
    try {
      const months = JSON.parse(investment.customMonths)
      selectedMonths = Array.isArray(months) ? months : []
    } catch {
      selectedMonths = []
    }
  }
  return {
    name: investment.name,
    type: investment.type,
    currentCapital: investment.currentCapital,
    projectedYield: investment.projectedYield,
    contributionAmount: investment.contributionAmount,
    contributionFrequency: investment.contributionFrequency,
    selectedMonths
  }
}

export function InvestmentAddModal({
  open,
  onOpenChange,
  investment,
  onSubmit
}: AddInvestmentModalProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isValid, isSubmitting }
  } = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentFormSchema),
    mode: "onChange",
    defaultValues: emptyValues
  })

  const contributionFrequency = useWatch({
    control,
    name: "contributionFrequency"
  })
  const selectedMonths = useWatch({ control, name: "selectedMonths" })

  useEffect(() => {
    if (open) reset(investment ? toFormValues(investment) : emptyValues)
  }, [open, investment, reset])

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) reset(emptyValues)
    onOpenChange(isOpen)
  }

  const submit = async (values: InvestmentFormValues) => {
    try {
      await onSubmit({
        name: values.name,
        type: values.type,
        currentCapital: values.currentCapital,
        projectedYield: values.projectedYield,
        contributionAmount: values.contributionAmount,
        contributionFrequency: values.contributionFrequency,
        customMonths:
          values.contributionFrequency === "custom"
            ? JSON.stringify(values.selectedMonths)
            : undefined
      })
      handleClose(false)
    } catch (error) {
      console.error("Failed to save investment:", error)
    }
  }

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
                      {...register("name")}
                    />
                  </Field>
                  <Field label="Type" htmlFor="type" required>
                    <Controller
                      control={control}
                      name="type"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}>
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
                      )}
                    />
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
                    <Controller
                      control={control}
                      name="currentCapital"
                      render={({ field }) => (
                        <MoneyInput
                          id="currentCapital"
                          aria-required="true"
                          placeholder="0.00"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          min="0"
                          step="0.01"
                        />
                      )}
                    />
                  </Field>
                  <Field
                    htmlFor="projectedYield"
                    required
                    label="Projected Annual Yield %"
                    tooltipLabel="Wealth projection formula"
                    tooltip={
                      <>
                        <p className="mb-2 font-semibold">
                          Wealth Projection Formula
                        </p>
                        <p className="mb-2">
                          <strong>With Contributions:</strong>
                          <br />
                          FV = C × (1 + r/12)<sup>n</sup> + PMT × ((1 + r/12)
                          <sup>n</sup> - 1) / (r/12)
                        </p>
                        <p className="mb-2">
                          <strong>Without Contributions:</strong>
                          <br />
                          FV = C × (1 + r/12)<sup>n</sup>
                        </p>
                        <p className="text-muted-foreground text-[10px]">
                          Where C = capital, r = annual yield, n = months, PMT =
                          monthly contribution. Interest compounds monthly.
                        </p>
                      </>
                    }>
                    <Controller
                      control={control}
                      name="projectedYield"
                      render={({ field }) => (
                        <MoneyInput
                          symbol="%"
                          side="suffix"
                          id="projectedYield"
                          aria-required="true"
                          placeholder="0.00"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          min="0"
                          step="0.01"
                        />
                      )}
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
                    <Controller
                      control={control}
                      name="contributionAmount"
                      render={({ field }) => (
                        <MoneyInput
                          id="contributionAmount"
                          aria-required="true"
                          placeholder="0.00"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          min="0"
                          step="0.01"
                        />
                      )}
                    />
                  </Field>
                  <div className="space-y-2">
                    <Label>Contribution Frequency</Label>
                    <div className="flex h-10 items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Controller
                          control={control}
                          name="contributionFrequency"
                          render={({ field }) => (
                            <Switch
                              id="frequency"
                              checked={field.value === "custom"}
                              onCheckedChange={(checked) => {
                                field.onChange(checked ? "custom" : "monthly")
                                if (!checked) setValue("selectedMonths", [])
                              }}
                            />
                          )}
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
                    <Controller
                      control={control}
                      name="selectedMonths"
                      render={({ field }) => (
                        <MonthPicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
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
            onClick={handleSubmit(submit)}
            disabled={!isValid || isSubmitting}>
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
