"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, differenceInMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { createGoal, updateGoal } from "@/lib/actions/goals";

interface Goal {
  id: string;
  userId: string;
  linkedExpenseId: string | null;
  goalName: string;
  goalType: string;
  targetAmount: string;
  targetDate: string;
  currentAmountSaved: string | null;
  monthlyContribution: string | null;
  description: string | null;
  isAchieved: boolean | null;
  isActive: boolean | null;
}

interface AddGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
  onSuccess?: () => void;
}

export function AddGoalDialog({
  open,
  onOpenChange,
  goal,
  onSuccess,
}: AddGoalDialogProps) {
  // Basic Details
  const [goalName, setGoalName] = useState(goal?.goalName || "");
  const [goalType, setGoalType] = useState<"primary" | "secondary">(
    (goal?.goalType as "primary" | "secondary") || "primary"
  );
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount || "");
  const [targetDate, setTargetDate] = useState<Date | undefined>(
    goal?.targetDate ? new Date(goal.targetDate) : undefined
  );
  const [targetDateOpen, setTargetDateOpen] = useState(false);

  // Progress Tracking
  const [currentAmountSaved, setCurrentAmountSaved] = useState(
    goal?.currentAmountSaved || ""
  );
  const [monthlyContribution, setMonthlyContribution] = useState(
    goal?.monthlyContribution || ""
  );
  const [description, setDescription] = useState(goal?.description || "");

  // Expenditure Integration
  const [addToExpenditures, setAddToExpenditures] = useState(
    !!goal?.linkedExpenseId
  );
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [validationError, setValidationError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculated fields
  const monthsUntilTarget = useMemo(() => {
    if (!targetDate) return 0;
    return Math.max(0, differenceInMonths(targetDate, new Date()));
  }, [targetDate]);

  const suggestedMonthlyContribution = useMemo(() => {
    const target = parseFloat(targetAmount) || 0;
    const current = parseFloat(currentAmountSaved) || 0;
    const remaining = target - current;
    if (monthsUntilTarget <= 0 || remaining <= 0) return 0;
    return remaining / monthsUntilTarget;
  }, [targetAmount, currentAmountSaved, monthsUntilTarget]);

  const projectedCompletion = useMemo(() => {
    const target = parseFloat(targetAmount) || 0;
    const current = parseFloat(currentAmountSaved) || 0;
    const monthly = parseFloat(monthlyContribution) || 0;
    const remaining = target - current;
    if (monthly <= 0 || remaining <= 0) return null;
    const monthsNeeded = Math.ceil(remaining / monthly);
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + monthsNeeded);
    return completionDate;
  }, [targetAmount, currentAmountSaved, monthlyContribution]);

  const resetForm = () => {
    setGoalName("");
    setGoalType("primary");
    setTargetAmount("");
    setTargetDate(undefined);
    setCurrentAmountSaved("");
    setMonthlyContribution("");
    setDescription("");
    setAddToExpenditures(false);
    setConfirmationModalOpen(false);
    setExpenseName("");
    setValidationError("");
  };

  // Handle toggle change with validation
  const handleToggleChange = (checked: boolean) => {
    if (checked) {
      // Validate required fields before allowing toggle
      if (!monthlyContribution || parseFloat(monthlyContribution) <= 0) {
        setValidationError(
          "Please set a monthly contribution amount before adding to expenses."
        );
        return;
      }
      setValidationError("");
      // Generate default expense name
      setExpenseName(
        goalName ? `${goalName} - Monthly Savings` : "Goal Savings"
      );
      setConfirmationModalOpen(true);
    } else {
      setAddToExpenditures(false);
      setExpenseName("");
    }
  };

  // Confirm adding to expenditures
  const handleConfirmAddToExpenditures = () => {
    setAddToExpenditures(true);
    setConfirmationModalOpen(false);
  };

  // Cancel adding to expenditures
  const handleCancelAddToExpenditures = () => {
    setConfirmationModalOpen(false);
    setExpenseName("");
  };

  // Update form fields when goal prop changes (for edit mode)
  useEffect(() => {
    if (goal) {
      setGoalName(goal.goalName);
      setGoalType((goal.goalType as "primary" | "secondary") || "primary");
      setTargetAmount(goal.targetAmount);
      setTargetDate(new Date(goal.targetDate));
      setCurrentAmountSaved(goal.currentAmountSaved || "");
      setMonthlyContribution(goal.monthlyContribution || "");
      setDescription(goal.description || "");
      setAddToExpenditures(!!goal.linkedExpenseId);
    }
  }, [goal]);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!goalName || !targetAmount || !targetDate) {
      return;
    }

    setIsSubmitting(true);

    try {
      const data = {
        goalName,
        goalType,
        targetAmount: parseFloat(targetAmount),
        targetDate: format(targetDate, "yyyy-MM-dd"),
        currentAmountSaved: currentAmountSaved
          ? parseFloat(currentAmountSaved)
          : undefined,
        monthlyContribution: monthlyContribution
          ? parseFloat(monthlyContribution)
          : undefined,
        description: description || undefined,
        addToExpenditures,
        expenseName: addToExpenditures ? expenseName : undefined,
      };

      if (goal) {
        await updateGoal(goal.id, data);
      } else {
        await createGoal(data);
      }

      handleClose(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save goal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = goalName && targetAmount && targetDate;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{goal ? "Edit Goal" : "Add Goal"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Details */}
            <div className="space-y-4">
              <div className="pb-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Goal Details
                </h3>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="goalName">
                      Goal Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="goalName"
                      placeholder="e.g. Emergency Fund, Vacation, House Down Payment"
                      value={goalName}
                      onChange={(e) => setGoalName(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goalType">
                      Goal Type <span className="text-red-500">*</span>
                    </Label>
                    <Select value={goalType} onValueChange={(v) => setGoalType(v as "primary" | "secondary")}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary</SelectItem>
                        <SelectItem value="secondary">Secondary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetAmount">
                      Target Amount <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        id="targetAmount"
                        type="number"
                        placeholder="0.00"
                        value={targetAmount}
                        onChange={(e) => setTargetAmount(e.target.value)}
                        min="0"
                        step="0.01"
                        className="bg-white pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Target Date <span className="text-red-500">*</span>
                    </Label>
                    <Popover open={targetDateOpen} onOpenChange={setTargetDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-white",
                            !targetDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {targetDate
                            ? format(targetDate, "dd/MM/yyyy")
                            : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={targetDate}
                          onSelect={(date) => {
                            setTargetDate(date);
                            setTargetDateOpen(false);
                          }}
                          initialFocus
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    {monthsUntilTarget > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {monthsUntilTarget} months until target date
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add any notes or details about this goal..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-white resize-none"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Progress Tracking */}
            <div className="space-y-4">
              <div className="pb-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Progress Tracking
                </h3>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentAmountSaved">
                      Current Amount Saved
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        id="currentAmountSaved"
                        type="number"
                        placeholder="0.00"
                        value={currentAmountSaved}
                        onChange={(e) => setCurrentAmountSaved(e.target.value)}
                        min="0"
                        step="0.01"
                        className="bg-white pl-7"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      How much have you already saved?
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyContribution">
                      Monthly Contribution
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        id="monthlyContribution"
                        type="number"
                        placeholder="0.00"
                        value={monthlyContribution}
                        onChange={(e) => setMonthlyContribution(e.target.value)}
                        min="0"
                        step="0.01"
                        className="bg-white pl-7"
                      />
                    </div>
                    {suggestedMonthlyContribution > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Suggested: ${suggestedMonthlyContribution.toLocaleString(undefined, { maximumFractionDigits: 0 })}/month to reach target
                      </p>
                    )}
                  </div>
                </div>

                {projectedCompletion && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-sm text-emerald-700">
                      At ${parseFloat(monthlyContribution).toLocaleString()}/month, you'll reach your goal by{" "}
                      <span className="font-semibold">
                        {format(projectedCompletion, "MMMM yyyy")}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Expenditure Integration */}
            <div className="space-y-4">
              <div className="pb-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Expenditure Integration
                </h3>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label
                      htmlFor="addToExpenditures"
                      className="text-sm font-semibold text-gray-900"
                    >
                      Add to expenditures
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically track your monthly contribution as a
                      recurring expenditure
                    </p>
                  </div>
                  <Switch
                    id="addToExpenditures"
                    checked={addToExpenditures}
                    onCheckedChange={handleToggleChange}
                  />
                </div>
                {validationError && (
                  <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
                    {validationError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? "Saving..." : goal ? "Update Goal" : "Add Goal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add to Expenditures Confirmation Modal */}
      <AlertDialog
        open={confirmationModalOpen}
        onOpenChange={setConfirmationModalOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add to Expenses</AlertDialogTitle>
            <AlertDialogDescription>
              This will create an expense entry with the following details:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 my-4">
            {/* Expense Name Input - Editable */}
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

            {/* Display-only Details */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-600">Goal:</div>
              <div className="font-medium">{goalName || "-"}</div>

              <div className="text-gray-600">Monthly Contribution:</div>
              <div className="font-medium">
                $
                {monthlyContribution
                  ? parseFloat(monthlyContribution).toLocaleString()
                  : "0"}
              </div>

              <div className="text-gray-600">Category:</div>
              <div className="font-medium">Savings</div>

              <div className="text-gray-600">Frequency:</div>
              <div className="font-medium">Monthly</div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAddToExpenditures}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAddToExpenditures}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
