"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { addExpense } from "@/lib/actions/expenses";
import { getExpenseCategories, type ExpenseCategory } from "@/lib/actions/expense-categories";
import { CategoryManagerPopover } from "./category-manager-popover";

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpenseAdded: () => void;
}

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

export function AddExpenseDialog({ open, onOpenChange, onExpenseAdded }: AddExpenseDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState("");
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Track if user has entered any meaningful data (not just selecting expense type)
  const hasUnsavedChanges =
    name !== "" ||
    category !== "" ||
    amount !== "" ||
    notes !== "";

  const handleClose = (openState: boolean) => {
    if (!openState && hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onOpenChange(openState);
    }
  };

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false);
    // Reset form
    setName("");
    setCategory("");
    setExpenseCategory("");
    setAmount("");
    setFrequency("monthly");
    setSelectedMonths([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setNotes("");
    onOpenChange(false);
  };

  // Reset form and load categories when dialog opens
  useEffect(() => {
    if (open) {
      // Reset form to initial state
      setName("");
      setCategory("");
      setExpenseCategory("");
      setAmount("");
      setFrequency("monthly");
      setSelectedMonths([]);
      setStartDate(undefined);
      setEndDate(undefined);
      setNotes("");
      loadCategories();
    }
  }, [open]);

  // Auto-set frequency to "one-time" when expense type is "one-off"
  useEffect(() => {
    if (expenseCategory === "one-off") {
      setFrequency("one-time");
    }
  }, [expenseCategory]);

  const loadCategories = async () => {
    const data = await getExpenseCategories();
    setCategories(data);
  };

  const selectedFrequency = FREQUENCIES.find((f) => f.value === frequency);

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month].sort((a, b) => a - b)
    );
  };

  const handleSubmit = async () => {
    // For recurring expenses, startDate is not required
    const isRecurring = expenseCategory === "current-recurring";
    if (!name || !category || !amount || (!isRecurring && !startDate)) {
      return;
    }

    // Validate custom frequency has months selected
    if (frequency === "custom" && selectedMonths.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await addExpense({
        name,
        category,
        expenseCategory,
        amount: parseFloat(amount),
        frequency,
        customMonths: frequency === "custom" ? JSON.stringify(selectedMonths) : undefined,
        startDate: isRecurring ? null : (startDate ? format(startDate, "yyyy-MM-dd") : null),
        endDate: isRecurring ? null : (endDate ? format(endDate, "yyyy-MM-dd") : null),
        description: notes || undefined,
      });

      // Reset form
      setName("");
      setCategory("");
      setExpenseCategory("");
      setAmount("");
      setFrequency("monthly");
      setSelectedMonths([]);
      setStartDate(undefined);
      setEndDate(undefined);
      setNotes("");

      onExpenseAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add Expense
            <Info className="h-4 w-4 text-muted-foreground" />
          </DialogTitle>
          <DialogDescription>Add a new expense to track your spending.</DialogDescription>
        </DialogHeader>

        <DialogBody className={!expenseCategory ? "min-h-[100px]" : ""}>
        {/* Expense Type Selector */}
        <div className="space-y-2">
          <Label htmlFor="expense-type">
            Expense Type <span className="text-red-500">*</span>
          </Label>
          <Select value={expenseCategory} onValueChange={setExpenseCategory}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select expense type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-recurring">Recurring Expense</SelectItem>
              <SelectItem value="future-recurring">Recurring Expense (Future)</SelectItem>
              <SelectItem value="one-off">One-off Expense</SelectItem>
            </SelectContent>
          </Select>
          {!expenseCategory && (
            <p className="text-xs text-muted-foreground">Please select an expense type to continue</p>
          )}
          {expenseCategory === "current-recurring" && (
            <p className="text-xs text-muted-foreground">Expense that repeats regularly (e.g., monthly rent)</p>
          )}
          {expenseCategory === "future-recurring" && (
            <p className="text-xs text-muted-foreground">Recurring expense that starts in the future (e.g., upcoming subscription)</p>
          )}
          {expenseCategory === "one-off" && (
            <p className="text-xs text-muted-foreground">One-time expense that does not repeat (e.g., car repair, vacation)</p>
          )}
        </div>

        {/* Show remaining fields only when expense type is selected */}
        {expenseCategory && (
        <div className="grid gap-6 py-4">
          {/* Row 1: Name and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Expense Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Rent, Groceries"
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
                <SelectContent className="max-h-[400px] overflow-y-auto">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CategoryManagerPopover categories={categories} onCategoriesChanged={loadCategories} />
            </div>
          </div>

          {/* Row 2: Amount and Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Expense Amount <span className="text-red-500">*</span>
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
                Expense Frequency <span className="text-red-500">*</span>
              </Label>
              <Select
                value={frequency}
                onValueChange={setFrequency}
                disabled={expenseCategory === "one-off"}
              >
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

          {/* Row 3: Start Date and End Date - Only show for non-recurring expenses */}
          {expenseCategory !== "current-recurring" && (
            <div className={cn("grid gap-4", expenseCategory === "one-off" ? "grid-cols-1" : "grid-cols-2")}>
              <div className="space-y-2">
                <Label>
                  {expenseCategory === "one-off" ? "Expense Date" : "Start Date"} <span className="text-red-500">*</span>
                </Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal touch-manipulation",
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
              {expenseCategory !== "one-off" && (
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal touch-manipulation",
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
                  <p className="text-xs text-muted-foreground">Leave empty for ongoing expense</p>
                </div>
              )}
            </div>
          )}

          {/* Row 4: Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Expense Notes</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Monthly apartment rent..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="bg-white"
            />
            <p className="text-xs text-muted-foreground">Add any additional details about this expense</p>
          </div>
        </div>
        )}
        </DialogBody>

        {/* Footer */}
        <DialogFooterSticky>
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !expenseCategory ||
              !name ||
              !category ||
              !amount ||
              (expenseCategory !== "current-recurring" && !startDate) ||
              (frequency === "custom" && selectedMonths.length === 0) ||
              isSubmitting
            }
          >
            {isSubmitting ? "Adding..." : "Add Expense"}
          </Button>
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
