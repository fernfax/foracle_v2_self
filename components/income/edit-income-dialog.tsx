"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Info, ChevronLeft } from "lucide-react";
import { StepIndicator } from "@/components/ui/step-indicator";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { updateIncome } from "@/lib/actions/income";
import { getFamilyMembers } from "@/lib/actions/family-members";

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }

  return age;
}

interface Income {
  id: string;
  name: string;
  category: string;
  amount: string;
  frequency: string;
  customMonths: string | null;
  subjectToCpf: boolean | null;
  accountForBonus: boolean | null;
  bonusGroups: string | null;
  employeeCpfContribution: string | null;
  employerCpfContribution: string | null;
  netTakeHome: string | null;
  description: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean | null;
  familyMemberId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface EditIncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income: Income | null;
  onIncomeUpdated: (income: Income) => void;
  familyMember?: FamilyMember;
  pendingFormData?: any;
  onBack?: () => void;
  onCpfDetailsNeeded?: (incomeData: any) => void;
}

const CATEGORIES = [
  "Salary",
  "Freelance",
  "Business",
  "Investment",
  "Rental",
  "Dividend",
  "Other",
];

const FREQUENCIES = [
  { value: "monthly", label: "Monthly", description: "Recurring every month on the same day" },
  { value: "custom", label: "Custom", description: "Select specific months" },
  { value: "one-time", label: "One-time", description: "Single payment" },
];

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
  { value: 12, label: "Dec" },
];

export function EditIncomeDialog({ open, onOpenChange, income, onIncomeUpdated, familyMember, pendingFormData, onBack, onCpfDetailsNeeded }: EditIncomeDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [subjectToCpf, setSubjectToCpf] = useState(false);
  const [amount, setAmount] = useState("");
  const [accountForBonus, setAccountForBonus] = useState(false);
  const [bonusGroups, setBonusGroups] = useState<Array<{ month: number; amount: string }>>([]);
  const [frequency, setFrequency] = useState("monthly");
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incomeCategory, setIncomeCategory] = useState("current-recurring");
  const [futureIncomeChange, setFutureIncomeChange] = useState(false);
  const [futureIncomeAmount, setFutureIncomeAmount] = useState("");
  const [futureIncomeStartDate, setFutureIncomeStartDate] = useState<Date | undefined>(undefined);
  const [futureIncomeEndDate, setFutureIncomeEndDate] = useState<Date | undefined>(undefined);
  const [familyMemberAge, setFamilyMemberAge] = useState<number | undefined>(undefined);
  const [showFutureIncomeRemovalDialog, setShowFutureIncomeRemovalDialog] = useState(false);
  const [pendingFutureIncomeChange, setPendingFutureIncomeChange] = useState<boolean | null>(null);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [futureIncomeStartDateOpen, setFutureIncomeStartDateOpen] = useState(false);
  const [futureIncomeEndDateOpen, setFutureIncomeEndDateOpen] = useState(false);

  // Populate form when income changes
  useEffect(() => {
    if (income) {
      setName(income.name);
      setCategory(income.category);
      setSubjectToCpf(income.subjectToCpf || false);
      setAmount(income.amount);
      setAccountForBonus(income.accountForBonus || false);
      // Parse bonus groups if they exist
      if (income.bonusGroups) {
        try {
          setBonusGroups(typeof income.bonusGroups === 'string' ? JSON.parse(income.bonusGroups) : income.bonusGroups);
        } catch {
          setBonusGroups([]);
        }
      } else {
        setBonusGroups([]);
      }
      setFrequency(income.frequency);
      setStartDate(parse(income.startDate, "yyyy-MM-dd", new Date()));
      setEndDate(income.endDate ? parse(income.endDate, "yyyy-MM-dd", new Date()) : undefined);
      setNotes(income.description || "");
      setIncomeCategory(income.incomeCategory || "current-recurring");
      setFutureIncomeChange(income.futureIncomeChange || false);
      setFutureIncomeAmount(income.futureIncomeAmount || "");
      setFutureIncomeStartDate(income.futureIncomeStartDate ? parse(income.futureIncomeStartDate, "yyyy-MM-dd", new Date()) : undefined);
      setFutureIncomeEndDate(income.futureIncomeEndDate ? parse(income.futureIncomeEndDate, "yyyy-MM-dd", new Date()) : undefined);

      // Parse custom months if they exist
      if (income.customMonths) {
        try {
          setSelectedMonths(JSON.parse(income.customMonths));
        } catch {
          setSelectedMonths([]);
        }
      } else {
        setSelectedMonths([]);
      }

      // Fetch family member age if income is linked to a family member
      if (income.familyMemberId) {
        getFamilyMembers().then((members) => {
          const familyMember = members.find((m) => m.id === income.familyMemberId);
          if (familyMember?.dateOfBirth) {
            const age = calculateAge(new Date(familyMember.dateOfBirth));
            setFamilyMemberAge(age);
          }
        });
      } else {
        setFamilyMemberAge(undefined);
      }
    }
  }, [income]);

  // Clear Start and End Date when "Current Recurring Income" is selected
  useEffect(() => {
    if (incomeCategory === "current-recurring") {
      setStartDate(undefined);
      setEndDate(undefined);
    }
  }, [incomeCategory]);

  // Handle future income change checkbox with confirmation
  const handleFutureIncomeChangeToggle = (checked: boolean) => {
    // If unchecking and we have future income data with an end date set
    if (!checked && futureIncomeChange && futureIncomeStartDate && endDate) {
      setPendingFutureIncomeChange(false);
      setShowFutureIncomeRemovalDialog(true);
    } else {
      setFutureIncomeChange(checked);
      if (!checked) {
        // Clear future income fields immediately if no confirmation needed
        setFutureIncomeAmount("");
        setFutureIncomeStartDate(undefined);
        setFutureIncomeEndDate(undefined);
      }
    }
  };

  // Handle confirmation dialog actions
  const handleKeepEndDate = () => {
    setFutureIncomeChange(false);
    setFutureIncomeAmount("");
    setFutureIncomeStartDate(undefined);
    setFutureIncomeEndDate(undefined);
    setShowFutureIncomeRemovalDialog(false);
    setPendingFutureIncomeChange(null);
  };

  const handleMakeOngoing = () => {
    setFutureIncomeChange(false);
    setFutureIncomeAmount("");
    setFutureIncomeStartDate(undefined);
    setFutureIncomeEndDate(undefined);
    setEndDate(undefined); // Clear the end date
    setShowFutureIncomeRemovalDialog(false);
    setPendingFutureIncomeChange(null);
  };

  const handleCancelRemoval = () => {
    setShowFutureIncomeRemovalDialog(false);
    setPendingFutureIncomeChange(null);
  };

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month].sort((a, b) => a - b)
    );
  };

  const addBonusGroup = () => {
    setBonusGroups((prev) => [...prev, { month: 1, amount: "" }]);
  };

  const removeBonusGroup = (index: number) => {
    setBonusGroups((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBonusGroup = (index: number, field: "month" | "amount", value: number | string) => {
    setBonusGroups((prev) => {
      const updated = [...prev];
      if (field === "month") {
        updated[index].month = value as number;
      } else {
        updated[index].amount = value as string;
      }
      return updated;
    });
  };

  // Initialize bonus groups when checkbox is first checked
  useEffect(() => {
    if (accountForBonus && bonusGroups.length === 0) {
      setBonusGroups([{ month: 1, amount: "" }]);
    } else if (!accountForBonus) {
      setBonusGroups([]);
    }
  }, [accountForBonus]);

  const selectedFrequency = FREQUENCIES.find((f) => f.value === frequency);

  const handleSubmit = async () => {
    if (!income || !name || !category || !amount) {
      return;
    }

    // Start date is required for all categories except "Current Recurring Income"
    if (incomeCategory !== "current-recurring" && !startDate) {
      return;
    }

    // Validate custom frequency has months selected
    if (frequency === "custom" && selectedMonths.length === 0) {
      return;
    }

    // If family member exists, CPF is checked, and we have CPF handler, go to CPF details
    if (familyMember && subjectToCpf && onCpfDetailsNeeded) {
      const incomeData = {
        name,
        category,
        incomeCategory,
        amount: parseFloat(amount),
        frequency,
        customMonths: frequency === "custom" ? JSON.stringify(selectedMonths) : null,
        subjectToCpf,
        accountForBonus,
        bonusGroups: accountForBonus ? JSON.stringify(bonusGroups) : undefined,
        startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        endDate: endDate ? format(endDate, "yyyy-MM-dd") : null,
        futureIncomeChange,
        futureIncomeAmount: futureIncomeAmount ? parseFloat(futureIncomeAmount) : null,
        futureIncomeStartDate: futureIncomeStartDate ? format(futureIncomeStartDate, "yyyy-MM-dd") : null,
        futureIncomeEndDate: futureIncomeEndDate ? format(futureIncomeEndDate, "yyyy-MM-dd") : null,
        description: notes || undefined,
        familyMemberId: familyMember.id,
        familyMemberAge,
        incomeId: income.id, // Pass the income ID for updating
      };
      onCpfDetailsNeeded(incomeData);
      return;
    }

    // Otherwise, update income directly
    setIsSubmitting(true);
    try {
      const updatedIncome = await updateIncome(income.id, {
        name,
        category,
        incomeCategory,
        amount: parseFloat(amount),
        frequency,
        customMonths: frequency === "custom" ? JSON.stringify(selectedMonths) : null,
        subjectToCpf,
        accountForBonus,
        bonusGroups: accountForBonus ? JSON.stringify(bonusGroups) : undefined,
        startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        endDate: endDate ? format(endDate, "yyyy-MM-dd") : null,
        futureIncomeChange,
        futureIncomeAmount: futureIncomeAmount ? parseFloat(futureIncomeAmount) : null,
        futureIncomeStartDate: futureIncomeStartDate ? format(futureIncomeStartDate, "yyyy-MM-dd") : null,
        futureIncomeEndDate: futureIncomeEndDate ? format(futureIncomeEndDate, "yyyy-MM-dd") : null,
        description: notes || undefined,
        familyMemberAge,
      });

      onIncomeUpdated(updatedIncome);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update income:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Income
            <Info className="h-4 w-4 text-muted-foreground" />
          </DialogTitle>
          <DialogDescription>Update the income source details.</DialogDescription>
        </DialogHeader>

        {/* Income Type Selector */}
        <div className="space-y-2">
          <Label htmlFor="edit-income-type">Income Type</Label>
          <Select value={incomeCategory} onValueChange={setIncomeCategory}>
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-recurring">Recurring Income</SelectItem>
              <SelectItem value="one-off">One-off Income</SelectItem>
            </SelectContent>
          </Select>
          {incomeCategory === "current-recurring" && (
            <p className="text-xs text-muted-foreground">Income that repeats regularly (e.g., monthly salary)</p>
          )}
          {incomeCategory === "one-off" && (
            <p className="text-xs text-muted-foreground">One-time income that does not repeat (e.g., tax refund, gift)</p>
          )}
        </div>

        <div className="space-y-6 py-4">
          {/* Group 1: Basic Income Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Basic Income Details</h3>
              <p className="text-xs text-gray-500 mt-1">Core information about the income source including amount, frequency, and CPF status</p>
            </div>
          {/* Row 1: Name and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                Income Source Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                placeholder="e.g., Monthly Salary"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">
                Income Category <span className="text-red-500">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Amount and Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">
                Income Amount <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="edit-amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  className="bg-white pl-7"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-frequency">
                Income Frequency <span className="text-red-500">*</span>
              </Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFrequency && (
                <p className="text-xs text-muted-foreground">{selectedFrequency.description}</p>
              )}
            </div>
          </div>

          {/* Custom Month Selector */}
          {frequency === "custom" && (
            <div className="space-y-2">
              <Label>
                Select Months <span className="text-red-500">*</span>
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
                        ? "bg-black text-white hover:bg-black/90 border-black"
                        : "bg-white hover:bg-gray-50"
                    )}
                  >
                    {month.label}
                  </Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Selected: {selectedMonths.length > 0
                  ? selectedMonths.map((m) => {
                      const monthName = ["January", "February", "March", "April", "May", "June",
                                         "July", "August", "September", "October", "November", "December"][m - 1];
                      return monthName;
                    }).join(", ")
                  : "None"}
              </p>
            </div>
          )}

            {/* Start Date and End Date - Shown for One-off Income */}
            {incomeCategory !== "current-recurring" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
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
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "MMMM do, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date);
                          setEndDateOpen(false);
                        }}
                        initialFocus
                        fixedWeeks
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">Leave empty for ongoing income</p>
                </div>
              </div>
            )}

            {/* CPF Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-cpf"
                checked={subjectToCpf}
                onCheckedChange={(checked) => setSubjectToCpf(checked as boolean)}
              />
              <Label htmlFor="edit-cpf" className="text-sm font-medium leading-none">
                Subject to CPF Deductions <span className="text-red-500">*</span>
              </Label>
            </div>
          </div>

          {/* Group 2: Bonus Configuration */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Income Bonus Details</h3>
              <p className="text-xs text-gray-500 mt-1">Set up bonus payments for specific months (e.g., 13th month bonus in December)</p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-account-for-bonus"
                checked={accountForBonus}
                onCheckedChange={(checked) => setAccountForBonus(checked as boolean)}
              />
              <Label htmlFor="edit-account-for-bonus" className="text-sm font-medium leading-none cursor-pointer">
                Account for Bonus
              </Label>
            </div>

            {/* Bonus Groups - Shown when Account for Bonus is checked */}
            {accountForBonus && (
              <div className="space-y-3">
                {/* Labels - shown once at the top */}
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Bonus Month</Label>
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Bonus (No. of Months)</Label>
                  </div>
                  <div className="w-[66px]"></div>
                </div>

                {bonusGroups.map((group, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    {/* Bonus Month */}
                    <Select
                      value={group.month.toString()}
                      onValueChange={(value) => updateBonusGroup(index, "month", parseInt(value))}
                    >
                      <SelectTrigger className="bg-white flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month) => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Bonus (No. of Months) */}
                    <Input
                      id={`edit-bonus-amount-${index}`}
                      type="number"
                      placeholder="e.g., 1.5"
                      value={group.amount}
                      onChange={(e) => updateBonusGroup(index, "amount", e.target.value)}
                      min="0"
                      step="0.1"
                      className="bg-white flex-1"
                    />
                    {/* Remove Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBonusGroup(index)}
                      disabled={index === 0 && bonusGroups.length === 1}
                      className="h-10 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBonusGroup}
                  className="w-full"
                >
                  + Add Bonus
                </Button>

                {/* Bonus Summary */}
                {bonusGroups.length > 0 && amount && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>
                        <span className="font-medium">Total Bonus Months:</span>{" "}
                        <span className="font-bold">{bonusGroups.reduce((sum, group) => sum + (parseFloat(group.amount) || 0), 0).toFixed(2)} months</span>
                      </div>
                      <div>
                        <span className="font-medium">Total Bonus Gross:</span>{" "}
                        <span className="font-bold">${(bonusGroups.reduce((sum, group) => sum + (parseFloat(group.amount) || 0), 0) * parseFloat(amount)).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Group 3: Future Income Changes */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Future Income Changes</h3>
              <p className="text-xs text-gray-500 mt-1">Plan for expected income changes like salary increments or temporary adjustments</p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-future-income-change"
                checked={futureIncomeChange}
                onCheckedChange={(checked) => handleFutureIncomeChangeToggle(checked as boolean)}
              />
              <Label htmlFor="edit-future-income-change" className="text-sm font-medium leading-none cursor-pointer">
                Account for Future Income Change
              </Label>
            </div>

            {/* Future Income Fields - Shown when Future Income Change is checked */}
            {futureIncomeChange && (
              <div className="space-y-4">
                {/* Future Income Amount */}
                <div className="space-y-2">
                  <Label htmlFor="edit-future-income-amount">Future Income Amount</Label>
                  <Input
                    id="edit-future-income-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={futureIncomeAmount}
                    onChange={(e) => setFutureIncomeAmount(e.target.value)}
                  />
                </div>

                {/* Future Income Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Future Income Start Date</Label>
                  <Popover open={futureIncomeStartDateOpen} onOpenChange={setFutureIncomeStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !futureIncomeStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {futureIncomeStartDate ? format(futureIncomeStartDate, "MMMM do, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={futureIncomeStartDate}
                        onSelect={(date) => {
                          setFutureIncomeStartDate(date);
                          setFutureIncomeStartDateOpen(false);
                        }}
                        initialFocus
                        fixedWeeks
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Future Income End Date</Label>
                  <Popover open={futureIncomeEndDateOpen} onOpenChange={setFutureIncomeEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !futureIncomeEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {futureIncomeEndDate ? format(futureIncomeEndDate, "MMMM do, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={futureIncomeEndDate}
                        onSelect={(date) => {
                          setFutureIncomeEndDate(date);
                          setFutureIncomeEndDateOpen(false);
                        }}
                        initialFocus
                        fixedWeeks
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">Optional</p>
                </div>
              </div>
              </div>
            )}
          </div>

          {/* Group 4: Additional Information */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Additional Information</h3>
              <p className="text-xs text-gray-500 mt-1">Optional notes and details about this income source</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Payment Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="e.g., Includes Q4 bonus, prorated for mid-month start..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="bg-white"
              />
              <p className="text-xs text-muted-foreground">Add any notes about this payment period</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="space-y-4">
          {familyMember && subjectToCpf && onCpfDetailsNeeded && (
            <StepIndicator currentStep={2} totalSteps={3} />
          )}
          <div className="flex justify-between gap-3">
            {familyMember && onBack ? (
              <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            ) : (
              <div></div>
            )}
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !name ||
                  !category ||
                  !amount ||
                  (incomeCategory !== "current-recurring" && !startDate) ||
                  (frequency === "custom" && selectedMonths.length === 0) ||
                  isSubmitting
                }
              >
                {isSubmitting ? "Saving..." : (familyMember && subjectToCpf && onCpfDetailsNeeded ? "Next" : "Save Changes")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showFutureIncomeRemovalDialog} onOpenChange={setShowFutureIncomeRemovalDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Future Income Change?</AlertDialogTitle>
          <AlertDialogDescription>
            The current income has an end date set based on the future income start date. Do you want to remove this end date and make the income ongoing?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelRemoval}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleKeepEndDate} className="bg-gray-600 hover:bg-gray-700">
            Keep End Date
          </AlertDialogAction>
          <AlertDialogAction onClick={handleMakeOngoing}>Make Ongoing</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
