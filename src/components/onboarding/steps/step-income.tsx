"use client"

import { useEffect, useState } from "react"
import { createIncome, updateIncome } from "@/actions/incomes"
import { format } from "date-fns"
import { Lightbulb, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { MoneyInput } from "@/components/ui/money-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { WizardNavigation } from "@/components/onboarding/onboarding-wizard-navigation"
import type {
  BonusGroup,
  FamilyMemberData,
  IncomeData
} from "@/app/onboarding/onboarding-wizard"

const MONTHS = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Aug" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dec" }
]

interface IncomeStepProps {
  familyMember: FamilyMemberData | null
  data: IncomeData | null
  onSave: (data: IncomeData) => void
  onNext: () => void
  onBack: () => void
}

const CATEGORIES = [
  { value: "salary", label: "Salary" },
  { value: "freelance", label: "Freelance" },
  { value: "business", label: "Business" },
  { value: "investment", label: "Investment" },
  { value: "rental", label: "Rental" },
  { value: "dividend", label: "Dividend" },
  { value: "other", label: "Other" }
]

const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-weekly" }
]

export function IncomeStep({
  familyMember,
  data,
  onSave,
  onNext,
  onBack
}: IncomeStepProps) {
  const [name, setName] = useState(data?.name || "")
  const [category, setCategory] = useState(data?.category || "salary")
  const [amount, setAmount] = useState(data?.amount || "")
  const [frequency, setFrequency] = useState(data?.frequency || "monthly")
  const [subjectToCpf, setSubjectToCpf] = useState(data?.subjectToCpf ?? true)
  const [accountForBonus, setAccountForBonus] = useState(
    data?.accountForBonus ?? false
  )
  const [bonusGroups, setBonusGroups] = useState<BonusGroup[]>(
    data?.bonusGroups?.length ? data.bonusGroups : [{ month: 1, amount: "" }]
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [incomeId, setIncomeId] = useState(data?.id || "")

  // Update form when data changes
  useEffect(() => {
    if (data) {
      setName(data.name)
      setCategory(data.category)
      setAmount(data.amount)
      setFrequency(data.frequency)
      setSubjectToCpf(data.subjectToCpf)
      setIncomeId(data.id || "")
      setAccountForBonus(data.accountForBonus ?? false)
      setBonusGroups(
        data.bonusGroups?.length ? data.bonusGroups : [{ month: 1, amount: "" }]
      )
    }
  }, [data])

  const addBonusGroup = () => {
    setBonusGroups([...bonusGroups, { month: 1, amount: "" }])
  }

  // Calculate total bonus
  const totalBonusMonths = bonusGroups.reduce(
    (sum, bg) => sum + (parseFloat(bg.amount) || 0),
    0
  )
  const monthlyAmount = parseFloat(amount) || 0
  const totalBonusGross = monthlyAmount * totalBonusMonths

  const removeBonusGroup = (index: number) => {
    if (bonusGroups.length > 1) {
      setBonusGroups(bonusGroups.filter((_, i) => i !== index))
    }
  }

  const updateBonusGroup = (
    index: number,
    field: keyof BonusGroup,
    value: number | string
  ) => {
    const updated = [...bonusGroups]
    updated[index] = { ...updated[index], [field]: value }
    setBonusGroups(updated)
  }

  const trimmedName = name.trim()
  const isFormValid =
    trimmedName && category && amount && parseFloat(amount) > 0

  const handleSubmit = async () => {
    if (!isFormValid) return

    setIsSubmitting(true)
    try {
      // Use today's date as default start date
      const startDate = format(new Date(), "yyyy-MM-dd")

      // Calculate age from family member's date of birth
      let familyMemberAge: number | undefined
      if (familyMember?.dateOfBirth) {
        const dob = new Date(familyMember.dateOfBirth)
        const today = new Date()
        familyMemberAge = today.getFullYear() - dob.getFullYear()
        const monthDiff = today.getMonth() - dob.getMonth()
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < dob.getDate())
        ) {
          familyMemberAge--
        }
      }

      // Prepare bonus groups data if enabled
      const bonusData = accountForBonus
        ? JSON.stringify(
            bonusGroups.filter((bg) => bg.amount && parseFloat(bg.amount) > 0)
          )
        : null

      // incomeId is hydrated from the DB on resume, so an existing row is
      // always updated in place; a missing id means this is the first save.
      let savedIncome
      if (incomeId) {
        savedIncome = await updateIncome(incomeId, {
          name: trimmedName,
          category,
          amount: parseFloat(amount),
          frequency,
          subjectToCpf,
          accountForBonus,
          bonusGroups: bonusData,
          familyMemberAge
        })
      } else {
        savedIncome = await createIncome({
          name: trimmedName,
          category,
          amount: parseFloat(amount),
          frequency,
          subjectToCpf,
          accountForBonus,
          bonusGroups: bonusData || undefined,
          startDate,
          familyMemberId: familyMember?.id,
          familyMemberAge
        })
        setIncomeId(savedIncome.id)
      }

      onSave({
        id: savedIncome.id,
        name: trimmedName,
        category,
        amount,
        frequency,
        subjectToCpf,
        startDate,
        accountForBonus,
        bonusGroups: accountForBonus
          ? bonusGroups.filter((bg) => bg.amount && parseFloat(bg.amount) > 0)
          : []
      })
      onNext()
    } catch (error) {
      console.error("Failed to save income:", error)
      toast.error("Could not save your income. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-6">
        {/* Income Source Name */}
        <Field label="Income Source Name" htmlFor="name" required>
          <Input
            id="name"
            placeholder="e.g., Primary Salary, Freelance Work"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-required="true"
          />
        </Field>

        {/* Category and Frequency Row */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category" htmlFor="income-category" required>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="income-category" aria-required="true">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Frequency" htmlFor="income-frequency" required>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger id="income-frequency" aria-required="true">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* Amount */}
        <Field
          label="Amount (SGD)"
          htmlFor="amount"
          required
          helper={`Enter your gross ${frequency} income before deductions`}>
          <MoneyInput
            id="amount"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
            aria-required="true"
          />
        </Field>

        {/* Whole card toggles via the native label wrapper. */}
        <label className="border-border/60 bg-muted/30 flex cursor-pointer items-start space-x-3 rounded-lg border p-4">
          <Checkbox
            checked={subjectToCpf}
            onCheckedChange={(checked) => setSubjectToCpf(checked === true)}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <span className="text-sm leading-none font-medium">
              Subject to CPF deductions
            </span>
            <p className="text-muted-foreground text-xs">
              Enable this for employment income that has CPF contributions
            </p>
          </div>
        </label>

        {/* Bonus Section */}
        <div className="border-border/60 bg-muted/30 space-y-4 rounded-lg border p-4">
          <label className="flex cursor-pointer items-start space-x-3">
            <Checkbox
              checked={accountForBonus}
              onCheckedChange={(checked) =>
                setAccountForBonus(checked === true)
              }
              className="mt-0.5"
            />
            <div className="space-y-1">
              <span className="text-sm leading-none font-medium">
                Income Bonus Details
              </span>
              <p className="text-muted-foreground text-xs">
                Set up bonus payments for specific months (e.g., 13th month
                bonus in December)
              </p>
            </div>
          </label>

          {accountForBonus && (
            <div className="space-y-3 pt-2">
              {bonusGroups.map((group, index) => (
                <div key={index} className="flex items-end gap-3">
                  <Field label="Bonus Month" className="flex-1">
                    <Select
                      value={group.month.toString()}
                      onValueChange={(value) =>
                        updateBonusGroup(index, "month", parseInt(value))
                      }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month) => (
                          <SelectItem
                            key={month.value}
                            value={month.value.toString()}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Bonus (No. of Months)" className="flex-1">
                    <Input
                      type="number"
                      placeholder="e.g., 1.5"
                      value={group.amount}
                      onChange={(e) =>
                        updateBonusGroup(index, "amount", e.target.value)
                      }
                      min="0"
                      step="0.1"
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBonusGroup(index)}
                    className="text-on-danger hover:text-on-danger hover:bg-brand-alert-red/[0.12] px-2"
                    disabled={bonusGroups.length === 1}>
                    Remove
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBonusGroup}
                className="mt-2 w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Bonus
              </Button>

              {/* Dynamic Summary */}
              {totalBonusMonths > 0 && monthlyAmount > 0 && (
                <div className="mt-4">
                  <Separator className="bg-border/60" />
                  <div className="space-y-1 pt-3">
                    <p className="text-muted-foreground text-sm">
                      <span className="text-foreground font-medium">
                        Total Bonus Months:
                      </span>{" "}
                      {totalBonusMonths.toFixed(2)} months
                    </p>
                    <p className="text-muted-foreground text-sm">
                      <span className="text-foreground font-medium">
                        Total Bonus Gross:
                      </span>{" "}
                      $
                      {totalBonusGross.toLocaleString("en-SG", {
                        minimumFractionDigits: 2
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

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
              You can add more income sources from your dashboard after
              completing the initial setup.
            </p>
          </div>
        </div>
      </div>

      <WizardNavigation
        onBack={onBack}
        onNext={handleSubmit}
        canProceed={!!isFormValid}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
