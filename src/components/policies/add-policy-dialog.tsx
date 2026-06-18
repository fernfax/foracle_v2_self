"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createExpenseFromPolicy } from "@/actions/expenses"
import {
  getInsuranceProviders,
  type InsuranceProvider
} from "@/actions/insurance-providers"
import { createPolicy, updatePolicy } from "@/actions/policies"
import { getUserFamilyMembers } from "@/actions/user"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { toast } from "sonner"

import { cn, policyFrequencyToExpenseFrequency } from "@/lib/utils"
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
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooterSticky,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ProviderManagerPopover } from "@/components/policies/provider-manager-popover"

interface FamilyMember {
  id: string
  name: string
  dateOfBirth: string | null
}

interface AddPolicyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  preselectedFamilyMemberId?: string
  onPolicyAdded?: () => void
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

export function AddPolicyDialog({
  open,
  onOpenChange,
  userId,
  preselectedFamilyMemberId,
  onPolicyAdded
}: AddPolicyDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [providers, setProviders] = useState<InsuranceProvider[]>([])

  // Policy Holder
  const [selectedFamilyMember, setSelectedFamilyMember] = useState("")
  const [memberAge, setMemberAge] = useState<number | null>(null)

  // Set preselected family member when dialog opens
  useEffect(() => {
    if (open && preselectedFamilyMemberId) {
      setSelectedFamilyMember(preselectedFamilyMemberId)
    }
  }, [open, preselectedFamilyMemberId])

  // Policy Information
  const [provider, setProvider] = useState("")
  const [planName, setPlanName] = useState("")
  const [policyNumber, setPolicyNumber] = useState("")
  const [policyType, setPolicyType] = useState("")
  const [status, setStatus] = useState("Active")

  // Policy Dates
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [coverageUntilAge, setCoverageUntilAge] = useState("")
  const [maturityDate, setMaturityDate] = useState<Date | undefined>(undefined)
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [maturityDateOpen, setMaturityDateOpen] = useState(false)

  // Premium Details
  const [premiumAmount, setPremiumAmount] = useState("")
  const [premiumAmountCPF, setPremiumAmountCPF] = useState("")
  const [premiumFrequency, setPremiumFrequency] = useState("")
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])
  const [totalPremiumDuration, setTotalPremiumDuration] = useState("")

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

  // Cash value (whole life / endowment)
  const [cashValue, setCashValue] = useState("")
  const [cashValueDate, setCashValueDate] = useState("")

  // Add to Expenditures
  const [addToExpenditures, setAddToExpenditures] = useState(false)
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false)
  const [validationError, setValidationError] = useState("")
  const [expenseName, setExpenseName] = useState("")

  // Load family members and providers
  useEffect(() => {
    const loadData = async () => {
      const members = await getUserFamilyMembers()
      setFamilyMembers(members)
      const providersList = await getInsuranceProviders()
      setProviders(providersList)
    }
    if (open) {
      loadData()
    }
  }, [userId, open])

  // Reload providers after changes
  const loadProviders = async () => {
    const providersList = await getInsuranceProviders()
    setProviders(providersList)
  }

  // Toggle month selection for custom frequency
  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month)
        ? prev.filter((m) => m !== month)
        : [...prev, month].sort((a, b) => a - b)
    )
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

  const handleToggleChange = (checked: boolean) => {
    if (checked) {
      // Validate required fields
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
        familyMembers.find((m) => m.id === selectedFamilyMember)?.name || ""
      const firstName = memberName.split(" ")[0]
      setExpenseName(
        firstName
          ? `${firstName}'s ${policyType} - ${provider}`
          : `${policyType} - ${provider}`
      )
      setConfirmationModalOpen(true)
    } else {
      setAddToExpenditures(false)
    }
  }

  const confirmAddToExpenditures = async () => {
    setAddToExpenditures(true)
    setConfirmationModalOpen(false)
    // Note: The form submission happens when user clicks "Add Policy" button
    // This just confirms they want to add to expenditures
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Required-field validation. Start Date is a Popover (not a native input),
    // so nothing else gates it — without this guard an empty start_date reaches
    // the server and trips the NOT NULL column with a silent 500.
    if (
      !provider ||
      !policyType ||
      !startDate ||
      !premiumAmount ||
      !premiumFrequency
    ) {
      toast.error(
        "Please fill in all required fields: Provider, Policy Type, Start Date, Premium Amount, and Premium Frequency."
      )
      return
    }
    if (premiumFrequency === "Custom" && selectedMonths.length === 0) {
      toast.error(
        "Please select at least one month for the custom premium frequency."
      )
      return
    }

    setIsLoading(true)
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

      // Create the policy first
      const customMonthsJson =
        premiumFrequency === "Custom" && selectedMonths.length > 0
          ? JSON.stringify(selectedMonths)
          : undefined

      const newPolicy = await createPolicy({
        familyMemberId: selectedFamilyMember || undefined,
        provider,
        planName: planName || undefined,
        policyNumber: policyNumber || undefined,
        policyType,
        status,
        startDate: startDate ? format(startDate, "yyyy-MM-dd") : "",
        maturityDate: maturityDate
          ? format(maturityDate, "yyyy-MM-dd")
          : undefined,
        coverageUntilAge: coverageUntilAge
          ? parseInt(coverageUntilAge)
          : undefined,
        premiumAmount,
        premiumAmountCPF: premiumAmountCPF || undefined,
        premiumFrequency,
        customMonths: customMonthsJson,
        totalPremiumDuration: totalPremiumDuration
          ? parseInt(totalPremiumDuration)
          : undefined,
        coverageOptions: JSON.stringify(coverageOptions),
        cashValue: cashValue || undefined,
        cashValueDate: cashValueDate || undefined
      })

      // If toggle is on, create expense and update policy with linkedExpenseId
      if (addToExpenditures && newPolicy) {
        const expense = await createExpenseFromPolicy({
          policyId: newPolicy.id,
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

        // Update the policy with the linkedExpenseId
        await updatePolicy(newPolicy.id, {
          linkedExpenseId: expense.id
        })
      }

      onOpenChange(false)
      resetForm()
      onPolicyAdded?.()
      toast.success("Policy added")
      router.refresh()
    } catch (error) {
      console.error("Failed to create policy:", error)
      toast.error("Could not save the policy. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedFamilyMember("")
    setProvider("")
    setPlanName("")
    setPolicyNumber("")
    setPolicyType("")
    setStatus("Active")
    setStartDate(undefined)
    setCoverageUntilAge("")
    setMaturityDate(undefined)
    setPremiumAmount("")
    setPremiumAmountCPF("")
    setPremiumFrequency("")
    setSelectedMonths([])
    setTotalPremiumDuration("")
    setDeathCoverage({ enabled: false, amount: "" })
    setTpdCoverage({ enabled: false, amount: "" })
    setCriticalIllness({ enabled: false, amount: "" })
    setEarlyCriticalIllness({ enabled: false, amount: "" })
    setHospitalisationPlan({ enabled: false, amount: "" })
    setCashValue("")
    setCashValueDate("")
    setAddToExpenditures(false)
    setValidationError("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add Insurance Policy</DialogTitle>
          <DialogDescription>
            Enter the details of your insurance policy
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <form
            id="add-policy-form"
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
              <div>
                <Label htmlFor="familyMember">
                  Family Member <span className="text-on-danger">*</span>
                  {memberAge !== null && (
                    <span className="text-muted-foreground ml-2 text-sm">
                      Age: {memberAge}
                    </span>
                  )}
                </Label>
                <Select
                  value={selectedFamilyMember}
                  onValueChange={setSelectedFamilyMember}>
                  <SelectTrigger id="familyMember">
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
              </div>
            </div>

            {/* Policy Information */}
            <div className="bg-muted space-y-4 rounded-lg p-4">
              <div className="border-border border-b pb-3">
                <h3 className="text-foreground text-sm font-semibold">
                  Policy Information
                </h3>
                <p className="text-foreground/400 mt-1 text-xs">
                  Details about the insurance provider, policy type, and status
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="provider">
                    Insurance Provider <span className="text-on-danger">*</span>
                  </Label>
                  <Select value={provider} onValueChange={setProvider} required>
                    <SelectTrigger id="provider">
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
                </div>

                <div>
                  <Label htmlFor="planName">Plan Name (Optional)</Label>
                  <Input
                    id="planName"
                    placeholder="e.g., Supreme Early Multiplier 20"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="policyNumber">Policy Number (Optional)</Label>
                  <Input
                    id="policyNumber"
                    placeholder="e.g., POL-2024-001"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="policyType">
                    Policy Type <span className="text-on-danger">*</span>
                  </Label>
                  <Select
                    value={policyType}
                    onValueChange={setPolicyType}
                    required>
                    <SelectTrigger id="policyType">
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
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
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
                </div>
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
                <div>
                  <Label htmlFor="startDate">
                    Start Date <span className="text-on-danger">*</span>
                  </Label>
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate
                          ? format(startDate, "MMMM do, yyyy")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date)
                          setStartDateOpen(false)
                        }}
                        initialFocus
                        fixedWeeks
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="coverageUntilAge">Coverage Until Age</Label>
                  <Input
                    id="coverageUntilAge"
                    type="number"
                    placeholder="e.g., 65"
                    value={coverageUntilAge}
                    onChange={(e) => setCoverageUntilAge(e.target.value)}
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Age when coverage ends
                  </p>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="maturityDate">Maturity Date</Label>
                  <Popover
                    open={maturityDateOpen}
                    onOpenChange={setMaturityDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !maturityDate && "text-muted-foreground"
                        )}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {maturityDate
                          ? format(maturityDate, "MMMM do, yyyy")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={maturityDate}
                        onSelect={(date) => {
                          setMaturityDate(date)
                          setMaturityDateOpen(false)
                        }}
                        initialFocus
                        fixedWeeks
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Autopopulated based on age and coverage duration
                  </p>
                </div>
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
                <div>
                  <Label htmlFor="premiumAmount">
                    Premium Amount <span className="text-on-danger">*</span>
                  </Label>
                  <div className="relative">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                      $
                    </span>
                    <Input
                      id="premiumAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7"
                      value={premiumAmount}
                      onChange={(e) => setPremiumAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="premiumAmountCPF">
                    CPF Premium (Optional)
                  </Label>
                  <p className="text-muted-foreground mb-1 text-xs">
                    CPF-funded portion of the premium (same frequency as above)
                  </p>
                  <div className="relative">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                      $
                    </span>
                    <Input
                      id="premiumAmountCPF"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7"
                      value={premiumAmountCPF}
                      onChange={(e) => setPremiumAmountCPF(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="premiumFrequency">
                    Premium Frequency <span className="text-on-danger">*</span>
                  </Label>
                  <Select
                    value={premiumFrequency}
                    onValueChange={(value) => {
                      setPremiumFrequency(value)
                      if (value !== "Custom") {
                        setSelectedMonths([])
                      }
                    }}
                    required>
                    <SelectTrigger id="premiumFrequency">
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
                </div>

                {/* Month Picker for Custom Frequency */}
                {premiumFrequency === "Custom" && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>
                      Select Months <span className="text-on-danger">*</span>
                    </Label>
                    <div className="grid grid-cols-6 gap-2">
                      {MONTHS.map((month) => (
                        <Button
                          key={month.value}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleMonth(month.value)}
                          className={cn(
                            "h-10 font-medium",
                            selectedMonths.includes(month.value)
                              ? "border-black bg-black text-white hover:bg-black/90"
                              : "bg-card hover:bg-muted"
                          )}>
                          {month.label}
                        </Button>
                      ))}
                    </div>
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
                              MONTHS.find((month) => month.value === m)?.label
                          )
                          .join(", ")}
                      </p>
                    )}
                  </div>
                )}

                <div className="md:col-span-2">
                  <Label htmlFor="totalPremiumDuration">
                    Total Premium Duration (Optional)
                  </Label>
                  <Input
                    id="totalPremiumDuration"
                    type="number"
                    placeholder="e.g., 20"
                    value={totalPremiumDuration}
                    onChange={(e) => setTotalPremiumDuration(e.target.value)}
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Total number of years to pay premiums
                  </p>
                </div>
              </div>
            </div>

            {/* Coverage & Benefits */}
            <div className="bg-muted space-y-4 rounded-lg p-4">
              <div className="border-border border-b pb-3">
                <h3 className="text-foreground text-sm font-semibold">
                  Coverage & Benefits
                </h3>
                <p className="text-foreground/400 mt-1 text-xs">
                  Optional coverage amounts for death, TPD, critical illness,
                  and hospitalisation
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
                  <Label htmlFor="death" className="cursor-pointer font-normal">
                    Death
                  </Label>
                </div>
                <div className="w-48">
                  <Label className="text-muted-foreground text-xs">
                    Sum Assured
                  </Label>
                  <div className="relative">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7"
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
                  <Label htmlFor="tpd" className="cursor-pointer font-normal">
                    TPD
                  </Label>
                </div>
                <div className="w-48">
                  <Label className="text-muted-foreground text-xs">
                    Sum Assured
                  </Label>
                  <div className="relative">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7"
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
                  <div className="relative">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7"
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
                  <div className="relative">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7"
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
                  <div className="relative">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7"
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
            </div>

            {/* Cash Value */}
            <div className="space-y-3">
              <div>
                <p className="text-foreground text-sm font-semibold">
                  Cash / Surrender Value (Optional)
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  For whole life or endowment policies with a surrender value
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cashValue">Cash Value ($)</Label>
                  <div className="relative">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                      $
                    </span>
                    <Input
                      id="cashValue"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7"
                      value={cashValue}
                      onChange={(e) => setCashValue(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cashValueDate">As of Date</Label>
                  <Input
                    id="cashValueDate"
                    type="date"
                    value={cashValueDate}
                    onChange={(e) => setCashValueDate(e.target.value)}
                  />
                </div>
              </div>
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
          <Button type="submit" form="add-policy-form" disabled={isLoading}>
            {isLoading ? "Adding..." : "Add Policy"}
          </Button>
        </DialogFooterSticky>
      </DialogContent>

      {/* Confirmation Modal */}
      <AlertDialog
        open={confirmationModalOpen}
        onOpenChange={setConfirmationModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add to Expenses</AlertDialogTitle>
            <AlertDialogDescription>
              This will create an expense entry with the following details:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4 space-y-4">
            {/* Expense Name Input */}
            <div className="space-y-2">
              <Label htmlFor="expenseName" className="text-sm font-medium">
                Expense Name
              </Label>
              <Input
                id="expenseName"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                placeholder="Enter expense name"
                className="w-full"
              />
            </div>

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
    </Dialog>
  )
}
