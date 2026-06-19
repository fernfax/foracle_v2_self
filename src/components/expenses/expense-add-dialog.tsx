"use client"

import { useEffect, useState } from "react"
import {
  getExpenseCategories,
  type ExpenseCategory
} from "@/actions/expense-categories"
import { addExpense } from "@/actions/expenses"
import { format } from "date-fns"
import { Info } from "lucide-react"

import { cn } from "@/lib/utils"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CategoryManagerPopover } from "@/components/expenses/expense-category-manager-popover"

interface AddExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExpenseAdded: () => void
}

const FREQUENCIES = [
  {
    value: "monthly",
    label: "Monthly",
    description: "Recurring every month on the same day"
  },
  { value: "custom", label: "Custom", description: "Select specific months" },
  { value: "one-time", label: "One-time", description: "Single payment" }
]

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

export function AddExpenseDialog({
  open,
  onOpenChange,
  onExpenseAdded
}: AddExpenseDialogProps) {
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [amount, setAmount] = useState("")
  const [frequency, setFrequency] = useState("monthly")
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [expenseCategory, setExpenseCategory] = useState("")
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  // Track if user has entered any meaningful data (not just selecting expense type)
  const hasUnsavedChanges =
    name !== "" || category !== "" || amount !== "" || notes !== ""

  const handleClose = (openState: boolean) => {
    if (!openState && hasUnsavedChanges) {
      setShowUnsavedWarning(true)
    } else {
      onOpenChange(openState)
    }
  }

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false)
    // Reset form
    setName("")
    setCategory("")
    setExpenseCategory("")
    setAmount("")
    setFrequency("monthly")
    setSelectedMonths([])
    setStartDate(undefined)
    setEndDate(undefined)
    setNotes("")
    onOpenChange(false)
  }

  // Reset form and load categories when dialog opens
  useEffect(() => {
    if (open) {
      // Reset form to initial state
      setName("")
      setCategory("")
      setExpenseCategory("")
      setAmount("")
      setFrequency("monthly")
      setSelectedMonths([])
      setStartDate(undefined)
      setEndDate(undefined)
      setNotes("")
      loadCategories()
    }
  }, [open])

  // Auto-set frequency to "one-time" when expense type is "one-off"
  useEffect(() => {
    if (expenseCategory === "one-off") {
      setFrequency("one-time")
    }
  }, [expenseCategory])

  const loadCategories = async () => {
    const data = await getExpenseCategories()
    setCategories(data)
  }

  const selectedFrequency = FREQUENCIES.find((f) => f.value === frequency)

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month)
        ? prev.filter((m) => m !== month)
        : [...prev, month].sort((a, b) => a - b)
    )
  }

  const handleSubmit = async () => {
    // For recurring expenses, startDate is not required
    const isRecurring = expenseCategory === "current-recurring"
    if (!name || !category || !amount || (!isRecurring && !startDate)) {
      return
    }

    // Validate custom frequency has months selected
    if (frequency === "custom" && selectedMonths.length === 0) {
      return
    }

    setIsSubmitting(true)
    try {
      await addExpense({
        name,
        category,
        expenseCategory,
        amount: parseFloat(amount),
        frequency,
        customMonths:
          frequency === "custom" ? JSON.stringify(selectedMonths) : undefined,
        startDate: isRecurring
          ? null
          : startDate
            ? format(startDate, "yyyy-MM-dd")
            : null,
        endDate: isRecurring
          ? null
          : endDate
            ? format(endDate, "yyyy-MM-dd")
            : null,
        description: notes || undefined
      })

      // Reset form
      setName("")
      setCategory("")
      setExpenseCategory("")
      setAmount("")
      setFrequency("monthly")
      setSelectedMonths([])
      setStartDate(undefined)
      setEndDate(undefined)
      setNotes("")

      onExpenseAdded()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to add expense:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Add Expense
              <Info className="text-muted-foreground h-4 w-4" />
            </DialogTitle>
            <DialogDescription>
              Add a new expense to track your spending.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className={!expenseCategory ? "min-h-[100px]" : ""}>
            {/* Expense Type Selector */}
            <Field
              label="Expense Type"
              htmlFor="expense-type"
              required
              helper={
                !expenseCategory
                  ? "Please select an expense type to continue"
                  : expenseCategory === "current-recurring"
                    ? "Expense that repeats regularly (e.g., monthly rent)"
                    : expenseCategory === "future-recurring"
                      ? "Recurring expense that starts in the future (e.g., upcoming subscription)"
                      : expenseCategory === "one-off"
                        ? "One-time expense that does not repeat (e.g., car repair, vacation)"
                        : undefined
              }>
              <Select
                value={expenseCategory}
                onValueChange={setExpenseCategory}>
                <SelectTrigger id="expense-type" aria-required="true">
                  <SelectValue placeholder="Select expense type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-recurring">
                    Recurring Expense
                  </SelectItem>
                  <SelectItem value="future-recurring">
                    Recurring Expense (Future)
                  </SelectItem>
                  <SelectItem value="one-off">One-off Expense</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {/* Show remaining fields only when expense type is selected */}
            {expenseCategory && (
              <div className="grid gap-6 py-4">
                {/* Row 1: Name and Category */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Expense Name" htmlFor="name" required>
                    <Input
                      id="name"
                      aria-required="true"
                      placeholder="e.g., Rent, Groceries"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                  <Field label="Category" htmlFor="category" required>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="category" aria-required="true">
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
                    <CategoryManagerPopover
                      categories={categories}
                      onCategoriesChanged={loadCategories}
                    />
                  </Field>
                </div>

                {/* Row 2: Amount and Frequency */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Expense Amount" htmlFor="amount" required>
                    <Input
                      id="amount"
                      aria-required="true"
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </Field>
                  <Field
                    label="Expense Frequency"
                    htmlFor="frequency"
                    required
                    helper={selectedFrequency?.description}>
                    <Select
                      value={frequency}
                      onValueChange={setFrequency}
                      disabled={expenseCategory === "one-off"}>
                      <SelectTrigger id="frequency" aria-required="true">
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
                  </Field>
                </div>

                {/* Custom Month Selector */}
                {frequency === "custom" && (
                  <Field label="Select Months" required>
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
                    <p className="text-muted-foreground text-sm">
                      Selected:{" "}
                      {selectedMonths.length > 0
                        ? selectedMonths
                            .map((m) => {
                              const monthName = [
                                "January",
                                "February",
                                "March",
                                "April",
                                "May",
                                "June",
                                "July",
                                "August",
                                "September",
                                "October",
                                "November",
                                "December"
                              ][m - 1]
                              return monthName
                            })
                            .join(", ")
                        : "None"}
                    </p>
                  </Field>
                )}

                {/* Row 3: Start Date and End Date - Only show for non-recurring expenses */}
                {expenseCategory !== "current-recurring" && (
                  <div
                    className={cn(
                      "grid gap-4",
                      expenseCategory === "one-off"
                        ? "grid-cols-1"
                        : "grid-cols-2"
                    )}>
                    <Field
                      label={
                        expenseCategory === "one-off"
                          ? "Expense Date"
                          : "Start Date"
                      }
                      htmlFor="start-date"
                      required>
                      <DatePicker
                        id="start-date"
                        value={startDate}
                        onChange={setStartDate}
                        triggerClassName="w-full touch-manipulation"
                      />
                    </Field>
                    {expenseCategory !== "one-off" && (
                      <Field
                        label="End Date"
                        htmlFor="end-date"
                        helper="Leave empty for ongoing expense">
                        <DatePicker
                          id="end-date"
                          value={endDate}
                          onChange={setEndDate}
                          triggerClassName="w-full touch-manipulation"
                        />
                      </Field>
                    )}
                  </div>
                )}

                {/* Row 4: Notes */}
                <Field
                  label="Expense Notes"
                  htmlFor="notes"
                  helper="Add any additional details about this expense">
                  <Textarea
                    id="notes"
                    placeholder="e.g., Monthly apartment rent..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </Field>
              </div>
            )}
          </DialogBody>

          {/* Footer */}
          <DialogFooterSticky>
            <Button
              variant="ghost"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}>
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
              }>
              {isSubmitting ? "Adding..." : "Add Expense"}
            </Button>
          </DialogFooterSticky>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showUnsavedWarning}
        onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close? All your
              changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
