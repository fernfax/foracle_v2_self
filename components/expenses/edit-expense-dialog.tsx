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
import { CalendarIcon, Info, Lock, Shield } from "lucide-react";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { updateExpense } from "@/lib/actions/expenses";
import { getExpenseCategories, type ExpenseCategory } from "@/lib/actions/expense-categories";
import { CategoryManagerPopover } from "./category-manager-popover";
import Link from "next/link";

interface Expense {
  id: string;
  userId?: string;
  linkedPolicyId?: string | null;
  name: string;
  category: string;
  expenseCategory: string | null;
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  onExpenseUpdated: (expense: Expense) => void;
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

export function EditExpenseDialog({ open, onOpenChange, expense, onExpenseUpdated }: EditExpenseDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState("current-recurring");

  // Check if this expense is linked to a policy
  const isLinkedToPolicy = expense?.linkedPolicyId != null;

  // Load categories when dialog opens
  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  const loadCategories = async () => {
    const data = await getExpenseCategories();
    setCategories(data);
  };

  // Populate form when expense changes
  useEffect(() => {
    if (expense) {
      setName(expense.name);
      setCategory(expense.category);
      setExpenseCategory(expense.expenseCategory || "current-recurring");
      setAmount(expense.amount);
      setFrequency(expense.frequency);
      setStartDate(expense.startDate ? parse(expense.startDate, "yyyy-MM-dd", new Date()) : undefined);
      setEndDate(expense.endDate ? parse(expense.endDate, "yyyy-MM-dd", new Date()) : undefined);
      setNotes(expense.description || "");
      // Parse custom months if they exist
      if (expense.customMonths) {
        try {
          setSelectedMonths(JSON.parse(expense.customMonths));
        } catch {
          setSelectedMonths([]);
        }
      } else {
        setSelectedMonths([]);
      }
    }
  }, [expense]);

  const selectedFrequency = FREQUENCIES.find((f) => f.value === frequency);

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month].sort((a, b) => a - b)
    );
  };

  const handleSubmit = async () => {
    // For recurring expenses, startDate is not required
    const isRecurring = expenseCategory === "current-recurring";
    if (!expense || !name || !category || !amount || (!isRecurring && !startDate)) {
      return;
    }

    // Validate custom frequency has months selected
    if (frequency === "custom" && selectedMonths.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedExpense = await updateExpense(expense.id, {
        name,
        category,
        expenseCategory,
        amount: parseFloat(amount),
        frequency,
        customMonths: frequency === "custom" ? JSON.stringify(selectedMonths) : null,
        startDate: isRecurring ? null : (startDate ? format(startDate, "yyyy-MM-dd") : null),
        endDate: isRecurring ? null : (endDate ? format(endDate, "yyyy-MM-dd") : null),
        description: notes || undefined,
      });

      onExpenseUpdated(updatedExpense);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLinkedToPolicy ? (
              <>
                <Shield className="h-5 w-5 text-blue-600" />
                View Insurance Expense
              </>
            ) : (
              <>
                Edit Expense
                <Info className="h-4 w-4 text-muted-foreground" />
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isLinkedToPolicy
              ? "This expense is linked to an insurance policy. Some fields cannot be edited here."
              : "Update the expense details."}
          </DialogDescription>
        </DialogHeader>

        {/* Linked Policy Alert */}
        {isLinkedToPolicy && (
          <div className="flex gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <Lock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-blue-800">
              <span className="font-medium">This expense is linked to an insurance policy.</span>
              <br />
              <span className="text-sm">
                To edit the premium amount, frequency, dates, or selected months, please{" "}
                <Link
                  href={`/dashboard/policies?edit=${expense?.linkedPolicyId}`}
                  className="font-medium underline hover:text-blue-900"
                  onClick={() => onOpenChange(false)}
                >
                  go to Insurance Policies
                </Link>
                {" "}and edit the policy directly.
              </span>
            </div>
          </div>
        )}

        {/* Expense Type Selector */}
        <div className="space-y-2">
          <Label htmlFor="edit-expense-type" className="flex items-center gap-1">
            Expense Type
            {isLinkedToPolicy && <Lock className="h-3 w-3 text-muted-foreground" />}
          </Label>
          <Select value={expenseCategory} onValueChange={isLinkedToPolicy ? undefined : setExpenseCategory} disabled={isLinkedToPolicy}>
            <SelectTrigger className={cn("bg-white", isLinkedToPolicy && "bg-gray-100 cursor-not-allowed")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-recurring">Recurring Expense</SelectItem>
              <SelectItem value="future-recurring">Recurring Expense (Future)</SelectItem>
              <SelectItem value="one-off">One-off Expense</SelectItem>
            </SelectContent>
          </Select>
          {isLinkedToPolicy ? (
            <p className="text-xs text-muted-foreground">Inherited from insurance policy</p>
          ) : (
            <>
              {expenseCategory === "current-recurring" && (
                <p className="text-xs text-muted-foreground">Expense that repeats regularly (e.g., monthly rent)</p>
              )}
              {expenseCategory === "future-recurring" && (
                <p className="text-xs text-muted-foreground">Recurring expense that starts in the future (e.g., upcoming subscription)</p>
              )}
              {expenseCategory === "one-off" && (
                <p className="text-xs text-muted-foreground">One-time expense that does not repeat (e.g., car repair, vacation)</p>
              )}
            </>
          )}
        </div>

        <div className="grid gap-6 py-4">
          {/* Row 1: Name and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="flex items-center gap-1">
                Expense Name <span className="text-red-500">*</span>
                {isLinkedToPolicy && <Lock className="h-3 w-3 text-muted-foreground" />}
              </Label>
              <Input
                id="edit-name"
                placeholder="e.g., Rent, Groceries"
                value={name}
                onChange={(e) => !isLinkedToPolicy && setName(e.target.value)}
                className={cn("bg-white", isLinkedToPolicy && "bg-gray-100 cursor-not-allowed")}
                disabled={isLinkedToPolicy}
              />
              {isLinkedToPolicy && (
                <p className="text-xs text-muted-foreground">Inherited from insurance policy</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category" className="flex items-center gap-1">
                Category <span className="text-red-500">*</span>
                {isLinkedToPolicy && <Lock className="h-3 w-3 text-muted-foreground" />}
              </Label>
              <Select value={category} onValueChange={isLinkedToPolicy ? undefined : setCategory} disabled={isLinkedToPolicy}>
                <SelectTrigger className={cn("bg-white", isLinkedToPolicy && "bg-gray-100 cursor-not-allowed")}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLinkedToPolicy ? (
                <p className="text-xs text-muted-foreground">Inherited from insurance policy</p>
              ) : (
                <CategoryManagerPopover categories={categories} onCategoriesChanged={loadCategories} />
              )}
            </div>
          </div>

          {/* Row 2: Amount and Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-amount" className="flex items-center gap-1">
                Expense Amount <span className="text-red-500">*</span>
                {isLinkedToPolicy && <Lock className="h-3 w-3 text-muted-foreground" />}
              </Label>
              <Input
                id="edit-amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => !isLinkedToPolicy && setAmount(e.target.value)}
                min="0"
                step="0.01"
                className={cn("bg-white", isLinkedToPolicy && "bg-gray-100 cursor-not-allowed")}
                disabled={isLinkedToPolicy}
              />
              {isLinkedToPolicy && (
                <p className="text-xs text-muted-foreground">Inherited from insurance policy</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-frequency" className="flex items-center gap-1">
                Expense Frequency <span className="text-red-500">*</span>
                {isLinkedToPolicy && <Lock className="h-3 w-3 text-muted-foreground" />}
              </Label>
              <Select value={frequency} onValueChange={isLinkedToPolicy ? undefined : setFrequency} disabled={isLinkedToPolicy}>
                <SelectTrigger className={cn("bg-white", isLinkedToPolicy && "bg-gray-100 cursor-not-allowed")}>
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
              {isLinkedToPolicy ? (
                <p className="text-xs text-muted-foreground">Inherited from insurance policy</p>
              ) : (
                selectedFrequency && (
                  <p className="text-xs text-muted-foreground">{selectedFrequency.description}</p>
                )
              )}
            </div>
          </div>

          {/* Custom Month Selector */}
          {frequency.toLowerCase() === "custom" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Select Months <span className="text-red-500">*</span>
                {isLinkedToPolicy && <Lock className="h-3 w-3 text-muted-foreground" />}
              </Label>
              <div className="grid grid-cols-6 gap-2">
                {MONTHS.map((month) => (
                  <Button
                    key={month.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => !isLinkedToPolicy && toggleMonth(month.value)}
                    disabled={isLinkedToPolicy}
                    className={cn(
                      "h-10 font-medium",
                      selectedMonths.includes(month.value)
                        ? "bg-black text-white hover:bg-black/90 border-black"
                        : "bg-white hover:bg-gray-50",
                      isLinkedToPolicy && "cursor-not-allowed opacity-70"
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
              {isLinkedToPolicy && (
                <p className="text-xs text-muted-foreground">Inherited from insurance policy</p>
              )}
            </div>
          )}

          {/* Row 3: Start Date and End Date - Only show for non-recurring expenses */}
          {expenseCategory !== "current-recurring" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Start Date <span className="text-red-500">*</span>
                  {isLinkedToPolicy && <Lock className="h-3 w-3 text-muted-foreground" />}
                </Label>
                {isLinkedToPolicy ? (
                  <Button
                    variant="outline"
                    disabled
                    className="w-full justify-start text-left font-normal bg-gray-100 cursor-not-allowed"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMMM do, yyyy") : "Pick a date"}
                  </Button>
                ) : (
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
                )}
                {isLinkedToPolicy && (
                  <p className="text-xs text-muted-foreground">Inherited from insurance policy</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  End Date
                  {isLinkedToPolicy && <Lock className="h-3 w-3 text-muted-foreground" />}
                </Label>
                {isLinkedToPolicy ? (
                  <Button
                    variant="outline"
                    disabled
                    className="w-full justify-start text-left font-normal bg-gray-100 cursor-not-allowed"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMMM do, yyyy") : "No end date"}
                  </Button>
                ) : (
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
                )}
                {isLinkedToPolicy ? (
                  <p className="text-xs text-muted-foreground">Inherited from insurance policy</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Leave empty for ongoing expense</p>
                )}
              </div>
            </div>
          )}

          {/* Row 4: Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Expense Notes</Label>
            <Textarea
              id="edit-notes"
              placeholder="e.g., Monthly apartment rent..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="bg-white"
            />
            <p className="text-xs text-muted-foreground">Add any additional details about this expense</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          {isLinkedToPolicy ? (
            <>
              <Button asChild variant="outline">
                <Link href={`/dashboard/policies?edit=${expense?.linkedPolicyId}`} onClick={() => onOpenChange(false)}>
                  Go to Insurance Policies
                </Link>
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !name ||
                  !category ||
                  !amount ||
                  (expenseCategory !== "current-recurring" && !startDate) ||
                  (frequency.toLowerCase() === "custom" && selectedMonths.length === 0) ||
                  isSubmitting
                }
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
