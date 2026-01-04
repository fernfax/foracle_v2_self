"use client";

import React, { useState, useEffect, useRef } from "react";

// Safe JSON parse helper that handles corrupted data
function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  if (typeof value !== 'string') return value as T;
  if (value.startsWith('[object')) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogBody,
  DialogFooterSticky,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, ChevronLeft, History, DollarSign, TrendingUp } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { createIncome, updateIncome } from "@/lib/actions/income";
import { StepIndicator } from "@/components/ui/step-indicator";
import { PresentIncomeTab } from "./present-income-tab";
import { PastIncomeTab } from "./past-income-tab";
import { FutureMilestonesTab } from "./future-milestones-tab";
import {
  Income,
  FamilyMember,
  PastIncomeEntry,
  FutureMilestone,
  BonusGroup,
  TabValue,
} from "./types";

interface IncomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIncomeAdded: (income: Income) => void;
  familyMember?: FamilyMember;
  income?: Income | null;
  pendingFormData?: any;
  onBack?: () => void;
  onCpfDetailsNeeded?: (incomeData: any) => void;
  mode?: "add" | "edit";
}

export function IncomeModal({
  open,
  onOpenChange,
  onIncomeAdded,
  familyMember,
  income,
  pendingFormData,
  onBack,
  onCpfDetailsNeeded,
  mode = "add",
}: IncomeModalProps) {
  // Tab state - always default to "present"
  const [activeTab, setActiveTab] = useState<TabValue>("present");

  // Present tab state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [incomeCategory, setIncomeCategory] = useState("current-recurring");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [subjectToCpf, setSubjectToCpf] = useState(false);
  const [accountForBonus, setAccountForBonus] = useState(false);
  const [bonusGroups, setBonusGroups] = useState<BonusGroup[]>([]);
  const [notes, setNotes] = useState("");

  // Past tab state
  const [pastIncomeHistory, setPastIncomeHistory] = useState<PastIncomeEntry[]>([]);

  // Future tab state
  const [futureMilestones, setFutureMilestones] = useState<FutureMilestone[]>([]);
  const [accountForFutureChange, setAccountForFutureChange] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialValues, setInitialValues] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate family member's age if provided
  const familyMemberAge = familyMember?.dateOfBirth
    ? differenceInYears(new Date(), new Date(familyMember.dateOfBirth))
    : undefined;

  // Reset form
  const resetForm = () => {
    setName("");
    setCategory("");
    setAmount("");
    setFrequency("monthly");
    setSelectedMonths([]);
    setIncomeCategory("current-recurring");
    setStartDate(undefined);
    setEndDate(undefined);
    setSubjectToCpf(false);
    setAccountForBonus(false);
    setBonusGroups([]);
    setNotes("");
    setPastIncomeHistory([]);
    setFutureMilestones([]);
    setAccountForFutureChange(false);
    setActiveTab("present");
  };

  // Pre-fill income name when family member is provided (on mount only)
  useEffect(() => {
    if (familyMember && open && !name && !income) {
      setName(`${familyMember.name}'s Salary`);
    }
  }, [familyMember, open, name, income]);

  // Pre-populate all fields when editing existing income or restoring pending form data
  useEffect(() => {
    if (open) {
      let values: any;

      // Priority 1: Pending form data (from back navigation)
      if (pendingFormData) {
        values = pendingFormData;
        setName(pendingFormData.name || "");
        setCategory(pendingFormData.category || "");
        setAmount(pendingFormData.amount?.toString() || "");
        setFrequency(pendingFormData.frequency || "monthly");
        setSelectedMonths(safeJsonParse(pendingFormData.customMonths, []));
        setIncomeCategory(pendingFormData.incomeCategory || "current-recurring");
        setSubjectToCpf(pendingFormData.subjectToCpf || false);
        setAccountForBonus(pendingFormData.accountForBonus || false);
        setBonusGroups(pendingFormData.bonusGroups || []);
        setStartDate(pendingFormData.startDate ? new Date(pendingFormData.startDate) : undefined);
        setEndDate(pendingFormData.endDate ? new Date(pendingFormData.endDate) : undefined);
        setNotes(pendingFormData.description || "");
        setPastIncomeHistory(pendingFormData.pastIncomeHistory || []);
        setFutureMilestones(pendingFormData.futureMilestones || []);
        setAccountForFutureChange(pendingFormData.accountForFutureChange || false);
      }
      // Priority 2: Existing income (editing mode)
      else if (income) {
        values = income;
        setName(income.name);
        setCategory(income.category);
        setAmount(income.amount);
        setFrequency(income.frequency);
        setSelectedMonths(safeJsonParse(income.customMonths, []));
        setIncomeCategory(income.incomeCategory || "current-recurring");
        setSubjectToCpf(income.subjectToCpf || false);
        setAccountForBonus(income.accountForBonus || false);
        setBonusGroups(safeJsonParse(income.bonusGroups, []));
        setStartDate(income.startDate ? new Date(income.startDate) : undefined);
        setEndDate(income.endDate ? new Date(income.endDate) : undefined);
        setNotes(income.description || "");
        setPastIncomeHistory(safeJsonParse(income.pastIncomeHistory, []));
        setFutureMilestones(safeJsonParse(income.futureMilestones, []));
        setAccountForFutureChange(income.accountForFutureChange || false);
      }
      // Priority 3: Reset form for new income
      else {
        values = null;
        resetForm();
      }
      setInitialValues(values);
      setHasUnsavedChanges(false);
      setActiveTab("present"); // Always start on Present tab
    }
  }, [income, pendingFormData, open]);

  // Track changes to detect unsaved modifications
  useEffect(() => {
    if (!open) {
      setHasUnsavedChanges(false);
      return;
    }

    const hasChanges =
      name !== (initialValues?.name || "") ||
      category !== (initialValues?.category || "") ||
      amount !== (initialValues?.amount?.toString() || "") ||
      frequency !== (initialValues?.frequency || "monthly") ||
      subjectToCpf !== (initialValues?.subjectToCpf || false) ||
      accountForBonus !== (initialValues?.accountForBonus || false) ||
      JSON.stringify(bonusGroups) !== JSON.stringify(initialValues?.bonusGroups || []) ||
      notes !== (initialValues?.description || "") ||
      pastIncomeHistory.length > 0 ||
      futureMilestones.length > 0;

    setHasUnsavedChanges(hasChanges);
  }, [
    initialValues,
    name,
    category,
    amount,
    frequency,
    subjectToCpf,
    accountForBonus,
    bonusGroups,
    notes,
    open,
    pastIncomeHistory,
    futureMilestones,
  ]);

  const handleClose = (openState: boolean) => {
    if (!openState && hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onOpenChange(openState);
    }
  };

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false);
    setHasUnsavedChanges(false);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!name || !category || !amount) {
      return;
    }

    // Validate custom frequency has months selected
    if (frequency === "custom" && selectedMonths.length === 0) {
      return;
    }

    // Start date is required for all categories except "Current Recurring Income"
    if (incomeCategory !== "current-recurring" && !startDate) {
      return;
    }

    // If family member exists, CPF is checked, and we have CPF handler, collect data first
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
        bonusGroups: accountForBonus ? bonusGroups : [],
        startDate: startDate ? format(startDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
        description: notes || undefined,
        familyMemberId: familyMember.id,
        familyMemberAge,
        pastIncomeHistory,
        futureMilestones,
        accountForFutureChange,
      };
      setHasUnsavedChanges(false);
      onCpfDetailsNeeded(incomeData);
      return;
    }

    // Otherwise, create or update income directly
    setIsSubmitting(true);
    try {
      let resultIncome;

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
        startDate: startDate ? format(startDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
        description: notes || undefined,
        familyMemberId: familyMember?.id,
        familyMemberAge,
        pastIncomeHistory: pastIncomeHistory.length > 0 ? JSON.stringify(pastIncomeHistory) : null,
        futureMilestones: futureMilestones.length > 0 ? JSON.stringify(futureMilestones) : null,
        accountForFutureChange,
      };

      if (income && income.id) {
        // Edit mode - update existing income
        resultIncome = await updateIncome(income.id, incomeData);
      } else {
        // Create mode - create new income
        resultIncome = await createIncome(incomeData);
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

  const isFormValid = () => {
    if (!name || !category || !amount) return false;
    if (frequency === "custom" && selectedMonths.length === 0) return false;
    if (incomeCategory !== "current-recurring" && !startDate) return false;
    return true;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh]" ref={containerRef}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {income ? "Edit Income" : familyMember ? `Add Income for ${familyMember.name}` : "Add New Income"}
              <Info className="h-4 w-4 text-muted-foreground" />
            </DialogTitle>
            <DialogDescription asChild>
              {familyMember ? (
                <div className="space-y-1">
                  <div>
                    Add income details for {familyMember.name}.{" "}
                    {familyMemberAge !== undefined ? `Age: ${familyMemberAge} years old.` : ""}
                  </div>
                  <div className="text-blue-600 font-medium text-sm">
                    This income will be linked to {familyMember.name}
                  </div>
                </div>
              ) : (
                <div>Fill in the form to {income ? "update" : "add"} an income source.</div>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
            <TabsList className="w-full h-auto p-0 bg-transparent border-b border-gray-200 rounded-none grid grid-cols-3">
              <TabsTrigger
                value="past"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-none bg-transparent border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none text-gray-500 hover:text-gray-700 transition-colors"
              >
                <History className="h-4 w-4" />
                Past
              </TabsTrigger>
              <TabsTrigger
                value="present"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-none bg-transparent border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none text-gray-500 hover:text-gray-700 transition-colors"
              >
                <DollarSign className="h-4 w-4" />
                Present
              </TabsTrigger>
              <TabsTrigger
                value="future"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-none bg-transparent border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none text-gray-500 hover:text-gray-700 transition-colors"
              >
                <TrendingUp className="h-4 w-4" />
                Future
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <TabsContent value="past" className="mt-0">
                <PastIncomeTab
                  pastIncomeHistory={pastIncomeHistory}
                  setPastIncomeHistory={setPastIncomeHistory}
                />
              </TabsContent>

              <TabsContent value="present" className="mt-0">
                <PresentIncomeTab
                  name={name}
                  setName={setName}
                  category={category}
                  setCategory={setCategory}
                  amount={amount}
                  setAmount={setAmount}
                  frequency={frequency}
                  setFrequency={setFrequency}
                  selectedMonths={selectedMonths}
                  setSelectedMonths={setSelectedMonths}
                  incomeCategory={incomeCategory}
                  setIncomeCategory={setIncomeCategory}
                  startDate={startDate}
                  setStartDate={setStartDate}
                  endDate={endDate}
                  setEndDate={setEndDate}
                  subjectToCpf={subjectToCpf}
                  setSubjectToCpf={setSubjectToCpf}
                  accountForBonus={accountForBonus}
                  setAccountForBonus={setAccountForBonus}
                  bonusGroups={bonusGroups}
                  setBonusGroups={setBonusGroups}
                  notes={notes}
                  setNotes={setNotes}
                  familyMemberAge={familyMemberAge}
                />
              </TabsContent>

              <TabsContent value="future" className="mt-0">
                <FutureMilestonesTab
                  futureMilestones={futureMilestones}
                  setFutureMilestones={setFutureMilestones}
                  currentAmount={amount}
                  accountForFutureChange={accountForFutureChange}
                  setAccountForFutureChange={setAccountForFutureChange}
                />
              </TabsContent>
            </div>
          </Tabs>
          </DialogBody>

          {/* Footer */}
          <DialogFooterSticky className="flex-col gap-4">
            {familyMember && <StepIndicator currentStep={2} totalSteps={3} />}
            <div className="flex justify-between gap-3 w-full">
              {familyMember && onBack ? (
                <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => handleClose(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!isFormValid() || isSubmitting}>
                  {isSubmitting
                    ? "Saving..."
                    : familyMember && subjectToCpf
                      ? "Next"
                      : income
                        ? "Update Income"
                        : "Create Income"}
                </Button>
              </div>
            </div>
          </DialogFooterSticky>
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

// Re-export for convenience
export { PresentIncomeTab } from "./present-income-tab";
export { PastIncomeTab } from "./past-income-tab";
export { FutureMilestonesTab } from "./future-milestones-tab";
export * from "./types";
