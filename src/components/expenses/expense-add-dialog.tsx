"use client"

import { useEffect, useState } from "react"
import {
  getExpenseCategories,
  type ExpenseCategory
} from "@/actions/expense-categories"
import { addExpense } from "@/actions/expenses"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { Info } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

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
import { ExpenseCategoryManagerPopover } from "@/components/expenses/expense-category-manager-popover"

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

const MONTH_NAMES = [
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
]

// Form-layer schema. expenseCategory/name/category/amount are always required;
// startDate is required only for non-recurring expenses and custom frequency
// requires at least one month (superRefine) — together these reproduce the
// original disabled-submit gate via mode:"onChange" + isValid.
const expenseFormSchema = z
  .object({
    expenseCategory: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    amount: z.string().min(1),
    frequency: z.string(),
    selectedMonths: z.array(z.number()),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    notes: z.string()
  })
  .superRefine((v, ctx) => {
    if (v.frequency === "custom" && v.selectedMonths.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selectedMonths"],
        message: "Select at least one month"
      })
    }
    if (v.expenseCategory !== "current-recurring" && !v.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "Date is required"
      })
    }
  })
type ExpenseFormValues = z.infer<typeof expenseFormSchema>

const defaultValues: ExpenseFormValues = {
  expenseCategory: "",
  name: "",
  category: "",
  amount: "",
  frequency: "monthly",
  selectedMonths: [],
  startDate: undefined,
  endDate: undefined,
  notes: ""
}

export function ExpenseAddDialog({
  open,
  onOpenChange,
  onExpenseAdded
}: AddExpenseDialogProps) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { isValid, isSubmitting }
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    mode: "onChange",
    defaultValues
  })

  const expenseCategory = useWatch({ control, name: "expenseCategory" })
  const frequency = useWatch({ control, name: "frequency" })

  // Reset form and load categories when dialog opens
  useEffect(() => {
    if (open) {
      reset(defaultValues)
      getExpenseCategories().then(setCategories)
    }
  }, [open, reset])

  // One-off expenses are always one-time; force it whenever the type changes to
  // one-off so the (disabled) frequency field carries the right value.
  const handleExpenseTypeChange = (value: string) => {
    setValue("expenseCategory", value, { shouldValidate: true })
    if (value === "one-off") {
      setValue("frequency", "one-time", { shouldValidate: true })
    }
  }

  const loadCategories = async () => {
    setCategories(await getExpenseCategories())
  }

  const selectedFrequency = FREQUENCIES.find((f) => f.value === frequency)

  const hasUnsavedChanges = () => {
    const v = getValues()
    return (
      v.name !== "" || v.category !== "" || v.amount !== "" || v.notes !== ""
    )
  }

  const handleClose = (openState: boolean) => {
    if (!openState && hasUnsavedChanges()) {
      setShowUnsavedWarning(true)
    } else {
      onOpenChange(openState)
    }
  }

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false)
    reset(defaultValues)
    onOpenChange(false)
  }

  const onSubmit = async (values: ExpenseFormValues) => {
    const isRecurring = values.expenseCategory === "current-recurring"
    const frequency =
      values.expenseCategory === "one-off" ? "one-time" : values.frequency
    try {
      await addExpense({
        name: values.name,
        category: values.category,
        expenseCategory: values.expenseCategory,
        amount: parseFloat(values.amount),
        frequency,
        customMonths:
          frequency === "custom"
            ? JSON.stringify(values.selectedMonths)
            : undefined,
        startDate: isRecurring
          ? null
          : values.startDate
            ? format(values.startDate, "yyyy-MM-dd")
            : null,
        endDate: isRecurring
          ? null
          : values.endDate
            ? format(values.endDate, "yyyy-MM-dd")
            : null,
        description: values.notes || undefined
      })
      reset(defaultValues)
      onExpenseAdded()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to add expense:", error)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Add Expense
              <Info className="text-muted-foreground size-4" />
            </DialogTitle>
            <DialogDescription>
              Add a new expense to track your spending.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
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
                <Controller
                  control={control}
                  name="expenseCategory"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={handleExpenseTypeChange}>
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
                  )}
                />
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
                        {...register("name")}
                      />
                    </Field>
                    <Field label="Category" htmlFor="category" required>
                      <Controller
                        control={control}
                        name="category"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}>
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
                        )}
                      />
                      <ExpenseCategoryManagerPopover
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
                        min="0"
                        step="0.01"
                        {...register("amount")}
                      />
                    </Field>
                    <Field
                      label="Expense Frequency"
                      htmlFor="frequency"
                      required
                      helper={selectedFrequency?.description}>
                      <Controller
                        control={control}
                        name="frequency"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
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
                        )}
                      />
                    </Field>
                  </div>

                  {/* Custom Month Selector */}
                  {frequency === "custom" && (
                    <Field label="Select Months" required>
                      <Controller
                        control={control}
                        name="selectedMonths"
                        render={({ field }) => (
                          <>
                            <div className="grid grid-cols-6 gap-2">
                              {MONTHS.map((month) => (
                                <Button
                                  key={month.value}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    field.onChange(
                                      field.value.includes(month.value)
                                        ? field.value.filter(
                                            (m) => m !== month.value
                                          )
                                        : [...field.value, month.value].sort(
                                            (a, b) => a - b
                                          )
                                    )
                                  }
                                  className={cn(
                                    "h-10 font-medium",
                                    field.value.includes(month.value)
                                      ? "border-black bg-black text-white hover:bg-black/90"
                                      : "bg-card hover:bg-muted"
                                  )}>
                                  {month.label}
                                </Button>
                              ))}
                            </div>
                            <p className="text-muted-foreground text-sm">
                              Selected:{" "}
                              {field.value.length > 0
                                ? field.value
                                    .map((m) => MONTH_NAMES[m - 1])
                                    .join(", ")
                                : "None"}
                            </p>
                          </>
                        )}
                      />
                    </Field>
                  )}

                  {/* Row 3: Start Date and End Date - only for non-recurring */}
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
                        <Controller
                          control={control}
                          name="startDate"
                          render={({ field }) => (
                            <DatePicker
                              id="start-date"
                              value={field.value}
                              onChange={field.onChange}
                              triggerClassName="w-full touch-manipulation"
                            />
                          )}
                        />
                      </Field>
                      {expenseCategory !== "one-off" && (
                        <Field
                          label="End Date"
                          htmlFor="end-date"
                          helper="Leave empty for ongoing expense">
                          <Controller
                            control={control}
                            name="endDate"
                            render={({ field }) => (
                              <DatePicker
                                id="end-date"
                                value={field.value}
                                onChange={field.onChange}
                                triggerClassName="w-full touch-manipulation"
                              />
                            )}
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
                      rows={3}
                      {...register("notes")}
                    />
                  </Field>
                </div>
              )}
            </DialogBody>

            {/* Footer */}
            <DialogFooterSticky>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleClose(false)}
                disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isValid || isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Expense"}
              </Button>
            </DialogFooterSticky>
          </form>
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
