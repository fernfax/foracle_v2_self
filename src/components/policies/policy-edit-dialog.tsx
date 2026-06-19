"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  createExpenseFromPolicy,
  deleteLinkedExpense,
  updateExpenseFromPolicy
} from "@/actions/expenses"
import {
  getInsuranceProviders,
  type InsuranceProvider
} from "@/actions/insurance-providers"
import { updatePolicy } from "@/actions/policies"
import { getUserFamilyMembers } from "@/actions/user"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, parseISO } from "date-fns"
import { Controller, useForm, useWatch, type Control } from "react-hook-form"
import { z } from "zod"

import { policyFrequencyToExpenseFrequency } from "@/lib/utils"
import type { Policy } from "@/db/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
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
import { PolicyProviderManagerPopover } from "@/components/policies/policy-provider-manager-popover"

interface FamilyMember {
  id: string
  name: string
  dateOfBirth: string | null
}

interface EditPolicyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  policy: Policy | null
  userId: string
  onPolicyUpdated?: () => void
}

const POLICY_TYPES = [
  "Critical Illness",
  "Disability Insurance",
  "Whole Life",
  "Term Life",
  "Endowment",
  "Investment-Linked",
  "Hospitalisation Plan",
  "Other"
]

const POLICY_STATUSES = ["Active", "Lapsed", "Cancelled", "Matured"]

const PREMIUM_FREQUENCIES = ["Monthly", "Custom"]

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

const coverageItemSchema = z.object({
  enabled: z.boolean(),
  amount: z.string()
})

// Form-layer schema — same shape as the add dialog. Required fields mirror the
// original submit gate; custom months are required only for Custom frequency.
// status stays a plain string so the server keeps storing it verbatim.
const policyFormSchema = z
  .object({
    familyMemberId: z.string(),
    provider: z.string().min(1, "Provider is required"),
    planName: z.string(),
    policyNumber: z.string(),
    policyType: z.string().min(1, "Policy type is required"),
    status: z.string(),
    startDate: z.date({ message: "Start date is required" }),
    coverageUntilAge: z.string(),
    maturityDate: z.date().optional(),
    premiumAmount: z.string().min(1, "Premium amount is required"),
    premiumAmountCPF: z.string(),
    premiumFrequency: z.string().min(1, "Premium frequency is required"),
    selectedMonths: z.array(z.number()),
    totalPremiumDuration: z.string(),
    death: coverageItemSchema,
    tpd: coverageItemSchema,
    criticalIllness: coverageItemSchema,
    earlyCriticalIllness: coverageItemSchema,
    hospitalisationPlan: coverageItemSchema,
    cashValue: z.string(),
    cashValueDate: z.date().optional(),
    addToExpenditures: z.boolean(),
    expenseName: z.string()
  })
  .superRefine((v, ctx) => {
    if (v.premiumFrequency === "Custom" && v.selectedMonths.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selectedMonths"],
        message: "Select at least one month for custom frequency"
      })
    }
  })
type PolicyFormValues = z.infer<typeof policyFormSchema>

const COVERAGE_ROWS = [
  { key: "death", label: "Death", amountLabel: "Sum Assured" },
  { key: "tpd", label: "TPD", amountLabel: "Sum Assured" },
  {
    key: "criticalIllness",
    label: "Critical Illness",
    amountLabel: "Sum Assured"
  },
  {
    key: "earlyCriticalIllness",
    label: "Early Critical Illness",
    amountLabel: "Sum Assured"
  },
  {
    key: "hospitalisationPlan",
    label: "Hospitalisation Plan",
    amountLabel: "Claimable Amount"
  }
] as const

type CoverageKey = (typeof COVERAGE_ROWS)[number]["key"]

// Parse a JSON-encoded coverageOptions map into per-benefit form items.
function coverageFromJson(
  json: string | null
): Record<CoverageKey, { enabled: boolean; amount: string }> {
  const empty = { enabled: false, amount: "" }
  const result = {
    death: { ...empty },
    tpd: { ...empty },
    criticalIllness: { ...empty },
    earlyCriticalIllness: { ...empty },
    hospitalisationPlan: { ...empty }
  }
  if (!json) return result
  try {
    const o = JSON.parse(json)
    for (const key of Object.keys(result) as CoverageKey[]) {
      const amount = o[key]
      if (amount > 0) result[key] = { enabled: true, amount: amount.toString() }
    }
  } catch {
    // fall through to empty defaults
  }
  return result
}

function toFormValues(policy: Policy): PolicyFormValues {
  let selectedMonths: number[] = []
  if (policy.customMonths) {
    try {
      const months = JSON.parse(policy.customMonths)
      selectedMonths = Array.isArray(months) ? months : []
    } catch {
      selectedMonths = []
    }
  }
  const coverage = coverageFromJson(policy.coverageOptions)
  return {
    familyMemberId: policy.familyMemberId || "",
    provider: policy.provider,
    planName: policy.planName || "",
    policyNumber: policy.policyNumber || "",
    policyType: policy.policyType,
    status: policy.status || "Active",
    startDate: parseISO(policy.startDate),
    coverageUntilAge: policy.coverageUntilAge?.toString() || "",
    maturityDate: policy.maturityDate
      ? parseISO(policy.maturityDate)
      : undefined,
    premiumAmount: policy.premiumAmount,
    premiumAmountCPF: policy.premiumAmountCPF || "",
    premiumFrequency: policy.premiumFrequency,
    selectedMonths,
    totalPremiumDuration: policy.totalPremiumDuration?.toString() || "",
    death: coverage.death,
    tpd: coverage.tpd,
    criticalIllness: coverage.criticalIllness,
    earlyCriticalIllness: coverage.earlyCriticalIllness,
    hospitalisationPlan: coverage.hospitalisationPlan,
    cashValue: policy.cashValue || "",
    cashValueDate: policy.cashValueDate
      ? parseISO(policy.cashValueDate)
      : undefined,
    addToExpenditures: !!policy.linkedExpenseId,
    expenseName: ""
  }
}

function CoverageRow({
  control,
  row
}: {
  control: Control<PolicyFormValues>
  row: { key: CoverageKey; label: string; amountLabel: string }
}) {
  const enabled = useWatch({ control, name: `${row.key}.enabled` })
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-1 items-center gap-2">
        <Controller
          control={control}
          name={`${row.key}.enabled`}
          render={({ field }) => (
            <Checkbox
              id={row.key}
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked as boolean)}
            />
          )}
        />
        <Label htmlFor={row.key} className="cursor-pointer font-normal">
          {row.label}
        </Label>
      </div>
      <div className="w-48">
        <Label className="text-muted-foreground text-xs">
          {row.amountLabel}
        </Label>
        <Controller
          control={control}
          name={`${row.key}.amount`}
          render={({ field }) => (
            <MoneyInput
              step="0.01"
              placeholder="0.00"
              disabled={!enabled}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
            />
          )}
        />
      </div>
    </div>
  )
}

// True when an expense-affecting policy field diverges from the stored policy.
function computeDataChanged(policy: Policy, v: PolicyFormValues): boolean {
  const policyCustomMonths = policy.customMonths
    ? JSON.stringify(JSON.parse(policy.customMonths).sort())
    : null
  const currentCustomMonths =
    v.selectedMonths.length > 0
      ? JSON.stringify([...v.selectedMonths].sort())
      : null
  return (
    policy.policyType !== v.policyType ||
    policy.provider !== v.provider ||
    policy.premiumAmount !== v.premiumAmount ||
    policy.premiumFrequency !== v.premiumFrequency ||
    policyCustomMonths !== currentCustomMonths ||
    format(parseISO(policy.startDate), "yyyy-MM-dd") !==
      (v.startDate ? format(v.startDate, "yyyy-MM-dd") : "") ||
    (policy.maturityDate
      ? format(parseISO(policy.maturityDate), "yyyy-MM-dd")
      : null) !== (v.maturityDate ? format(v.maturityDate, "yyyy-MM-dd") : null)
  )
}

export function PolicyEditDialog({
  open,
  onOpenChange,
  policy,
  onPolicyUpdated
}: EditPolicyDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [providers, setProviders] = useState<InsuranceProvider[]>([])
  const [memberAge, setMemberAge] = useState<number | null>(null)
  const [initialAddToExpenditures, setInitialAddToExpenditures] =
    useState(false)
  const [confirmAddModalOpen, setConfirmAddModalOpen] = useState(false)
  const [confirmUpdateModalOpen, setConfirmUpdateModalOpen] = useState(false)
  const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false)
  const [validationError, setValidationError] = useState("")

  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors }
  } = useForm<PolicyFormValues>({ resolver: zodResolver(policyFormSchema) })

  const selectedFamilyMember = useWatch({ control, name: "familyMemberId" })
  const policyType = useWatch({ control, name: "policyType" })
  const provider = useWatch({ control, name: "provider" })
  const premiumAmount = useWatch({ control, name: "premiumAmount" })
  const premiumFrequency = useWatch({ control, name: "premiumFrequency" })
  const selectedMonths = useWatch({ control, name: "selectedMonths" })
  const startDate = useWatch({ control, name: "startDate" })
  const coverageUntilAge = useWatch({ control, name: "coverageUntilAge" })
  const addToExpenditures = useWatch({ control, name: "addToExpenditures" })

  // Load family members and providers, then hydrate the form from the policy
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsDataLoading(true)
        const members = await getUserFamilyMembers()
        setFamilyMembers(members)
        const providersList = await getInsuranceProviders()
        setProviders(providersList)

        if (policy) {
          reset(toFormValues(policy))
          setInitialAddToExpenditures(!!policy.linkedExpenseId)
          setValidationError("")
        }
      } catch (error) {
        console.error("Error loading policy data:", error)
      } finally {
        setIsDataLoading(false)
      }
    }
    if (open && policy) {
      loadData()
    } else if (!open) {
      setIsDataLoading(true)
    }
  }, [policy, open, reset])

  const loadProviders = async () => {
    const providersList = await getInsuranceProviders()
    setProviders(providersList)
  }

  // Derive the holder's age from their date of birth
  useEffect(() => {
    const member = familyMembers.find((m) => m.id === selectedFamilyMember)
    if (member?.dateOfBirth) {
      const birthDate = new Date(member.dateOfBirth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--
      }
      setMemberAge(age)
    } else {
      setMemberAge(null)
    }
  }, [selectedFamilyMember, familyMembers])

  // Auto-populate maturity date from coverage-until-age + holder age + start date
  useEffect(() => {
    if (coverageUntilAge && memberAge !== null && startDate) {
      const yearsUntilMaturity = parseInt(coverageUntilAge) - memberAge
      if (yearsUntilMaturity > 0) {
        const maturity = new Date(startDate)
        maturity.setFullYear(startDate.getFullYear() + yearsUntilMaturity)
        setValue("maturityDate", maturity)
      }
    }
  }, [coverageUntilAge, memberAge, startDate, setValue])

  const prefillExpenseName = () => {
    const memberName =
      familyMembers.find((m) => m.id === policy?.familyMemberId)?.name || ""
    const firstName = memberName.split(" ")[0]
    setValue(
      "expenseName",
      firstName
        ? `${firstName}'s ${policyType} - ${provider}`
        : `${policyType} - ${provider}`
    )
  }

  const handleToggleChange = (checked: boolean) => {
    if (checked) {
      const v = getValues()
      if (!v.startDate || !v.premiumAmount || !v.premiumFrequency) {
        setValidationError(
          "Please fill in Start Date, Premium Amount, and Premium Frequency before adding to expenses."
        )
        return
      }
      if (v.premiumFrequency === "Custom" && v.selectedMonths.length === 0) {
        setValidationError(
          "Please select at least one month for custom premium frequency."
        )
        return
      }
      setValidationError("")
      prefillExpenseName()
      setConfirmAddModalOpen(true)
    } else {
      setConfirmDeleteModalOpen(true)
    }
  }

  const onSubmit = (values: PolicyFormValues) => {
    if (!policy) return
    // If expense-relevant data changed on a linked policy, confirm the expense
    // update before writing.
    if (
      computeDataChanged(policy, values) &&
      initialAddToExpenditures &&
      values.addToExpenditures
    ) {
      prefillExpenseName()
      setConfirmUpdateModalOpen(true)
      return
    }
    performUpdate()
  }

  const performUpdate = async () => {
    if (!policy) return
    const values = getValues()
    setIsLoading(true)
    try {
      const coverageOptions = {
        death: values.death.enabled ? parseFloat(values.death.amount) || 0 : 0,
        tpd: values.tpd.enabled ? parseFloat(values.tpd.amount) || 0 : 0,
        criticalIllness: values.criticalIllness.enabled
          ? parseFloat(values.criticalIllness.amount) || 0
          : 0,
        earlyCriticalIllness: values.earlyCriticalIllness.enabled
          ? parseFloat(values.earlyCriticalIllness.amount) || 0
          : 0,
        hospitalisationPlan: values.hospitalisationPlan.enabled
          ? parseFloat(values.hospitalisationPlan.amount) || 0
          : 0
      }

      const customMonthsJson =
        values.premiumFrequency === "Custom" && values.selectedMonths.length > 0
          ? JSON.stringify(values.selectedMonths)
          : undefined

      await updatePolicy(policy.id, {
        familyMemberId: values.familyMemberId || undefined,
        provider: values.provider,
        planName: values.planName || undefined,
        policyNumber: values.policyNumber || undefined,
        policyType: values.policyType,
        status: values.status,
        startDate: values.startDate
          ? format(values.startDate, "yyyy-MM-dd")
          : undefined,
        maturityDate: values.maturityDate
          ? format(values.maturityDate, "yyyy-MM-dd")
          : undefined,
        coverageUntilAge: values.coverageUntilAge
          ? parseInt(values.coverageUntilAge)
          : undefined,
        premiumAmount: values.premiumAmount,
        premiumAmountCPF: values.premiumAmountCPF || null,
        premiumFrequency: values.premiumFrequency,
        customMonths: customMonthsJson,
        totalPremiumDuration: values.totalPremiumDuration
          ? parseInt(values.totalPremiumDuration)
          : undefined,
        coverageOptions: JSON.stringify(coverageOptions),
        cashValue: values.cashValue || null,
        cashValueDate: values.cashValueDate
          ? format(values.cashValueDate, "yyyy-MM-dd")
          : null
      })

      // Reconcile the linked expense against the toggle's before/after state
      if (!initialAddToExpenditures && values.addToExpenditures) {
        const expense = await createExpenseFromPolicy({
          policyId: policy.id,
          name: values.expenseName,
          policyType: values.policyType,
          provider: values.provider,
          premiumAmount: parseFloat(values.premiumAmount),
          premiumFrequency: policyFrequencyToExpenseFrequency(
            values.premiumFrequency
          ),
          customMonths: customMonthsJson,
          startDate: format(values.startDate, "yyyy-MM-dd"),
          maturityDate: values.maturityDate
            ? format(values.maturityDate, "yyyy-MM-dd")
            : undefined
        })
        await updatePolicy(policy.id, { linkedExpenseId: expense.id })
      } else if (initialAddToExpenditures && !values.addToExpenditures) {
        await deleteLinkedExpense(policy.id)
        // Clearing the link writes NULL to the nullable linked_expense_id column.
        // updatePolicy forwards null through to the DB at runtime, but its param
        // type only models setting a string, so cast the cleared value.
        await updatePolicy(policy.id, {
          linkedExpenseId: null as unknown as string
        })
      } else if (
        initialAddToExpenditures &&
        values.addToExpenditures &&
        computeDataChanged(policy, values) &&
        policy.linkedExpenseId
      ) {
        await updateExpenseFromPolicy(policy.linkedExpenseId, {
          name: values.expenseName,
          policyType: values.policyType,
          provider: values.provider,
          premiumAmount: parseFloat(values.premiumAmount),
          premiumFrequency: policyFrequencyToExpenseFrequency(
            values.premiumFrequency
          ),
          customMonths: customMonthsJson,
          startDate: format(values.startDate, "yyyy-MM-dd"),
          maturityDate: values.maturityDate
            ? format(values.maturityDate, "yyyy-MM-dd")
            : undefined
        })
      }

      setConfirmUpdateModalOpen(false)
      onOpenChange(false)
      onPolicyUpdated?.()
      router.refresh()
    } catch (error) {
      console.error("Failed to update policy:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!policy) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Insurance Policy</DialogTitle>
          <DialogDescription>
            Update the details of your insurance policy
          </DialogDescription>
        </DialogHeader>

        {isDataLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="border-border size-8 animate-spin rounded-full border-b-2"></div>
            <span className="text-muted-foreground ml-3">
              Loading policy details...
            </span>
          </div>
        ) : (
          <>
            <DialogBody>
              <form
                id="edit-policy-form"
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6">
                {/* Policy Holder */}
                <div className="bg-muted space-y-4 rounded-lg p-4">
                  <div className="border-border border-b pb-3">
                    <h3 className="text-foreground text-sm font-semibold">
                      Policy Holder
                    </h3>
                    <p className="text-foreground/400 mt-1 text-xs">
                      Select which family member this policy covers
                    </p>
                  </div>
                  <Field
                    htmlFor="familyMember"
                    required
                    label={
                      <>
                        Family Member
                        {memberAge !== null && (
                          <span className="text-muted-foreground ml-2 text-sm font-normal">
                            Age: {memberAge}
                          </span>
                        )}
                      </>
                    }>
                    <Controller
                      control={control}
                      name="familyMemberId"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}>
                          <SelectTrigger id="familyMember" aria-required="true">
                            <SelectValue placeholder="Select family member" />
                          </SelectTrigger>
                          <SelectContent>
                            {familyMembers.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                </div>

                {/* Policy Information */}
                <div className="bg-muted space-y-4 rounded-lg p-4">
                  <div className="border-border border-b pb-3">
                    <h3 className="text-foreground text-sm font-semibold">
                      Policy Information
                    </h3>
                    <p className="text-foreground/400 mt-1 text-xs">
                      Details about the insurance provider, policy type, and
                      status
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Insurance Provider"
                      htmlFor="provider"
                      required
                      error={errors.provider?.message}>
                      <Controller
                        control={control}
                        name="provider"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}>
                            <SelectTrigger id="provider" aria-required="true">
                              <SelectValue placeholder="Select insurance provider" />
                            </SelectTrigger>
                            <SelectContent>
                              {providers.map((p) => (
                                <SelectItem key={p.id} value={p.name}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <PolicyProviderManagerPopover
                        providers={providers}
                        onProvidersChanged={loadProviders}
                      />
                    </Field>

                    <Field label="Plan Name" htmlFor="planName" optional>
                      <Input
                        id="planName"
                        placeholder="e.g., Flexi Life III"
                        {...register("planName")}
                      />
                    </Field>

                    <Field
                      label="Policy Number"
                      htmlFor="policyNumber"
                      optional>
                      <Input
                        id="policyNumber"
                        placeholder="e.g., POL-2024-001"
                        {...register("policyNumber")}
                      />
                    </Field>

                    <Field
                      label="Policy Type"
                      htmlFor="policyType"
                      required
                      error={errors.policyType?.message}>
                      <Controller
                        control={control}
                        name="policyType"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}>
                            <SelectTrigger id="policyType" aria-required="true">
                              <SelectValue placeholder="Select policy type" />
                            </SelectTrigger>
                            <SelectContent>
                              {POLICY_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>

                    <Field label="Status" htmlFor="status">
                      <Controller
                        control={control}
                        name="status"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}>
                            <SelectTrigger id="status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {POLICY_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>
                  </div>
                </div>

                {/* Policy Dates */}
                <div className="bg-muted space-y-4 rounded-lg p-4">
                  <div className="border-border border-b pb-3">
                    <h3 className="text-foreground text-sm font-semibold">
                      Policy Dates
                    </h3>
                    <p className="text-foreground/400 mt-1 text-xs">
                      Start date, coverage duration, and maturity information
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Start Date"
                      htmlFor="startDate"
                      required
                      error={errors.startDate?.message}>
                      <Controller
                        control={control}
                        name="startDate"
                        render={({ field }) => (
                          <DatePicker
                            id="startDate"
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </Field>

                    <Field
                      label="Coverage Until Age"
                      htmlFor="coverageUntilAge"
                      helper="Age when coverage ends">
                      <Input
                        id="coverageUntilAge"
                        type="number"
                        placeholder="e.g., 65"
                        {...register("coverageUntilAge")}
                      />
                    </Field>

                    <Field
                      label="Maturity Date"
                      htmlFor="maturityDate"
                      className="md:col-span-2"
                      helper="Autopopulated based on age and coverage duration">
                      <Controller
                        control={control}
                        name="maturityDate"
                        render={({ field }) => (
                          <DatePicker
                            id="maturityDate"
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </Field>
                  </div>
                </div>

                {/* Premium Details */}
                <div className="bg-muted space-y-4 rounded-lg p-4">
                  <div className="border-border border-b pb-3">
                    <h3 className="text-foreground text-sm font-semibold">
                      Premium Details
                    </h3>
                    <p className="text-foreground/400 mt-1 text-xs">
                      Premium amount, payment frequency, and total duration
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Premium Amount"
                      htmlFor="premiumAmount"
                      required
                      error={errors.premiumAmount?.message}>
                      <Controller
                        control={control}
                        name="premiumAmount"
                        render={({ field }) => (
                          <MoneyInput
                            id="premiumAmount"
                            step="0.01"
                            placeholder="0.00"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={field.onBlur}
                            aria-required="true"
                          />
                        )}
                      />
                    </Field>

                    <Field
                      label="CPF Premium"
                      htmlFor="premiumAmountCPF"
                      optional
                      helper="CPF-funded portion of the premium">
                      <Controller
                        control={control}
                        name="premiumAmountCPF"
                        render={({ field }) => (
                          <MoneyInput
                            id="premiumAmountCPF"
                            step="0.01"
                            placeholder="0.00"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={field.onBlur}
                          />
                        )}
                      />
                    </Field>

                    <Field
                      label="Premium Frequency"
                      htmlFor="premiumFrequency"
                      required
                      error={errors.premiumFrequency?.message}>
                      <Controller
                        control={control}
                        name="premiumFrequency"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value)
                              if (value !== "Custom")
                                setValue("selectedMonths", [])
                            }}>
                            <SelectTrigger
                              id="premiumFrequency"
                              aria-required="true">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              {PREMIUM_FREQUENCIES.map((freq) => (
                                <SelectItem key={freq} value={freq}>
                                  {freq}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>

                    {premiumFrequency === "Custom" && (
                      <Field
                        label="Select Months"
                        required
                        className="md:col-span-2"
                        error={errors.selectedMonths?.message}>
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
                        {selectedMonths.length === 0 ? (
                          <p className="text-muted-foreground text-xs">
                            Select the months when premium is due
                          </p>
                        ) : (
                          <p className="text-muted-foreground text-xs">
                            Premium due in:{" "}
                            {selectedMonths
                              .map(
                                (m) =>
                                  MONTHS.find((month) => month.value === m)
                                    ?.label
                              )
                              .join(", ")}
                          </p>
                        )}
                      </Field>
                    )}

                    <Field
                      label="Total Premium Duration"
                      htmlFor="totalPremiumDuration"
                      optional
                      className="md:col-span-2"
                      helper="Total number of years to pay premiums">
                      <Input
                        id="totalPremiumDuration"
                        type="number"
                        placeholder="e.g., 20"
                        {...register("totalPremiumDuration")}
                      />
                    </Field>
                  </div>
                </div>

                {/* Cash / Surrender Value */}
                <div className="bg-muted space-y-4 rounded-lg p-4">
                  <div className="border-border border-b pb-3">
                    <h3 className="text-foreground text-sm font-semibold">
                      Cash / Surrender Value (Optional)
                    </h3>
                    <p className="text-foreground/400 mt-1 text-xs">
                      For whole life or endowment policies with accumulated cash
                      value
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Cash Value" htmlFor="cashValue">
                      <Controller
                        control={control}
                        name="cashValue"
                        render={({ field }) => (
                          <MoneyInput
                            id="cashValue"
                            step="0.01"
                            placeholder="0.00"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={field.onBlur}
                          />
                        )}
                      />
                    </Field>
                    <Field label="As At Date" htmlFor="cashValueDate">
                      <Controller
                        control={control}
                        name="cashValueDate"
                        render={({ field }) => (
                          <DatePicker
                            id="cashValueDate"
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </Field>
                  </div>
                </div>

                {/* Coverage & Benefits */}
                <div className="bg-muted space-y-4 rounded-lg p-4">
                  <div className="border-border border-b pb-3">
                    <h3 className="text-foreground text-sm font-semibold">
                      Coverage & Benefits
                    </h3>
                    <p className="text-foreground/400 mt-1 text-xs">
                      Optional coverage amounts for death, TPD, critical
                      illness, and hospitalisation
                    </p>
                  </div>

                  {COVERAGE_ROWS.map((row) => (
                    <CoverageRow key={row.key} control={control} row={row} />
                  ))}
                </div>

                {/* Add to Expenses Toggle */}
                <div className="bg-muted space-y-4 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label
                        htmlFor="addToExpenditures"
                        className="text-foreground text-sm font-semibold">
                        Add to Expenses
                      </Label>
                      <p className="text-foreground/400 mt-1 text-xs">
                        Automatically track this policy&apos;s premium in your
                        expenses
                      </p>
                    </div>
                    <Switch
                      id="addToExpenditures"
                      checked={addToExpenditures}
                      onCheckedChange={handleToggleChange}
                    />
                  </div>
                  {validationError && (
                    <div className="text-on-danger bg-brand-alert-red/[0.12] rounded p-2 text-sm">
                      {validationError}
                    </div>
                  )}
                </div>
              </form>
            </DialogBody>

            {/* Actions */}
            <DialogFooterSticky>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="edit-policy-form"
                disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooterSticky>
          </>
        )}
      </DialogContent>

      {/* Add Confirmation Modal */}
      <AlertDialog
        open={confirmAddModalOpen}
        onOpenChange={setConfirmAddModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add to Expenses</AlertDialogTitle>
            <AlertDialogDescription>
              This will create an expense entry with the following details:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4 space-y-4">
            <Field label="Expense Name" htmlFor="expenseName">
              <Input
                id="expenseName"
                placeholder="Enter expense name"
                className="w-full"
                {...register("expenseName")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-foreground">Policy Type & Provider:</div>
              <div className="font-medium">
                {policyType} - {provider}
              </div>

              <div className="text-foreground">Premium Amount:</div>
              <div className="font-medium">${premiumAmount}</div>

              <div className="text-foreground">Frequency:</div>
              <div className="font-medium">{premiumFrequency}</div>

              {premiumFrequency === "Custom" && selectedMonths.length > 0 && (
                <>
                  <div className="text-foreground">Selected Months:</div>
                  <div className="font-medium">
                    {[...selectedMonths]
                      .sort((a, b) => a - b)
                      .map(
                        (m) => MONTHS.find((month) => month.value === m)?.label
                      )
                      .join(", ")}
                  </div>
                </>
              )}

              <div className="text-foreground">Start Date:</div>
              <div className="font-medium">
                {startDate ? format(startDate, "MMMM d, yyyy") : "-"}
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setValue("addToExpenditures", true)
                setConfirmAddModalOpen(false)
              }}>
              Add to Expenses
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Confirmation Modal */}
      <AlertDialog
        open={confirmUpdateModalOpen}
        onOpenChange={setConfirmUpdateModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Linked Expense</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ve made changes to the policy details. Do you want to
              update the linked expense as well?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4 space-y-4">
            <Field label="Expense Name" htmlFor="expenseNameUpdate">
              <Input
                id="expenseNameUpdate"
                placeholder="Enter expense name"
                className="w-full"
                {...register("expenseName")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-foreground">Policy Type & Provider:</div>
              <div className="font-medium">
                {policyType} - {provider}
              </div>

              <div className="text-foreground">Premium Amount:</div>
              <div className="font-medium">${premiumAmount}</div>

              <div className="text-foreground">Frequency:</div>
              <div className="font-medium">{premiumFrequency}</div>

              {premiumFrequency === "Custom" && selectedMonths.length > 0 && (
                <>
                  <div className="text-foreground">Selected Months:</div>
                  <div className="font-medium">
                    {[...selectedMonths]
                      .sort((a, b) => a - b)
                      .map(
                        (m) => MONTHS.find((month) => month.value === m)?.label
                      )
                      .join(", ")}
                  </div>
                </>
              )}

              <div className="text-foreground">Start Date:</div>
              <div className="font-medium">
                {startDate ? format(startDate, "MMMM d, yyyy") : "-"}
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performUpdate}>
              Update Expense
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog
        open={confirmDeleteModalOpen}
        onOpenChange={setConfirmDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Expenses</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the linked expense entry. Are you sure you want
              to remove this policy from expenses?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setValue("addToExpenditures", false)
                setConfirmDeleteModalOpen(false)
              }}
              className="bg-brand-alert-red hover:bg-brand-alert-red">
              Remove from Expenses
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
