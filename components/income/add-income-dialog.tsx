"use client";

import React, { useState, useRef } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Info, ChevronLeft } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { cn } from "@/lib/utils";
import { createIncome, updateIncome } from "@/lib/actions/income";
import { StepIndicator } from "@/components/ui/step-indicator";
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

interface FamilyMember {
  id: string;
  name: string;
  relationship: string | null;
  dateOfBirth: string | null;
  isContributing: boolean | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Income {
  id: string;
  name: string;
  category: string;
  amount: string;
  frequency: string;
  subjectToCpf: boolean | null;
  bonusAmount: string | null;
  employeeCpfContribution: string | null;
  employerCpfContribution: string | null;
  netTakeHome: string | null;
  cpfOrdinaryAccount: string | null;
  cpfSpecialAccount: string | null;
  cpfMedisaveAccount: string | null;
  description: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AddIncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIncomeAdded: (income: Income) => void;
  familyMember?: FamilyMember;
  income?: Income;
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
  { value: "weekly", label: "Weekly", description: "Recurring every week on the same day" },
  { value: "bi-weekly", label: "Bi-weekly", description: "Recurring every two weeks" },
  { value: "yearly", label: "Yearly", description: "Recurring once a year" },
  { value: "one-time", label: "One-time", description: "Single payment" },
];

export function AddIncomeDialog({ open, onOpenChange, onIncomeAdded, familyMember, income, pendingFormData, onBack, onCpfDetailsNeeded }: AddIncomeDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [subjectToCpf, setSubjectToCpf] = useState(false);
  const [amount, setAmount] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialValues, setInitialValues] = useState<any>(null);

  // Pre-fill income name when family member is provided (on mount only)
  React.useEffect(() => {
    if (familyMember && open && !name && !income) {
      setName(`${familyMember.name}'s Salary`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyMember, open]);

  // Pre-populate all fields when editing existing income or restoring pending form data
  React.useEffect(() => {
    if (open) {
      let values: any;
      // Priority 1: Pending form data (from back navigation)
      if (pendingFormData) {
        values = pendingFormData;
        setName(pendingFormData.name || "");
        setCategory(pendingFormData.category || "");
        setAmount(pendingFormData.amount?.toString() || "");
        setFrequency(pendingFormData.frequency || "monthly");
        setSubjectToCpf(pendingFormData.subjectToCpf || false);
        setBonusAmount(pendingFormData.bonusAmount?.toString() || "");
        setStartDate(pendingFormData.startDate ? new Date(pendingFormData.startDate) : new Date());
        setEndDate(pendingFormData.endDate ? new Date(pendingFormData.endDate) : undefined);
        setNotes(pendingFormData.description || "");
      }
      // Priority 2: Existing income (editing mode)
      else if (income) {
        values = income;
        setName(income.name);
        setCategory(income.category);
        setAmount(income.amount);
        setFrequency(income.frequency);
        setSubjectToCpf(income.subjectToCpf || false);
        setBonusAmount(income.bonusAmount || "");
        setStartDate(income.startDate ? new Date(income.startDate) : new Date());
        setEndDate(income.endDate ? new Date(income.endDate) : undefined);
        setNotes(income.description || "");
      }
      // Priority 3: Reset form for new income
      else {
        values = null;
        resetForm();
      }
      setInitialValues(values);
      setHasUnsavedChanges(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [income, pendingFormData, open]);

  // Track changes to detect unsaved modifications
  React.useEffect(() => {
    if (!initialValues || !open) {
      setHasUnsavedChanges(false);
      return;
    }

    const hasChanges =
      name !== (initialValues.name || "") ||
      category !== (initialValues.category || "") ||
      amount !== (initialValues.amount?.toString() || "") ||
      frequency !== (initialValues.frequency || "monthly") ||
      subjectToCpf !== (initialValues.subjectToCpf || false) ||
      bonusAmount !== (initialValues.bonusAmount?.toString() || "") ||
      notes !== (initialValues.description || "");

    setHasUnsavedChanges(hasChanges);
  }, [initialValues, name, category, amount, frequency, subjectToCpf, bonusAmount, notes, open]);

  const selectedFrequency = FREQUENCIES.find((f) => f.value === frequency);

  // Calculate family member's age if provided
  const familyMemberAge = familyMember?.dateOfBirth
    ? differenceInYears(new Date(), new Date(familyMember.dateOfBirth))
    : undefined;

  const resetForm = () => {
    setName("");
    setCategory("");
    setSubjectToCpf(false);
    setAmount("");
    setBonusAmount("");
    setFrequency("monthly");
    setStartDate(new Date());
    setEndDate(undefined);
    setNotes("");
  };

  const handleClose = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onOpenChange(open);
    }
  };

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false);
    setHasUnsavedChanges(false);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!name || !category || !amount || !startDate) {
      return;
    }

    // If family member exists, CPF is checked, and we have CPF handler, collect data first
    if (familyMember && subjectToCpf && onCpfDetailsNeeded) {
      const incomeData = {
        name,
        category,
        amount: parseFloat(amount),
        frequency,
        subjectToCpf,
        bonusAmount: bonusAmount ? parseFloat(bonusAmount) : undefined,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
        description: notes || undefined,
        familyMemberId: familyMember.id,
        familyMemberAge,
      };
      setHasUnsavedChanges(false);
      onCpfDetailsNeeded(incomeData);
      return;
    }

    // Otherwise, create or update income directly
    setIsSubmitting(true);
    try {
      let resultIncome;

      if (income && income.id) {
        // Edit mode - update existing income
        resultIncome = await updateIncome(income.id, {
          name,
          category,
          amount: parseFloat(amount),
          frequency,
          subjectToCpf,
          bonusAmount: bonusAmount ? parseFloat(bonusAmount) : undefined,
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
          description: notes || undefined,
        });
      } else {
        // Create mode - create new income
        resultIncome = await createIncome({
          name,
          category,
          amount: parseFloat(amount),
          frequency,
          subjectToCpf,
          bonusAmount: bonusAmount ? parseFloat(bonusAmount) : undefined,
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
          description: notes || undefined,
          familyMemberId: familyMember?.id,
          familyMemberAge,
        });
      }

      onIncomeAdded(resultIncome);
      resetForm();
      setHasUnsavedChanges(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save income:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" ref={containerRef}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {familyMember ? `Add Income for ${familyMember.name}` : "Add New Income"}
            <Info className="h-4 w-4 text-muted-foreground" />
          </DialogTitle>
          <DialogDescription asChild>
            {familyMember ? (
              <div className="space-y-1">
                <div>Add income details for {familyMember.name}. {familyMemberAge !== undefined ? `Age: ${familyMemberAge} years old.` : ""}</div>
                <div className="text-blue-600 font-medium text-sm">🔗 This income will be linked to {familyMember.name}</div>
              </div>
            ) : (
              <div>Fill in the form to add a new income source.</div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Row 1: Name and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Income Source Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Monthly Salary"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-red-500">*</span>
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

          {/* Row 2: CPF Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cpf"
              checked={subjectToCpf}
              onCheckedChange={(checked) => setSubjectToCpf(checked as boolean)}
            />
            <Label htmlFor="cpf" className="text-sm font-medium leading-none">
              Subject to CPF Deductions <span className="text-red-500">*</span>
            </Label>
          </div>

          {/* Row 2.5: Annual Bonus (only shown when subject to CPF) */}
          {subjectToCpf && (
            <div className="space-y-2">
              <Label htmlFor="bonus">Annual Bonus (SGD)</Label>
              <Input
                id="bonus"
                type="number"
                placeholder="0"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
                min="0"
                step="0.01"
                className="bg-white"
              />
              <p className="text-xs text-muted-foreground">
                Enter your annual bonus amount (will be used for CPF calculations)
              </p>
            </div>
          )}

          {/* Row 3: Amount and Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount (SGD) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">
                Payment Frequency <span className="text-red-500">*</span>
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

          {/* Row 4: Start Date and End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Popover>
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
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus fixedWeeks />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
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
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus fixedWeeks />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Leave empty for ongoing income</p>
            </div>
          </div>

          {/* Row 5: Payment Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Payment Notes</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Includes Q4 bonus, prorated for mid-month start..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="bg-white"
            />
            <p className="text-xs text-muted-foreground">Add any notes about this payment period</p>
          </div>
        </div>

        {/* Footer */}
        <div className="space-y-4">
          {familyMember && <StepIndicator currentStep={2} totalSteps={3} />}
          <div className="flex justify-between gap-3">
            {familyMember && onBack ? (
              <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => handleClose(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!name || !category || !amount || !startDate || isSubmitting}
              >
                {isSubmitting ? "Saving..." : (familyMember && subjectToCpf ? "Next" : (income ? "Update Income" : "Create Income"))}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to close? All your changes will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continue Editing</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmClose}>Discard Changes</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
