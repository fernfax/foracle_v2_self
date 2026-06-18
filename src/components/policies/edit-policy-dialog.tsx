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
import { format, parseISO } from "date-fns"

import { policyFrequencyToExpenseFrequency } from "@/lib/utils"
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
import { ProviderManagerPopover } from "@/components/policies/provider-manager-popover"

interface Policy {
  id: string
  userId: string
  familyMemberId: string | null
  linkedExpenseId: string | null
  provider: string
  planName: string | null
  policyNumber: string | null
  policyType: string
  status: string | null
  startDate: string
  maturityDate: string | null
  coverageUntilAge: number | null
  premiumAmount: string
  premiumAmountCPF: string | null
  premiumFrequency: string
  customMonths: string | null
  totalPremiumDuration: number | null
  coverageOptions: string | null
  cashValue: string | null
  cashValueDate: string | null
  isActive: boolean | null
  description: string | null
  createdAt: Date
  updatedAt: Date
}

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

export function EditPolicyDialog({
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

  // Policy Holder
  const [selectedFamilyMember, setSelectedFamilyMember] = useState("")
  const [memberAge, setMemberAge] = useState<number | null>(null)

  // Policy Information
  const [provider, setProvider] = useState("")
  const [policyNumber, setPolicyNumber] = useState("")
  const [policyType, setPolicyType] = useState("")
  const [status, setStatus] = useState("Active")

  // Policy Dates
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [coverageUntilAge, setCoverageUntilAge] = useState("")
  const [maturityDate, setMaturityDate] = useState<Date | undefined>(undefined)

  // Premium Details
  const [premiumAmount, setPremiumAmount] = useState("")
  const [premiumAmountCPF, setPremiumAmountCPF] = useState("")
  const [premiumFrequency, setPremiumFrequency] = useState("")
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])
  const [totalPremiumDuration, setTotalPremiumDuration] = useState("")

  // Plan name & cash value
  const [planName, setPlanName] = useState("")
  const [cashValue, setCashValue] = useState("")
  const [cashValueDate, setCashValueDate] = useState<Date | undefined>(
    undefined
  )

  // Coverage Options
  const [deathCoverage, setDeathCoverage] = useState({
    enabled: false,
    amount: ""
  })
  const [tpdCoverage, setTpdCoverage] = useState({ enabled: false, amount: "" })
  const [criticalIllness, setCriticalIllness] = useState({
    enabled: false,
    amount: ""
  })
  const [earlyCriticalIllness, setEarlyCriticalIllness] = useState({
    enabled: false,
    amount: ""
  })
  const [hospitalisationPlan, setHospitalisationPlan] = useState({
    enabled: false,
    amount: ""
  })

  // Add to Expenses
  const [addToExpenditures, setAddToExpenditures] = useState(false)
  const [initialAddToExpenditures, setInitialAddToExpenditures] =
    useState(false)
  const [confirmAddModalOpen, setConfirmAddModalOpen] = useState(false)
  const [confirmUpdateModalOpen, setConfirmUpdateModalOpen] = useState(false)
  const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false)
  const [validationError, setValidationError] = useState("")
  const [expenseName, setExpenseName] = useState("")

  // Track if policy data has changed (for update modal)
  const [policyDataChanged, setPolicyDataChanged] = useState(false)

  // Load family members and providers, then populate form
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsDataLoading(true)
        const members = await getUserFamilyMembers()
        setFamilyMembers(members)
        const providersList = await getInsuranceProviders()
        setProviders(providersList)

        // Populate form AFTER data is loaded
        if (policy) {
          setSelectedFamilyMember(policy.familyMemberId || "")
          setProvider(policy.provider)
          setPlanName(policy.planName || "")
          setPolicyNumber(policy.policyNumber || "")
          setPolicyType(policy.policyType)
          setStatus(policy.status || "Active")
          setStartDate(parseISO(policy.startDate))
          setCoverageUntilAge(policy.coverageUntilAge?.toString() || "")
          setMaturityDate(
            policy.maturityDate ? parseISO(policy.maturityDate) : undefined
          )
          setPremiumAmount(policy.premiumAmount)
          setPremiumAmountCPF(policy.premiumAmountCPF || "")
          setPremiumFrequency(policy.premiumFrequency)
          setTotalPremiumDuration(policy.totalPremiumDuration?.toString() || "")
          setCashValue(policy.cashValue || "")
          setCashValueDate(
            policy.cashValueDate ? parseISO(policy.cashValueDate) : undefined
          )

          // Parse custom months if available
          if (policy.customMonths) {
            try {
              const months = JSON.parse(policy.customMonths)
              setSelectedMonths(Array.isArray(months) ? months : [])
            } catch {
              setSelectedMonths([])
            }
          } else {
            setSelectedMonths([])
          }

          // Set toggle state based on linkedExpenseId
          const hasLinkedExpense = !!policy.linkedExpenseId
          setAddToExpenditures(hasLinkedExpense)
          setInitialAddToExpenditures(hasLinkedExpense)
          setPolicyDataChanged(false)
          setValidationError("")

          // Parse coverage options
          if (policy.coverageOptions) {
            try {
              const options = JSON.parse(policy.coverageOptions)
              setDeathCoverage({
                enabled: options.death > 0,
                amount: options.death > 0 ? options.death.toString() : ""
              })
              setTpdCoverage({
                enabled: options.tpd > 0,
                amount: options.tpd > 0 ? options.tpd.toString() : ""
              })
              setCriticalIllness({
                enabled: options.criticalIllness > 0,
                amount:
                  options.criticalIllness > 0
                    ? options.criticalIllness.toString()
                    : ""
              })
              setEarlyCriticalIllness({
                enabled: options.earlyCriticalIllness > 0,
                amount:
                  options.earlyCriticalIllness > 0
                    ? options.earlyCriticalIllness.toString()
                    : ""
              })
              setHospitalisationPlan({
                enabled: options.hospitalisationPlan > 0,
                amount:
                  options.hospitalisationPlan > 0
                    ? options.hospitalisationPlan.toString()
                    : ""
              })
            } catch {
              // Reset if parsing fails
              setDeathCoverage({ enabled: false, amount: "" })
              setTpdCoverage({ enabled: false, amount: "" })
              setCriticalIllness({ enabled: false, amount: "" })
              setEarlyCriticalIllness({ enabled: false, amount: "" })
              setHospitalisationPlan({ enabled: false, amount: "" })
            }
          }
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
      // Reset loading state when dialog closes
      setIsDataLoading(true)
    }
  }, [policy, open])

  // Reload providers after changes
  const loadProviders = async () => {
    const providersList = await getInsuranceProviders()
    setProviders(providersList)
  }

  // Calculate age when family member is selected
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

  // Auto-calculate maturity date based on coverage until age
  useEffect(() => {
    if (coverageUntilAge && memberAge !== null && startDate) {
      const yearsUntilMaturity = parseInt(coverageUntilAge) - memberAge
      if (yearsUntilMaturity > 0) {
        const maturity = new Date(startDate)
        maturity.setFullYear(startDate.getFullYear() + yearsUntilMaturity)
        setMaturityDate(maturity)
      }
    }
  }, [coverageUntilAge, memberAge, startDate])

  // Track if policy data has changed for update modal
  useEffect(() => {
    if (!policy || !initialAddToExpenditures || !addToExpenditures) {
      setPolicyDataChanged(false)
      return
    }

    // Compare customMonths - need to handle JSON comparison
    const policyCustomMonths = policy.customMonths
      ? JSON.stringify(JSON.parse(policy.customMonths).sort())
      : null
    const currentCustomMonths =
      selectedMonths.length > 0
        ? JSON.stringify([...selectedMonths].sort())
        : null

    const hasChanged =
      policy.policyType !== policyType ||
      policy.provider !== provider ||
      policy.premiumAmount !== premiumAmount ||
      policy.premiumFrequency !== premiumFrequency ||
      policyCustomMonths !== currentCustomMonths ||
      format(parseISO(policy.startDate), "yyyy-MM-dd") !==
        (startDate ? format(startDate, "yyyy-MM-dd") : "") ||
      (policy.maturityDate
        ? format(parseISO(policy.maturityDate), "yyyy-MM-dd")
        : null) !== (maturityDate ? format(maturityDate, "yyyy-MM-dd") : null)

    setPolicyDataChanged(hasChanged)
  }, [
    policy,
    policyType,
    provider,
    premiumAmount,
    premiumFrequency,
    selectedMonths,
    startDate,
    maturityDate,
    initialAddToExpenditures,
    addToExpenditures
  ])

  const handleToggleChange = (checked: boolean) => {
    if (checked) {
      // Turning ON - validate required fields
      if (!startDate || !premiumAmount || !premiumFrequency) {
        setValidationError(
          "Please fill in Start Date, Premium Amount, and Premium Frequency before adding to expenses."
        )
        return
      }
      // Validate custom months if Custom frequency is selected
      if (premiumFrequency === "Custom" && selectedMonths.length === 0) {
        setValidationError(
          "Please select at least one month for custom premium frequency."
        )
        return
      }
      setValidationError("")
      // Initialize expense name with family member's first name
      const memberName =
        familyMembers.find((m) => m.id === policy?.familyMemberId)?.name || ""
      const firstName = memberName.split(" ")[0]
      setExpenseName(
        firstName
          ? `${firstName}'s ${policyType} - ${provider}`
          : `${policyType} - ${provider}`
      )
      setConfirmAddModalOpen(true)
    } else {
      // Turning OFF - show delete confirmation
      setConfirmDeleteModalOpen(true)
    }
  }

  const confirmAddToExpenditures = () => {
    console.log("=== Confirming Add to Expenses ===")
    console.log(
      "Before setAddToExpenditures, current value:",
      addToExpenditures
    )
    setAddToExpenditures(true)
    setConfirmAddModalOpen(false)
    console.log("Modal closed, addToExpenditures state update called")
  }

  const confirmRemoveFromExpenditures = () => {
    console.log("=== Confirming Remove from Expenses ===")
    console.log(
      "Before setAddToExpenditures, current value:",
      addToExpenditures
    )
    setAddToExpenditures(false)
    setConfirmDeleteModalOpen(false)
    console.log("Modal closed, addToExpenditures state update called")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!policy) return

    // If policy data changed and expense is linked, show update confirmation
    if (policyDataChanged && initialAddToExpenditures && addToExpenditures) {
      // Initialize expense name with family member's first name
      const memberName =
        familyMembers.find((m) => m.id === policy?.familyMemberId)?.name || ""
      const firstName = memberName.split(" ")[0]
      setExpenseName(
        firstName
          ? `${firstName}'s ${policyType} - ${provider}`
          : `${policyType} - ${provider}`
      )
      setConfirmUpdateModalOpen(true)
      return
    }

    await performUpdate()
  }

  const performUpdate = async () => {
    if (!policy) return

    setIsLoading(true)

    console.log("=== Form Submission Debug ===")
    console.log("addToExpenditures:", addToExpenditures)
    console.log("expenseName:", expenseName)
    console.log("policyType:", policyType)
    console.log("provider:", provider)
    console.log("premiumAmount:", premiumAmount)
    console.log("premiumFrequency:", premiumFrequency)
    console.log("startDate:", startDate)

    try {
      const coverageOptions = {
        death: deathCoverage.enabled
          ? parseFloat(deathCoverage.amount) || 0
          : 0,
        tpd: tpdCoverage.enabled ? parseFloat(tpdCoverage.amount) || 0 : 0,
        criticalIllness: criticalIllness.enabled
          ? parseFloat(criticalIllness.amount) || 0
          : 0,
        earlyCriticalIllness: earlyCriticalIllness.enabled
          ? parseFloat(earlyCriticalIllness.amount) || 0
          : 0,
        hospitalisationPlan: hospitalisationPlan.enabled
          ? parseFloat(hospitalisationPlan.amount) || 0
          : 0
      }

      // Create customMonths JSON if Custom frequency is selected
      const customMonthsJson =
        premiumFrequency === "Custom" && selectedMonths.length > 0
          ? JSON.stringify(selectedMonths)
          : undefined

      // Update the policy
      await updatePolicy(policy.id, {
        familyMemberId: selectedFamilyMember || undefined,
        provider,
        planName: planName || undefined,
        policyNumber: policyNumber || undefined,
        policyType,
        status,
        startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        maturityDate: maturityDate
          ? format(maturityDate, "yyyy-MM-dd")
          : undefined,
        coverageUntilAge: coverageUntilAge
          ? parseInt(coverageUntilAge)
          : undefined,
        premiumAmount,
        premiumAmountCPF: premiumAmountCPF || null,
        premiumFrequency,
        customMonths: customMonthsJson,
        totalPremiumDuration: totalPremiumDuration
          ? parseInt(totalPremiumDuration)
          : undefined,
        coverageOptions: JSON.stringify(coverageOptions),
        cashValue: cashValue || null,
        cashValueDate: cashValueDate
          ? format(cashValueDate, "yyyy-MM-dd")
          : null
      })

      console.log("Policy updated:", policy.id)

      // Handle expense linking changes
      if (!initialAddToExpenditures && addToExpenditures) {
        console.log("=== Creating Expense ===")
        console.log("Policy ID:", policy.id)
        console.log("Expense Name:", expenseName)
        // Create new expense
        const expense = await createExpenseFromPolicy({
          policyId: policy.id,
          name: expenseName,
          policyType,
          provider,
          premiumAmount: parseFloat(premiumAmount),
          premiumFrequency: policyFrequencyToExpenseFrequency(premiumFrequency),
          customMonths: customMonthsJson,
          startDate: format(startDate!, "yyyy-MM-dd"),
          maturityDate: maturityDate
            ? format(maturityDate, "yyyy-MM-dd")
            : undefined
        })

        console.log("Expense created:", expense?.id)

        await updatePolicy(policy.id, {
          linkedExpenseId: expense.id
        })

        console.log("Policy updated with linkedExpenseId:", expense.id)
      } else if (initialAddToExpenditures && !addToExpenditures) {
        console.log("=== Deleting Linked Expense ===")
        console.log("Policy ID:", policy.id)
        console.log("Linked Expense ID:", policy.linkedExpenseId)
        // Delete linked expense
        await deleteLinkedExpense(policy.id)
        // Clearing the link writes NULL to the nullable linked_expense_id column.
        // updatePolicy forwards null through to the DB at runtime, but its param
        // type only models setting a string, so cast the cleared value.
        await updatePolicy(policy.id, {
          linkedExpenseId: null as unknown as string
        })
        console.log("Expense deleted and policy updated")
      } else if (
        initialAddToExpenditures &&
        addToExpenditures &&
        policyDataChanged &&
        policy.linkedExpenseId
      ) {
        console.log("=== Updating Expense ===")
        console.log("Policy ID:", policy.id)
        console.log("Expense ID:", policy.linkedExpenseId)
        console.log("Expense Name:", expenseName)
        // Update existing expense
        await updateExpenseFromPolicy(policy.linkedExpenseId, {
          name: expenseName,
          policyType,
          provider,
          premiumAmount: parseFloat(premiumAmount),
          premiumFrequency: policyFrequencyToExpenseFrequency(premiumFrequency),
          customMonths: customMonthsJson,
          startDate: format(startDate!, "yyyy-MM-dd"),
          maturityDate: maturityDate
            ? format(maturityDate, "yyyy-MM-dd")
            : undefined
        })
        console.log("Expense updated:", policy.linkedExpenseId)
      } else {
        console.log(
          "Skipping expense creation/update - addToExpenditures:",
          addToExpenditures,
          "initialAddToExpenditures:",
          initialAddToExpenditures,
          "policyDataChanged:",
          policyDataChanged
        )
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
            <div className="border-border h-8 w-8 animate-spin rounded-full border-b-2"></div>
            <span className="text-muted-foreground ml-3">
              Loading policy details...
            </span>
          </div>
        ) : (
          <>
            <DialogBody>
              <form
                id="edit-policy-form"
                onSubmit={handleSubmit}
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
                    <Select
                      value={selectedFamilyMember}
                      onValueChange={setSelectedFamilyMember}>
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
                      required>
                      <Select
                        value={provider}
                        onValueChange={setProvider}
                        required>
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
                      <ProviderManagerPopover
                        providers={providers}
                        onProvidersChanged={loadProviders}
                      />
                    </Field>

                    <Field label="Plan Name" htmlFor="planName" optional>
                      <Input
                        id="planName"
                        placeholder="e.g., Flexi Life III"
                        value={planName}
                        onChange={(e) => setPlanName(e.target.value)}
                      />
                    </Field>

                    <Field
                      label="Policy Number"
                      htmlFor="policyNumber"
                      optional>
                      <Input
                        id="policyNumber"
                        placeholder="e.g., POL-2024-001"
                        value={policyNumber}
                        onChange={(e) => setPolicyNumber(e.target.value)}
                      />
                    </Field>

                    <Field label="Policy Type" htmlFor="policyType" required>
                      <Select
                        value={policyType}
                        onValueChange={setPolicyType}
                        required>
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
                    </Field>

                    <Field label="Status" htmlFor="status">
                      <Select value={status} onValueChange={setStatus}>
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
                    <Field label="Start Date" htmlFor="startDate" required>
                      <DatePicker
                        id="startDate"
                        value={startDate}
                        onChange={setStartDate}
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
                        value={coverageUntilAge}
                        onChange={(e) => setCoverageUntilAge(e.target.value)}
                      />
                    </Field>

                    <Field
                      label="Maturity Date"
                      htmlFor="maturityDate"
                      className="md:col-span-2"
                      helper="Autopopulated based on age and coverage duration">
                      <DatePicker
                        id="maturityDate"
                        value={maturityDate}
                        onChange={setMaturityDate}
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
                      required>
                      <MoneyInput
                        id="premiumAmount"
                        step="0.01"
                        placeholder="0.00"
                        value={premiumAmount}
                        onChange={(e) => setPremiumAmount(e.target.value)}
                        required
                        aria-required="true"
                      />
                    </Field>

                    <Field
                      label="CPF Premium"
                      htmlFor="premiumAmountCPF"
                      optional
                      helper="CPF-funded portion of the premium">
                      <MoneyInput
                        id="premiumAmountCPF"
                        step="0.01"
                        placeholder="0.00"
                        value={premiumAmountCPF}
                        onChange={(e) => setPremiumAmountCPF(e.target.value)}
                      />
                    </Field>

                    <Field
                      label="Premium Frequency"
                      htmlFor="premiumFrequency"
                      required>
                      <Select
                        value={premiumFrequency}
                        onValueChange={(value) => {
                          setPremiumFrequency(value)
                          if (value !== "Custom") {
                            setSelectedMonths([])
                          }
                        }}
                        required>
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
                    </Field>

                    {/* Month Picker for Custom Frequency */}
                    {premiumFrequency === "Custom" && (
                      <Field
                        label="Select Months"
                        required
                        className="md:col-span-2">
                        <MonthPicker
                          value={selectedMonths}
                          onChange={setSelectedMonths}
                        />
                        {selectedMonths.length === 0 && (
                          <p className="text-muted-foreground text-xs">
                            Select the months when premium is due
                          </p>
                        )}
                        {selectedMonths.length > 0 && (
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
                        value={totalPremiumDuration}
                        onChange={(e) =>
                          setTotalPremiumDuration(e.target.value)
                        }
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
                      <MoneyInput
                        id="cashValue"
                        step="0.01"
                        placeholder="0.00"
                        value={cashValue}
                        onChange={(e) => setCashValue(e.target.value)}
                      />
                    </Field>
                    <Field label="As At Date" htmlFor="cashValueDate">
                      <DatePicker
                        id="cashValueDate"
                        value={cashValueDate}
                        onChange={setCashValueDate}
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

                  {/* Death Coverage */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-1 items-center gap-2">
                      <Checkbox
                        id="death"
                        checked={deathCoverage.enabled}
                        onCheckedChange={(checked) =>
                          setDeathCoverage({
                            ...deathCoverage,
                            enabled: checked as boolean
                          })
                        }
                      />
                      <Label
                        htmlFor="death"
                        className="cursor-pointer font-normal">
                        Death
                      </Label>
                    </div>
                    <div className="w-48">
                      <Label className="text-muted-foreground text-xs">
                        Sum Assured
                      </Label>
                      <MoneyInput
                        step="0.01"
                        placeholder="0.00"
                        disabled={!deathCoverage.enabled}
                        value={deathCoverage.amount}
                        onChange={(e) =>
                          setDeathCoverage({
                            ...deathCoverage,
                            amount: e.target.value
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* TPD Coverage */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-1 items-center gap-2">
                      <Checkbox
                        id="tpd"
                        checked={tpdCoverage.enabled}
                        onCheckedChange={(checked) =>
                          setTpdCoverage({
                            ...tpdCoverage,
                            enabled: checked as boolean
                          })
                        }
                      />
                      <Label
                        htmlFor="tpd"
                        className="cursor-pointer font-normal">
                        TPD
                      </Label>
                    </div>
                    <div className="w-48">
                      <Label className="text-muted-foreground text-xs">
                        Sum Assured
                      </Label>
                      <MoneyInput
                        step="0.01"
                        placeholder="0.00"
                        disabled={!tpdCoverage.enabled}
                        value={tpdCoverage.amount}
                        onChange={(e) =>
                          setTpdCoverage({
                            ...tpdCoverage,
                            amount: e.target.value
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Critical Illness */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-1 items-center gap-2">
                      <Checkbox
                        id="criticalIllness"
                        checked={criticalIllness.enabled}
                        onCheckedChange={(checked) =>
                          setCriticalIllness({
                            ...criticalIllness,
                            enabled: checked as boolean
                          })
                        }
                      />
                      <Label
                        htmlFor="criticalIllness"
                        className="cursor-pointer font-normal">
                        Critical Illness
                      </Label>
                    </div>
                    <div className="w-48">
                      <Label className="text-muted-foreground text-xs">
                        Sum Assured
                      </Label>
                      <MoneyInput
                        step="0.01"
                        placeholder="0.00"
                        disabled={!criticalIllness.enabled}
                        value={criticalIllness.amount}
                        onChange={(e) =>
                          setCriticalIllness({
                            ...criticalIllness,
                            amount: e.target.value
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Early Critical Illness */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-1 items-center gap-2">
                      <Checkbox
                        id="earlyCriticalIllness"
                        checked={earlyCriticalIllness.enabled}
                        onCheckedChange={(checked) =>
                          setEarlyCriticalIllness({
                            ...earlyCriticalIllness,
                            enabled: checked as boolean
                          })
                        }
                      />
                      <Label
                        htmlFor="earlyCriticalIllness"
                        className="cursor-pointer font-normal">
                        Early Critical Illness
                      </Label>
                    </div>
                    <div className="w-48">
                      <Label className="text-muted-foreground text-xs">
                        Sum Assured
                      </Label>
                      <MoneyInput
                        step="0.01"
                        placeholder="0.00"
                        disabled={!earlyCriticalIllness.enabled}
                        value={earlyCriticalIllness.amount}
                        onChange={(e) =>
                          setEarlyCriticalIllness({
                            ...earlyCriticalIllness,
                            amount: e.target.value
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Hospitalisation Plan */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-1 items-center gap-2">
                      <Checkbox
                        id="hospitalisationPlan"
                        checked={hospitalisationPlan.enabled}
                        onCheckedChange={(checked) =>
                          setHospitalisationPlan({
                            ...hospitalisationPlan,
                            enabled: checked as boolean
                          })
                        }
                      />
                      <Label
                        htmlFor="hospitalisationPlan"
                        className="cursor-pointer font-normal">
                        Hospitalisation Plan
                      </Label>
                    </div>
                    <div className="w-48">
                      <Label className="text-muted-foreground text-xs">
                        Claimable Amount
                      </Label>
                      <MoneyInput
                        step="0.01"
                        placeholder="0.00"
                        disabled={!hospitalisationPlan.enabled}
                        value={hospitalisationPlan.amount}
                        onChange={(e) =>
                          setHospitalisationPlan({
                            ...hospitalisationPlan,
                            amount: e.target.value
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
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
            {/* Expense Name Input */}
            <Field label="Expense Name" htmlFor="expenseName">
              <Input
                id="expenseName"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                placeholder="Enter expense name"
                className="w-full"
              />
            </Field>

            {/* Other Details */}
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
                    {selectedMonths
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
            <AlertDialogAction onClick={confirmAddToExpenditures}>
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
            {/* Expense Name Input */}
            <Field label="Expense Name" htmlFor="expenseNameUpdate">
              <Input
                id="expenseNameUpdate"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                placeholder="Enter expense name"
                className="w-full"
              />
            </Field>

            {/* Other Details */}
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
                    {selectedMonths
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
              onClick={confirmRemoveFromExpenditures}
              className="bg-brand-alert-red hover:bg-brand-alert-red">
              Remove from Expenses
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
