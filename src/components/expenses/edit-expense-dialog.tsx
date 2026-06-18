"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  getExpenseCategories,
  type ExpenseCategory
} from "@/actions/expense-categories"
import { updateExpense } from "@/actions/expenses"
import { format, parse } from "date-fns"
import {
  CalendarIcon,
  Car,
  Home,
  Info,
  Lock,
  Shield,
  Target
} from "lucide-react"

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
import { CategoryManagerPopover } from "@/components/expenses/category-manager-popover"

interface Expense {
  id: string
  userId?: string
  linkedPolicyId?: string | null
  linkedPropertyId?: string | null
  linkedVehicleId?: string | null
  linkedGoalId?: string | null
  name: string
  category: string
  expenseCategory: string | null
  amount: string
  frequency: string
  customMonths: string | null
  startDate: string | null
  endDate: string | null
  description: string | null
  isActive: boolean | null
  createdAt: Date
  updatedAt: Date
}

// Helper to get integration type info
type IntegrationType = "policy" | "property" | "vehicle" | "goal" | null

const getIntegrationType = (expense: Expense | null): IntegrationType => {
  if (!expense) return null
  if (expense.linkedPolicyId) return "policy"
  if (expense.linkedPropertyId) return "property"
  if (expense.linkedVehicleId) return "vehicle"
  if (expense.linkedGoalId) return "goal"
  return null
}

const integrationConfig = {
  policy: {
    icon: Shield,
    color: "text-on-brand",
    bgColor: "bg-brand-terracotta/[0.1]",
    borderColor: "border-brand-terracotta/[0.25]",
    textColor: "text-on-brand",
    title: "View Insurance Expense",
    description:
      "This expense is linked to an insurance policy. Some fields cannot be edited here.",
    alertMessage: "This expense is linked to an insurance policy.",
    linkText: "go to Insurance Policies",
    linkHref: (expense: Expense) =>
      `/dashboard/policies?edit=${expense.linkedPolicyId}`
  },
  property: {
    icon: Home,
    color: "text-on-success",
    bgColor: "bg-brand-teal/[0.12]",
    borderColor: "border-brand-teal/[0.25]",
    textColor: "text-on-success",
    title: "View Property Expense",
    description:
      "This expense is linked to a property asset. Some fields cannot be edited here.",
    alertMessage: "This expense is linked to a property asset.",
    linkText: "go to Assets",
    linkHref: () => `/dashboard/user/assets?tab=property`
  },
  vehicle: {
    icon: Car,
    color: "text-on-warning",
    bgColor: "bg-brand-gold/[0.15]",
    borderColor: "border-brand-gold/[0.3]",
    textColor: "text-on-warning",
    title: "View Vehicle Expense",
    description:
      "This expense is linked to a vehicle asset. Some fields cannot be edited here.",
    alertMessage: "This expense is linked to a vehicle asset.",
    linkText: "go to Assets",
    linkHref: () => `/dashboard/user/assets?tab=vehicle`
  },
  goal: {
    icon: Target,
    color: "text-on-brand",
    bgColor: "bg-brand-terracotta/[0.1]",
    borderColor: "border-brand-terracotta/[0.25]",
    textColor: "text-on-brand",
    title: "View Goal Contribution",
    description:
      "This expense is linked to a savings goal. Some fields cannot be edited here.",
    alertMessage: "This expense is linked to a savings goal.",
    linkText: "go to Goals",
    linkHref: () => `/dashboard/goals`
  }
}

interface EditExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: Expense | null
  onExpenseUpdated: (expense: Expense) => void
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

export function EditExpenseDialog({
  open,
  onOpenChange,
  expense,
  onExpenseUpdated
}: EditExpenseDialogProps) {
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
  const [expenseCategory, setExpenseCategory] = useState("current-recurring")
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  // Track initial values to detect changes
  const [initialValues, setInitialValues] = useState<{
    name: string
    category: string
    expenseCategory: string
    amount: string
    frequency: string
    selectedMonths: number[]
    startDate: Date | undefined
    endDate: Date | undefined
    notes: string
  } | null>(null)

  // Check if this expense is linked to any integration
  const integrationType = getIntegrationType(expense)
  const isLinked = integrationType !== null
  const config = integrationType ? integrationConfig[integrationType] : null

  // Load categories when dialog opens
  useEffect(() => {
    if (open) {
      loadCategories()
    }
  }, [open])

  const loadCategories = async () => {
    const data = await getExpenseCategories()
    setCategories(data)
  }

  // Populate form when dialog opens or expense changes
  useEffect(() => {
    if (open && expense) {
      const parsedStartDate = expense.startDate
        ? parse(expense.startDate, "yyyy-MM-dd", new Date())
        : undefined
      const parsedEndDate = expense.endDate
        ? parse(expense.endDate, "yyyy-MM-dd", new Date())
        : undefined
      const expenseCat = expense.expenseCategory || "current-recurring"
      const parsedMonths = expense.customMonths
        ? (() => {
            try {
              return JSON.parse(expense.customMonths)
            } catch {
              return []
            }
          })()
        : []

      setName(expense.name)
      setCategory(expense.category)
      setExpenseCategory(expenseCat)
      setAmount(expense.amount)
      setFrequency(expense.frequency)
      setStartDate(parsedStartDate)
      setEndDate(parsedEndDate)
      setNotes(expense.description || "")
      setSelectedMonths(parsedMonths)

      // Save initial values for change detection
      setInitialValues({
        name: expense.name,
        category: expense.category,
        expenseCategory: expenseCat,
        amount: expense.amount,
        frequency: expense.frequency,
        selectedMonths: parsedMonths,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        notes: expense.description || ""
      })
    }
  }, [open, expense])

  // Auto-set frequency to "one-time" when expense type is "one-off"
  useEffect(() => {
    if (expenseCategory === "one-off") {
      setFrequency("one-time")
    }
  }, [expenseCategory])

  const selectedFrequency = FREQUENCIES.find((f) => f.value === frequency)

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month)
        ? prev.filter((m) => m !== month)
        : [...prev, month].sort((a, b) => a - b)
    )
  }

  // Check if user has made any changes from initial values
  const hasUnsavedChanges = initialValues
    ? name !== initialValues.name ||
      category !== initialValues.category ||
      expenseCategory !== initialValues.expenseCategory ||
      amount !== initialValues.amount ||
      frequency !== initialValues.frequency ||
      JSON.stringify(selectedMonths) !==
        JSON.stringify(initialValues.selectedMonths) ||
      startDate?.getTime() !== initialValues.startDate?.getTime() ||
      endDate?.getTime() !== initialValues.endDate?.getTime() ||
      notes !== initialValues.notes
    : false

  const handleClose = (openState: boolean) => {
    if (!openState && hasUnsavedChanges && !isLinked) {
      setShowUnsavedWarning(true)
    } else {
      onOpenChange(openState)
    }
  }

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false)
    // Reset form to initial values
    if (initialValues) {
      setName(initialValues.name)
      setCategory(initialValues.category)
      setExpenseCategory(initialValues.expenseCategory)
      setAmount(initialValues.amount)
      setFrequency(initialValues.frequency)
      setSelectedMonths(initialValues.selectedMonths)
      setStartDate(initialValues.startDate)
      setEndDate(initialValues.endDate)
      setNotes(initialValues.notes)
    }
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    // For recurring expenses, startDate is not required
    const isRecurring = expenseCategory === "current-recurring"
    if (
      !expense ||
      !name ||
      !category ||
      !amount ||
      (!isRecurring && !startDate)
    ) {
      return
    }

    // Validate custom frequency has months selected
    if (frequency === "custom" && selectedMonths.length === 0) {
      return
    }

    setIsSubmitting(true)
    try {
      const updatedExpense = await updateExpense(expense.id, {
        name,
        category,
        expenseCategory,
        amount: parseFloat(amount),
        frequency,
        customMonths:
          frequency === "custom" ? JSON.stringify(selectedMonths) : null,
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

      onExpenseUpdated(updatedExpense)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update expense:", error)
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
              {isLinked && config ? (
                <>
                  <config.icon className={`h-5 w-5 ${config.color}`} />
                  {config.title}
                </>
              ) : (
                <>
                  Edit Expense
                  <Info className="text-muted-foreground h-4 w-4" />
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isLinked && config
                ? config.description
                : "Update the expense details."}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className={!expenseCategory ? "min-h-[100px]" : ""}>
            {/* Linked Integration Alert */}
            {isLinked && config && expense && (
              <div
                className={`flex gap-3 rounded-lg p-4 ${config.bgColor} border ${config.borderColor}`}>
                <Lock
                  className={`h-4 w-4 ${config.color} mt-0.5 flex-shrink-0`}
                />
                <div className={config.textColor}>
                  <span className="font-medium">{config.alertMessage}</span>
                  <br />
                  <span className="text-sm">
                    To edit the amount, frequency, dates, or selected months,
                    please{" "}
                    <Link
                      href={config.linkHref(expense)}
                      className="font-medium underline hover:opacity-80"
                      onClick={() => onOpenChange(false)}>
                      {config.linkText}
                    </Link>{" "}
                    and edit directly.
                  </span>
                </div>
              </div>
            )}

            {/* Expense Type Selector */}
            <Field
              label={
                <>
                  Expense Type
                  {isLinked && (
                    <Lock className="text-muted-foreground h-3 w-3" />
                  )}
                </>
              }
              htmlFor="edit-expense-type"
              required
              labelClassName="flex items-center gap-1"
              helper={
                isLinked
                  ? "Inherited from insurance policy"
                  : !expenseCategory
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
                onValueChange={isLinked ? undefined : setExpenseCategory}
                disabled={isLinked}>
                <SelectTrigger
                  id="edit-expense-type"
                  aria-required="true"
                  className={cn(isLinked && "bg-muted cursor-not-allowed")}>
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
                  <Field
                    label={
                      <>
                        Expense Name
                        {isLinked && (
                          <Lock className="text-muted-foreground h-3 w-3" />
                        )}
                      </>
                    }
                    htmlFor="edit-name"
                    required
                    labelClassName="flex items-center gap-1"
                    helper={
                      isLinked ? "Inherited from insurance policy" : undefined
                    }>
                    <Input
                      id="edit-name"
                      aria-required="true"
                      placeholder="e.g., Rent, Groceries"
                      value={name}
                      onChange={(e) => !isLinked && setName(e.target.value)}
                      className={cn(isLinked && "bg-muted cursor-not-allowed")}
                      disabled={isLinked}
                    />
                  </Field>
                  <Field
                    label={
                      <>
                        Category
                        {isLinked && (
                          <Lock className="text-muted-foreground h-3 w-3" />
                        )}
                      </>
                    }
                    htmlFor="edit-category"
                    required
                    labelClassName="flex items-center gap-1"
                    helper={
                      isLinked ? "Inherited from insurance policy" : undefined
                    }>
                    <Select
                      value={category}
                      onValueChange={isLinked ? undefined : setCategory}
                      disabled={isLinked}>
                      <SelectTrigger
                        id="edit-category"
                        aria-required="true"
                        className={cn(
                          isLinked && "bg-muted cursor-not-allowed"
                        )}>
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
                    {!isLinked && (
                      <CategoryManagerPopover
                        categories={categories}
                        onCategoriesChanged={loadCategories}
                      />
                    )}
                  </Field>
                </div>

                {/* Row 2: Amount and Frequency */}
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label={
                      <>
                        Expense Amount
                        {isLinked && (
                          <Lock className="text-muted-foreground h-3 w-3" />
                        )}
                      </>
                    }
                    htmlFor="edit-amount"
                    required
                    labelClassName="flex items-center gap-1"
                    helper={
                      isLinked ? "Inherited from insurance policy" : undefined
                    }>
                    <Input
                      id="edit-amount"
                      aria-required="true"
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => !isLinked && setAmount(e.target.value)}
                      min="0"
                      step="0.01"
                      className={cn(isLinked && "bg-muted cursor-not-allowed")}
                      disabled={isLinked}
                    />
                  </Field>
                  <Field
                    label={
                      <>
                        Expense Frequency
                        {isLinked && (
                          <Lock className="text-muted-foreground h-3 w-3" />
                        )}
                      </>
                    }
                    htmlFor="edit-frequency"
                    required
                    labelClassName="flex items-center gap-1"
                    helper={
                      isLinked
                        ? "Inherited from insurance policy"
                        : selectedFrequency?.description
                    }>
                    <Select
                      value={frequency}
                      onValueChange={
                        isLinked || expenseCategory === "one-off"
                          ? undefined
                          : setFrequency
                      }
                      disabled={isLinked || expenseCategory === "one-off"}>
                      <SelectTrigger
                        id="edit-frequency"
                        aria-required="true"
                        className={cn(
                          (isLinked || expenseCategory === "one-off") &&
                            "bg-muted cursor-not-allowed"
                        )}>
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
                {frequency.toLowerCase() === "custom" && (
                  <Field
                    label={
                      <>
                        Select Months
                        {isLinked && (
                          <Lock className="text-muted-foreground h-3 w-3" />
                        )}
                      </>
                    }
                    required
                    labelClassName="flex items-center gap-1"
                    helper={
                      isLinked ? "Inherited from insurance policy" : undefined
                    }>
                    <div className="grid grid-cols-6 gap-2">
                      {MONTHS.map((month) => (
                        <Button
                          key={month.value}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => !isLinked && toggleMonth(month.value)}
                          disabled={isLinked}
                          className={cn(
                            "h-10 font-medium",
                            selectedMonths.includes(month.value)
                              ? "border-black bg-black text-white hover:bg-black/90"
                              : "bg-card hover:bg-muted",
                            isLinked && "cursor-not-allowed opacity-70"
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
                        <>
                          {expenseCategory === "one-off"
                            ? "Expense Date"
                            : "Start Date"}
                          {isLinked && (
                            <Lock className="text-muted-foreground h-3 w-3" />
                          )}
                        </>
                      }
                      htmlFor="edit-start-date"
                      required
                      labelClassName="flex items-center gap-1"
                      helper={
                        isLinked ? "Inherited from insurance policy" : undefined
                      }>
                      {isLinked ? (
                        <Button
                          variant="outline"
                          disabled
                          className="bg-muted w-full cursor-not-allowed justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate
                            ? format(startDate, "MMMM do, yyyy")
                            : "Pick a date"}
                        </Button>
                      ) : (
                        <DatePicker
                          id="edit-start-date"
                          value={startDate}
                          onChange={setStartDate}
                          triggerClassName="w-full touch-manipulation"
                        />
                      )}
                    </Field>
                    {expenseCategory !== "one-off" && (
                      <Field
                        label={
                          <>
                            End Date
                            {isLinked && (
                              <Lock className="text-muted-foreground h-3 w-3" />
                            )}
                          </>
                        }
                        htmlFor="edit-end-date"
                        labelClassName="flex items-center gap-1"
                        helper={
                          isLinked
                            ? "Inherited from insurance policy"
                            : "Leave empty for ongoing expense"
                        }>
                        {isLinked ? (
                          <Button
                            variant="outline"
                            disabled
                            className="bg-muted w-full cursor-not-allowed justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate
                              ? format(endDate, "MMMM do, yyyy")
                              : "No end date"}
                          </Button>
                        ) : (
                          <DatePicker
                            id="edit-end-date"
                            value={endDate}
                            onChange={setEndDate}
                            triggerClassName="w-full touch-manipulation"
                          />
                        )}
                      </Field>
                    )}
                  </div>
                )}

                {/* Row 4: Notes */}
                <Field
                  label="Expense Notes"
                  htmlFor="edit-notes"
                  helper="Add any additional details about this expense">
                  <Textarea
                    id="edit-notes"
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
            {isLinked && config && expense ? (
              <>
                <Button asChild variant="outline">
                  <Link
                    href={config.linkHref(expense)}
                    onClick={() => onOpenChange(false)}>
                    {config.linkText.replace("go to ", "Go to ")}
                  </Link>
                </Button>
                <Button onClick={() => onOpenChange(false)}>Close</Button>
              </>
            ) : (
              <>
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
                    (frequency.toLowerCase() === "custom" &&
                      selectedMonths.length === 0) ||
                    isSubmitting
                  }>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
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
