"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn, policyFrequencyToExpenseFrequency } from "@/lib/utils";
import { updatePolicy } from "@/lib/actions/policies";
import { getUserFamilyMembers } from "@/lib/actions/user";
import { getInsuranceProviders, type InsuranceProvider } from "@/lib/actions/insurance-providers";
import { ProviderManagerPopover } from "./provider-manager-popover";
import { createExpenseFromPolicy, updateExpenseFromPolicy, deleteLinkedExpense } from "@/lib/actions/expenses";

interface Policy {
  id: string;
  userId: string;
  familyMemberId: string | null;
  linkedExpenseId: string | null;
  provider: string;
  policyNumber: string | null;
  policyType: string;
  status: string | null;
  startDate: string;
  maturityDate: string | null;
  coverageUntilAge: number | null;
  premiumAmount: string;
  premiumFrequency: string;
  totalPremiumDuration: number | null;
  coverageOptions: string | null;
  isActive: boolean | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FamilyMember {
  id: string;
  name: string;
  dateOfBirth: string | null;
}

interface EditPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: Policy | null;
  userId: string;
  onPolicyUpdated?: () => void;
}

const POLICY_TYPES = [
  "Critical Illness",
  "Disability Insurance",
  "Whole Life",
  "Term Life",
  "Endowment",
  "Investment-Linked",
  "Hospitalisation Plan",
  "Other",
];

const POLICY_STATUSES = [
  "Active",
  "Lapsed",
  "Cancelled",
  "Matured",
];

const PREMIUM_FREQUENCIES = [
  "Monthly",
  "Quarterly",
  "Semi-Yearly",
  "Yearly",
];

export function EditPolicyDialog({ open, onOpenChange, policy, userId, onPolicyUpdated }: EditPolicyDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);

  // Policy Holder
  const [selectedFamilyMember, setSelectedFamilyMember] = useState("");
  const [memberAge, setMemberAge] = useState<number | null>(null);

  // Policy Information
  const [provider, setProvider] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [policyType, setPolicyType] = useState("");
  const [status, setStatus] = useState("Active");

  // Policy Dates
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [coverageUntilAge, setCoverageUntilAge] = useState("");
  const [maturityDate, setMaturityDate] = useState<Date | undefined>(undefined);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [maturityDateOpen, setMaturityDateOpen] = useState(false);

  // Premium Details
  const [premiumAmount, setPremiumAmount] = useState("");
  const [premiumFrequency, setPremiumFrequency] = useState("");
  const [totalPremiumDuration, setTotalPremiumDuration] = useState("");

  // Coverage Options
  const [deathCoverage, setDeathCoverage] = useState({ enabled: false, amount: "" });
  const [tpdCoverage, setTpdCoverage] = useState({ enabled: false, amount: "" });
  const [criticalIllness, setCriticalIllness] = useState({ enabled: false, amount: "" });
  const [earlyCriticalIllness, setEarlyCriticalIllness] = useState({ enabled: false, amount: "" });
  const [hospitalisationPlan, setHospitalisationPlan] = useState({ enabled: false, amount: "" });

  // Add to Expenses
  const [addToExpenditures, setAddToExpenditures] = useState(false);
  const [initialAddToExpenditures, setInitialAddToExpenditures] = useState(false);
  const [confirmAddModalOpen, setConfirmAddModalOpen] = useState(false);
  const [confirmUpdateModalOpen, setConfirmUpdateModalOpen] = useState(false);
  const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [expenseName, setExpenseName] = useState("");

  // Track if policy data has changed (for update modal)
  const [policyDataChanged, setPolicyDataChanged] = useState(false);

  // Load family members and providers
  useEffect(() => {
    const loadData = async () => {
      const members = await getUserFamilyMembers(userId);
      setFamilyMembers(members);
      const providersList = await getInsuranceProviders();
      setProviders(providersList);
    };
    if (open) {
      loadData();
    }
  }, [userId, open]);

  // Populate form when policy changes
  useEffect(() => {
    if (policy && open) {
      setSelectedFamilyMember(policy.familyMemberId || "");
      setProvider(policy.provider);
      setPolicyNumber(policy.policyNumber || "");
      setPolicyType(policy.policyType);
      setStatus(policy.status || "Active");
      setStartDate(new Date(policy.startDate));
      setCoverageUntilAge(policy.coverageUntilAge?.toString() || "");
      setMaturityDate(policy.maturityDate ? new Date(policy.maturityDate) : undefined);
      setPremiumAmount(policy.premiumAmount);
      setPremiumFrequency(policy.premiumFrequency);
      setTotalPremiumDuration(policy.totalPremiumDuration?.toString() || "");

      // Set toggle state based on linkedExpenseId
      const hasLinkedExpense = !!policy.linkedExpenseId;
      setAddToExpenditures(hasLinkedExpense);
      setInitialAddToExpenditures(hasLinkedExpense);
      setPolicyDataChanged(false);
      setValidationError("");

      // Parse coverage options
      if (policy.coverageOptions) {
        try {
          const options = JSON.parse(policy.coverageOptions);
          setDeathCoverage({
            enabled: options.death > 0,
            amount: options.death > 0 ? options.death.toString() : "",
          });
          setTpdCoverage({
            enabled: options.tpd > 0,
            amount: options.tpd > 0 ? options.tpd.toString() : "",
          });
          setCriticalIllness({
            enabled: options.criticalIllness > 0,
            amount: options.criticalIllness > 0 ? options.criticalIllness.toString() : "",
          });
          setEarlyCriticalIllness({
            enabled: options.earlyCriticalIllness > 0,
            amount: options.earlyCriticalIllness > 0 ? options.earlyCriticalIllness.toString() : "",
          });
          setHospitalisationPlan({
            enabled: options.hospitalisationPlan > 0,
            amount: options.hospitalisationPlan > 0 ? options.hospitalisationPlan.toString() : "",
          });
        } catch (e) {
          // Reset if parsing fails
          setDeathCoverage({ enabled: false, amount: "" });
          setTpdCoverage({ enabled: false, amount: "" });
          setCriticalIllness({ enabled: false, amount: "" });
          setEarlyCriticalIllness({ enabled: false, amount: "" });
          setHospitalisationPlan({ enabled: false, amount: "" });
        }
      }
    }
  }, [policy, open]);

  // Reload providers after changes
  const loadProviders = async () => {
    const providersList = await getInsuranceProviders();
    setProviders(providersList);
  };

  // Calculate age when family member is selected
  useEffect(() => {
    const member = familyMembers.find((m) => m.id === selectedFamilyMember);
    if (member?.dateOfBirth) {
      const birthDate = new Date(member.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setMemberAge(age);
    } else {
      setMemberAge(null);
    }
  }, [selectedFamilyMember, familyMembers]);

  // Auto-calculate maturity date based on coverage until age
  useEffect(() => {
    if (coverageUntilAge && memberAge !== null && startDate) {
      const yearsUntilMaturity = parseInt(coverageUntilAge) - memberAge;
      if (yearsUntilMaturity > 0) {
        const maturity = new Date(startDate);
        maturity.setFullYear(startDate.getFullYear() + yearsUntilMaturity);
        setMaturityDate(maturity);
      }
    }
  }, [coverageUntilAge, memberAge, startDate]);

  // Track if policy data has changed for update modal
  useEffect(() => {
    if (!policy || !initialAddToExpenditures || !addToExpenditures) {
      setPolicyDataChanged(false);
      return;
    }

    const hasChanged =
      policy.policyType !== policyType ||
      policy.provider !== provider ||
      policy.premiumAmount !== premiumAmount ||
      policy.premiumFrequency !== premiumFrequency ||
      format(new Date(policy.startDate), "yyyy-MM-dd") !== (startDate ? format(startDate, "yyyy-MM-dd") : "") ||
      (policy.maturityDate ? format(new Date(policy.maturityDate), "yyyy-MM-dd") : null) !== (maturityDate ? format(maturityDate, "yyyy-MM-dd") : null);

    setPolicyDataChanged(hasChanged);
  }, [policy, policyType, provider, premiumAmount, premiumFrequency, startDate, maturityDate, initialAddToExpenditures, addToExpenditures]);

  const handleToggleChange = (checked: boolean) => {
    if (checked) {
      // Turning ON - validate required fields
      if (!startDate || !premiumAmount || !premiumFrequency) {
        setValidationError("Please fill in Start Date, Premium Amount, and Premium Frequency before adding to expenses.");
        return;
      }
      setValidationError("");
      // Initialize expense name with family member's first name
      const memberName = familyMembers.find(m => m.id === policy.familyMemberId)?.name || "";
      const firstName = memberName.split(" ")[0];
      setExpenseName(firstName ? `${firstName}'s ${policyType} - ${provider}` : `${policyType} - ${provider}`);
      setConfirmAddModalOpen(true);
    } else {
      // Turning OFF - show delete confirmation
      setConfirmDeleteModalOpen(true);
    }
  };

  const confirmAddToExpenditures = () => {
    console.log("=== Confirming Add to Expenses ===");
    console.log("Before setAddToExpenditures, current value:", addToExpenditures);
    setAddToExpenditures(true);
    setConfirmAddModalOpen(false);
    console.log("Modal closed, addToExpenditures state update called");
  };

  const confirmRemoveFromExpenditures = () => {
    console.log("=== Confirming Remove from Expenses ===");
    console.log("Before setAddToExpenditures, current value:", addToExpenditures);
    setAddToExpenditures(false);
    setConfirmDeleteModalOpen(false);
    console.log("Modal closed, addToExpenditures state update called");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policy) return;

    // If policy data changed and expense is linked, show update confirmation
    if (policyDataChanged && initialAddToExpenditures && addToExpenditures) {
      // Initialize expense name with family member's first name
      const memberName = familyMembers.find(m => m.id === policy.familyMemberId)?.name || "";
      const firstName = memberName.split(" ")[0];
      setExpenseName(firstName ? `${firstName}'s ${policyType} - ${provider}` : `${policyType} - ${provider}`);
      setConfirmUpdateModalOpen(true);
      return;
    }

    await performUpdate();
  };

  const performUpdate = async () => {
    if (!policy) return;

    setIsLoading(true);

    console.log("=== Form Submission Debug ===");
    console.log("addToExpenditures:", addToExpenditures);
    console.log("expenseName:", expenseName);
    console.log("policyType:", policyType);
    console.log("provider:", provider);
    console.log("premiumAmount:", premiumAmount);
    console.log("premiumFrequency:", premiumFrequency);
    console.log("startDate:", startDate);

    try {
      const coverageOptions = {
        death: deathCoverage.enabled ? parseFloat(deathCoverage.amount) || 0 : 0,
        tpd: tpdCoverage.enabled ? parseFloat(tpdCoverage.amount) || 0 : 0,
        criticalIllness: criticalIllness.enabled ? parseFloat(criticalIllness.amount) || 0 : 0,
        earlyCriticalIllness: earlyCriticalIllness.enabled ? parseFloat(earlyCriticalIllness.amount) || 0 : 0,
        hospitalisationPlan: hospitalisationPlan.enabled ? parseFloat(hospitalisationPlan.amount) || 0 : 0,
      };

      // Update the policy
      await updatePolicy(policy.id, {
        familyMemberId: selectedFamilyMember || undefined,
        provider,
        policyNumber: policyNumber || undefined,
        policyType,
        status,
        startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        maturityDate: maturityDate ? format(maturityDate, "yyyy-MM-dd") : undefined,
        coverageUntilAge: coverageUntilAge ? parseInt(coverageUntilAge) : undefined,
        premiumAmount,
        premiumFrequency,
        totalPremiumDuration: totalPremiumDuration ? parseInt(totalPremiumDuration) : undefined,
        coverageOptions: JSON.stringify(coverageOptions),
      });

      console.log("Policy updated:", policy.id);

      // Handle expense linking changes
      if (!initialAddToExpenditures && addToExpenditures) {
        console.log("=== Creating Expense ===");
        console.log("Policy ID:", policy.id);
        console.log("Expense Name:", expenseName);
        // Create new expense
        const expense = await createExpenseFromPolicy({
          policyId: policy.id,
          name: expenseName,
          policyType,
          provider,
          premiumAmount: parseFloat(premiumAmount),
          premiumFrequency: policyFrequencyToExpenseFrequency(premiumFrequency),
          startDate: format(startDate!, "yyyy-MM-dd"),
          maturityDate: maturityDate ? format(maturityDate, "yyyy-MM-dd") : undefined,
        });

        console.log("Expense created:", expense?.id);

        await updatePolicy(policy.id, {
          linkedExpenseId: expense.id,
        });

        console.log("Policy updated with linkedExpenseId:", expense.id);
      } else if (initialAddToExpenditures && !addToExpenditures) {
        console.log("=== Deleting Linked Expense ===");
        console.log("Policy ID:", policy.id);
        console.log("Linked Expense ID:", policy.linkedExpenseId);
        // Delete linked expense
        await deleteLinkedExpense(policy.id);
        await updatePolicy(policy.id, {
          linkedExpenseId: null as any,
        });
        console.log("Expense deleted and policy updated");
      } else if (initialAddToExpenditures && addToExpenditures && policyDataChanged && policy.linkedExpenseId) {
        console.log("=== Updating Expense ===");
        console.log("Policy ID:", policy.id);
        console.log("Expense ID:", policy.linkedExpenseId);
        console.log("Expense Name:", expenseName);
        // Update existing expense
        await updateExpenseFromPolicy(policy.linkedExpenseId, {
          name: expenseName,
          policyType,
          provider,
          premiumAmount: parseFloat(premiumAmount),
          premiumFrequency: policyFrequencyToExpenseFrequency(premiumFrequency),
          startDate: format(startDate!, "yyyy-MM-dd"),
          maturityDate: maturityDate ? format(maturityDate, "yyyy-MM-dd") : undefined,
        });
        console.log("Expense updated:", policy.linkedExpenseId);
      } else {
        console.log("Skipping expense creation/update - addToExpenditures:", addToExpenditures, "initialAddToExpenditures:", initialAddToExpenditures, "policyDataChanged:", policyDataChanged);
      }

      setConfirmUpdateModalOpen(false);
      onOpenChange(false);
      onPolicyUpdated?.();
      router.refresh();
    } catch (error) {
      console.error("Failed to update policy:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!policy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Insurance Policy</DialogTitle>
          <DialogDescription>
            Update the details of your insurance policy
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Policy Holder */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Policy Holder</h3>
              <p className="text-xs text-gray-500 mt-1">Select which family member this policy covers</p>
            </div>
            <div>
                <Label htmlFor="familyMember">
                  Family Member <span className="text-red-500">*</span>
                  {memberAge !== null && (
                    <span className="ml-2 text-sm text-muted-foreground">Age: {memberAge}</span>
                  )}
                </Label>
                <Select value={selectedFamilyMember} onValueChange={setSelectedFamilyMember}>
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
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Policy Information</h3>
              <p className="text-xs text-gray-500 mt-1">Details about the insurance provider, policy type, and status</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="provider">
                  Insurance Provider <span className="text-red-500">*</span>
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
                <ProviderManagerPopover providers={providers} onProvidersChanged={loadProviders} />
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
                  Policy Type <span className="text-red-500">*</span>
                </Label>
                <Select value={policyType} onValueChange={setPolicyType} required>
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
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Policy Dates</h3>
              <p className="text-xs text-gray-500 mt-1">Start date, coverage duration, and maturity information</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="startDate">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MMMM do, yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        setStartDateOpen(false);
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
                <p className="text-xs text-muted-foreground mt-1">
                  Age when coverage ends
                </p>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="maturityDate">Maturity Date</Label>
                <Popover open={maturityDateOpen} onOpenChange={setMaturityDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !maturityDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {maturityDate ? format(maturityDate, "MMMM do, yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={maturityDate}
                      onSelect={(date) => {
                        setMaturityDate(date);
                        setMaturityDateOpen(false);
                      }}
                      initialFocus
                      fixedWeeks
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground mt-1">
                  Autopopulated based on age and coverage duration
                </p>
              </div>
            </div>
          </div>

          {/* Premium Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Premium Details</h3>
              <p className="text-xs text-gray-500 mt-1">Premium amount, payment frequency, and total duration</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="premiumAmount">
                  Premium Amount <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
                <Label htmlFor="premiumFrequency">
                  Premium Frequency <span className="text-red-500">*</span>
                </Label>
                <Select value={premiumFrequency} onValueChange={setPremiumFrequency} required>
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
                <p className="text-xs text-muted-foreground mt-1">
                  Total number of years to pay premiums
                </p>
              </div>
            </div>
          </div>

          {/* Coverage & Benefits */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Coverage & Benefits</h3>
              <p className="text-xs text-gray-500 mt-1">Optional coverage amounts for death, TPD, critical illness, and hospitalisation</p>
            </div>

              {/* Death Coverage */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Checkbox
                    id="death"
                    checked={deathCoverage.enabled}
                    onCheckedChange={(checked) =>
                      setDeathCoverage({ ...deathCoverage, enabled: checked as boolean })
                    }
                  />
                  <Label htmlFor="death" className="cursor-pointer font-normal">
                    Death
                  </Label>
                </div>
                <div className="w-48">
                  <Label className="text-xs text-muted-foreground">Sum Assured</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
                        setDeathCoverage({ ...deathCoverage, amount: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* TPD Coverage */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Checkbox
                    id="tpd"
                    checked={tpdCoverage.enabled}
                    onCheckedChange={(checked) =>
                      setTpdCoverage({ ...tpdCoverage, enabled: checked as boolean })
                    }
                  />
                  <Label htmlFor="tpd" className="cursor-pointer font-normal">
                    TPD
                  </Label>
                </div>
                <div className="w-48">
                  <Label className="text-xs text-muted-foreground">Sum Assured</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
                        setTpdCoverage({ ...tpdCoverage, amount: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Critical Illness */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Checkbox
                    id="criticalIllness"
                    checked={criticalIllness.enabled}
                    onCheckedChange={(checked) =>
                      setCriticalIllness({ ...criticalIllness, enabled: checked as boolean })
                    }
                  />
                  <Label htmlFor="criticalIllness" className="cursor-pointer font-normal">
                    Critical Illness
                  </Label>
                </div>
                <div className="w-48">
                  <Label className="text-xs text-muted-foreground">Sum Assured</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
                        setCriticalIllness({ ...criticalIllness, amount: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Early Critical Illness */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Checkbox
                    id="earlyCriticalIllness"
                    checked={earlyCriticalIllness.enabled}
                    onCheckedChange={(checked) =>
                      setEarlyCriticalIllness({
                        ...earlyCriticalIllness,
                        enabled: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="earlyCriticalIllness" className="cursor-pointer font-normal">
                    Early Critical Illness
                  </Label>
                </div>
                <div className="w-48">
                  <Label className="text-xs text-muted-foreground">Sum Assured</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
                          amount: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Hospitalisation Plan */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Checkbox
                    id="hospitalisationPlan"
                    checked={hospitalisationPlan.enabled}
                    onCheckedChange={(checked) =>
                      setHospitalisationPlan({
                        ...hospitalisationPlan,
                        enabled: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="hospitalisationPlan" className="cursor-pointer font-normal">
                    Hospitalisation Plan
                  </Label>
                </div>
                <div className="w-48">
                  <Label className="text-xs text-muted-foreground">Claimable Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
                          amount: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
          </div>

          {/* Actions */}
          {/* Add to Expenses Toggle */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="addToExpenditures" className="text-sm font-semibold text-gray-900">
                  Add to Expenses
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Automatically track this policy's premium in your expenses
                </p>
              </div>
              <Switch
                id="addToExpenditures"
                checked={addToExpenditures}
                onCheckedChange={handleToggleChange}
              />
            </div>
            {validationError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {validationError}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Add Confirmation Modal */}
      <AlertDialog open={confirmAddModalOpen} onOpenChange={setConfirmAddModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add to Expenses</AlertDialogTitle>
            <AlertDialogDescription>
              This will create an expense entry with the following details:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 my-4">
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
              <div className="text-gray-600">Policy Type & Provider:</div>
              <div className="font-medium">{policyType} - {provider}</div>

              <div className="text-gray-600">Premium Amount:</div>
              <div className="font-medium">${premiumAmount}</div>

              <div className="text-gray-600">Frequency:</div>
              <div className="font-medium">{premiumFrequency}</div>

              <div className="text-gray-600">Start Date:</div>
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
      <AlertDialog open={confirmUpdateModalOpen} onOpenChange={setConfirmUpdateModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Linked Expense</AlertDialogTitle>
            <AlertDialogDescription>
              You've made changes to the policy details. Do you want to update the linked expense as well?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 my-4">
            {/* Expense Name Input */}
            <div className="space-y-2">
              <Label htmlFor="expenseNameUpdate" className="text-sm font-medium">
                Expense Name
              </Label>
              <Input
                id="expenseNameUpdate"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                placeholder="Enter expense name"
                className="w-full"
              />
            </div>

            {/* Other Details */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-600">Policy Type & Provider:</div>
              <div className="font-medium">{policyType} - {provider}</div>

              <div className="text-gray-600">Premium Amount:</div>
              <div className="font-medium">${premiumAmount}</div>

              <div className="text-gray-600">Frequency:</div>
              <div className="font-medium">{premiumFrequency}</div>

              <div className="text-gray-600">Start Date:</div>
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
      <AlertDialog open={confirmDeleteModalOpen} onOpenChange={setConfirmDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Expenses</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the linked expense entry. Are you sure you want to remove this policy from expenses?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveFromExpenditures}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove from Expenses
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
