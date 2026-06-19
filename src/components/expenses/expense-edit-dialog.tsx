"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  getExpenseCategories,
  type ExpenseCategory
} from "@/actions/expense-categories"
import { updateExpense } from "@/actions/expenses"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { cn } from "@/lib/utils"
import type { Expense } from "@/db/types"
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
    linkHref: (expense: Expense) => `/policies?edit=${expense.linkedPolicyId}`
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
    linkHref: () => `/assets/property`
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
    linkHref: () => `/assets/vehicle`
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
    linkHref: () => `/goals/active`
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

// Form-layer schema. Required fields + the conditional custom-months and
// non-recurring start-date rules reproduce the original disabled-submit gate via
// mode:"onChange" + isValid.
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
    if (
      v.frequency.toLowerCase() === "custom" &&
      v.selectedMonths.length === 0
    ) {
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

const blankValues: ExpenseFormValues = {
  expenseCategory: "current-recurring",
  name: "",
  category: "",
  amount: "",
  frequency: "monthly",
  selectedMonths: [],
  startDate: undefined,
  endDate: undefined,
  notes: ""
}

function toFormValues(expense: Expense): ExpenseFormValues {
  let selectedMonths: number[] = []
  if (expense.customMonths) {
    try {
      const parsed = JSON.parse(expense.customMonths)
      selectedMonths = Array.isArray(parsed) ? parsed : []
    } catch {
      selectedMonths = []
    }
  }
  return {
    expenseCategory: expense.expenseCategory || "current-recurring",
    name: expense.name,
    category: expense.category,
    amount: expense.amount,
    frequency: expense.frequency,
    selectedMonths,
    startDate: expense.startDate
      ? parse(expense.startDate, "yyyy-MM-dd", new Date())
      : undefined,
    endDate: expense.endDate
      ? parse(expense.endDate, "yyyy-MM-dd", new Date())
      : undefined,
    notes: expense.description || ""
  }
}

export function ExpenseEditDialog({
  open,
  onOpenChange,
  expense,
  onExpenseUpdated
}: EditExpenseDialogProps) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isValid, isDirty, isSubmitting }
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    mode: "onChange",
    defaultValues: blankValues
  })

  const expenseCategory = useWatch({ control, name: "expenseCategory" })
  const frequency = useWatch({ control, name: "frequency" })

  // Check if this expense is linked to any integration
  const integrationType = getIntegrationType(expense)
  const isLinked = integrationType !== null
  const config = integrationType ? integrationConfig[integrationType] : null

  // Load categories and hydrate the form when the dialog opens
  useEffect(() => {
    if (open) {
      getExpenseCategories().then(setCategories)
      if (expense) reset(toFormValues(expense))
    }
  }, [open, expense, reset])

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

  const handleClose = (openState: boolean) => {
    if (!openState && isDirty && !isLinked) {
      setShowUnsavedWarning(true)
    } else {
      onOpenChange(openState)
    }
  }

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false)
    if (expense) reset(toFormValues(expense))
    onOpenChange(false)
  }

  const onSubmit = async (values: ExpenseFormValues) => {
    if (!expense) return
    const isRecurring = values.expenseCategory === "current-recurring"
    const frequency =
      values.expenseCategory === "one-off" ? "one-time" : values.frequency
    try {
      const updatedExpense = await updateExpense(expense.id, {
        name: values.name,
        category: values.category,
        expenseCategory: values.expenseCategory,
        amount: parseFloat(values.amount),
        frequency,
        customMonths:
          frequency === "custom" ? JSON.stringify(values.selectedMonths) : null,
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
      onExpenseUpdated(updatedExpense)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update expense:", error)
    }
  }

  const inheritedHelper = "Inherited from insurance policy"

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

          <form onSubmit={handleSubmit(onSubmit)}>
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
                    ? inheritedHelper
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
                <Controller
                  control={control}
                  name="expenseCategory"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={
                        isLinked ? undefined : handleExpenseTypeChange
                      }
                      disabled={isLinked}>
                      <SelectTrigger
                        id="edit-expense-type"
                        aria-required="true"
                        className={cn(
                          isLinked && "bg-muted cursor-not-allowed"
                        )}>
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
                      helper={isLinked ? inheritedHelper : undefined}>
                      <Input
                        id="edit-name"
                        aria-required="true"
                        placeholder="e.g., Rent, Groceries"
                        className={cn(
                          isLinked && "bg-muted cursor-not-allowed"
                        )}
                        disabled={isLinked}
                        {...register("name")}
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
                      helper={isLinked ? inheritedHelper : undefined}>
                      <Controller
                        control={control}
                        name="category"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={
                              isLinked ? undefined : field.onChange
                            }
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
                        )}
                      />
                      {!isLinked && (
                        <ExpenseCategoryManagerPopover
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
                      helper={isLinked ? inheritedHelper : undefined}>
                      <Input
                        id="edit-amount"
                        aria-required="true"
                        type="number"
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className={cn(
                          isLinked && "bg-muted cursor-not-allowed"
                        )}
                        disabled={isLinked}
                        {...register("amount")}
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
                          ? inheritedHelper
                          : selectedFrequency?.description
                      }>
                      <Controller
                        control={control}
                        name="frequency"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={
                              isLinked || expenseCategory === "one-off"
                                ? undefined
                                : field.onChange
                            }
                            disabled={
                              isLinked || expenseCategory === "one-off"
                            }>
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
                        )}
                      />
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
                      helper={isLinked ? inheritedHelper : undefined}>
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
                                  disabled={isLinked}
                                  onClick={() =>
                                    !isLinked &&
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
                                      : "bg-card hover:bg-muted",
                                    isLinked && "cursor-not-allowed opacity-70"
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
                        helper={isLinked ? inheritedHelper : undefined}>
                        <Controller
                          control={control}
                          name="startDate"
                          render={({ field }) =>
                            isLinked ? (
                              <Button
                                variant="outline"
                                disabled
                                className="bg-muted w-full cursor-not-allowed justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value
                                  ? format(field.value, "MMMM do, yyyy")
                                  : "Pick a date"}
                              </Button>
                            ) : (
                              <DatePicker
                                id="edit-start-date"
                                value={field.value}
                                onChange={field.onChange}
                                triggerClassName="w-full touch-manipulation"
                              />
                            )
                          }
                        />
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
                              ? inheritedHelper
                              : "Leave empty for ongoing expense"
                          }>
                          <Controller
                            control={control}
                            name="endDate"
                            render={({ field }) =>
                              isLinked ? (
                                <Button
                                  variant="outline"
                                  disabled
                                  className="bg-muted w-full cursor-not-allowed justify-start text-left font-normal">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value
                                    ? format(field.value, "MMMM do, yyyy")
                                    : "No end date"}
                                </Button>
                              ) : (
                                <DatePicker
                                  id="edit-end-date"
                                  value={field.value}
                                  onChange={field.onChange}
                                  triggerClassName="w-full touch-manipulation"
                                />
                              )
                            }
                          />
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
                      rows={3}
                      {...register("notes")}
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
                  <Button type="button" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleClose(false)}
                    disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!isValid || isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              )}
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
