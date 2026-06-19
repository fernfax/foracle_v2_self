"use client"

import { useEffect, useMemo, useState } from "react"
import { createGoal, updateGoal } from "@/actions/goals"
import { zodResolver } from "@hookform/resolvers/zod"
import { differenceInMonths, format } from "date-fns"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import type { Goal } from "@/db/types"
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
  DialogFooterSticky,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoneyInput } from "@/components/ui/money-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

// Form-layer schema: validates what the inputs hold (money fields are strings
// from MoneyInput, targetDate is a Date from DatePicker). Distinct from the
// drizzle-zod service schema in lib/api-schemas/goals.ts, which validates the
// string-based server payload. onSubmit maps these values to the action input.
const goalFormSchema = z.object({
  goalName: z.string().trim().min(1, "Goal name is required").max(255),
  goalType: z.enum(["primary", "secondary"]),
  targetAmount: z
    .string()
    .min(1, "Target amount is required")
    .refine((v) => parseFloat(v) > 0, "Must be greater than 0"),
  targetDate: z.date({ message: "Target date is required" }),
  currentAmountSaved: z.string().optional(),
  monthlyContribution: z.string().optional(),
  description: z.string().max(1000).optional(),
  addToExpenditures: z.boolean(),
  expenseName: z.string().optional()
})
type GoalFormValues = z.infer<typeof goalFormSchema>

const toFormValues = (goal?: Goal | null): GoalFormValues => ({
  goalName: goal?.goalName ?? "",
  goalType: (goal?.goalType as "primary" | "secondary") ?? "primary",
  targetAmount: goal?.targetAmount ?? "",
  // undefined until picked; the schema flags it on submit.
  targetDate: goal?.targetDate
    ? new Date(goal.targetDate)
    : (undefined as unknown as Date),
  currentAmountSaved: goal?.currentAmountSaved ?? "",
  monthlyContribution: goal?.monthlyContribution ?? "",
  description: goal?.description ?? "",
  addToExpenditures: !!goal?.linkedExpenseId,
  expenseName: ""
})

interface AddGoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: Goal | null
  onSuccess?: () => void
}

export function GoalAddDialog({
  open,
  onOpenChange,
  goal,
  onSuccess
}: AddGoalDialogProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: toFormValues(goal)
  })

  // Confirmation modal for the "add to expenditures" flow (UX gate, not a field).
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false)
  const [toggleError, setToggleError] = useState("")

  // Re-hydrate on edit / reopen.
  useEffect(() => {
    if (open) reset(toFormValues(goal))
  }, [open, goal, reset])

  const targetAmount = useWatch({ control, name: "targetAmount" })
  const currentAmountSaved = useWatch({ control, name: "currentAmountSaved" })
  const monthlyContribution = useWatch({ control, name: "monthlyContribution" })
  const targetDate = useWatch({ control, name: "targetDate" })
  const goalName = useWatch({ control, name: "goalName" })
  const addToExpenditures = useWatch({ control, name: "addToExpenditures" })

  const monthsUntilTarget = useMemo(() => {
    if (!targetDate) return 0
    return Math.max(0, differenceInMonths(targetDate, new Date()))
  }, [targetDate])

  const suggestedMonthlyContribution = useMemo(() => {
    const remaining =
      (parseFloat(targetAmount) || 0) -
      (parseFloat(currentAmountSaved ?? "") || 0)
    if (monthsUntilTarget <= 0 || remaining <= 0) return 0
    return remaining / monthsUntilTarget
  }, [targetAmount, currentAmountSaved, monthsUntilTarget])

  const projectedCompletion = useMemo(() => {
    const remaining =
      (parseFloat(targetAmount) || 0) -
      (parseFloat(currentAmountSaved ?? "") || 0)
    const monthly = parseFloat(monthlyContribution ?? "") || 0
    if (monthly <= 0 || remaining <= 0) return null
    const monthsNeeded = Math.ceil(remaining / monthly)
    const date = new Date()
    date.setMonth(date.getMonth() + monthsNeeded)
    return date
  }, [targetAmount, currentAmountSaved, monthlyContribution])

  // Switching ON requires a monthly contribution and a confirmation; switching
  // OFF is immediate. The switch only commits to `true` after confirmation.
  const handleToggleChange = (checked: boolean) => {
    if (!checked) {
      setValue("addToExpenditures", false)
      return
    }
    const monthly = parseFloat(getValues("monthlyContribution") || "")
    if (!monthly || monthly <= 0) {
      setToggleError(
        "Please set a monthly contribution amount before adding to expenses."
      )
      return
    }
    setToggleError("")
    if (!getValues("expenseName")) {
      setValue(
        "expenseName",
        goalName ? `${goalName} - Monthly Savings` : "Goal Savings"
      )
    }
    setConfirmationModalOpen(true)
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      reset(toFormValues(null))
      setToggleError("")
      setConfirmationModalOpen(false)
    }
    onOpenChange(isOpen)
  }

  const onSubmit = async (values: GoalFormValues) => {
    const payload = {
      goalName: values.goalName,
      goalType: values.goalType,
      targetAmount: parseFloat(values.targetAmount),
      targetDate: format(values.targetDate, "yyyy-MM-dd"),
      currentAmountSaved: values.currentAmountSaved
        ? parseFloat(values.currentAmountSaved)
        : undefined,
      monthlyContribution: values.monthlyContribution
        ? parseFloat(values.monthlyContribution)
        : undefined,
      description: values.description || undefined,
      addToExpenditures: values.addToExpenditures,
      expenseName: values.addToExpenditures ? values.expenseName : undefined
    }
    try {
      if (goal) {
        await updateGoal(goal.id, payload)
      } else {
        await createGoal(payload)
      }
      handleClose(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save goal:", error)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle>{goal ? "Edit Goal" : "Add Goal"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              <div className="space-y-6 py-4">
                {/* Basic Details */}
                <div className="space-y-4">
                  <div className="border-border border-b pb-3">
                    <h3 className="text-foreground text-sm font-semibold">
                      Goal Details
                    </h3>
                  </div>
                  <div className="bg-muted space-y-4 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Goal Name"
                        htmlFor="goalName"
                        required
                        error={errors.goalName?.message}>
                        <Input
                          id="goalName"
                          placeholder="e.g. Emergency Fund, Vacation, House Down Payment"
                          aria-required="true"
                          {...register("goalName")}
                        />
                      </Field>
                      <Field label="Goal Type" htmlFor="goalType" required>
                        <Controller
                          control={control}
                          name="goalType"
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}>
                              <SelectTrigger id="goalType" aria-required="true">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="primary">Primary</SelectItem>
                                <SelectItem value="secondary">
                                  Secondary
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Target Amount"
                        htmlFor="targetAmount"
                        required
                        error={errors.targetAmount?.message}>
                        <Controller
                          control={control}
                          name="targetAmount"
                          render={({ field }) => (
                            <MoneyInput
                              id="targetAmount"
                              type="number"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              aria-required="true"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              onBlur={field.onBlur}
                            />
                          )}
                        />
                      </Field>
                      <Field
                        label="Target Date"
                        htmlFor="targetDate"
                        required
                        error={errors.targetDate?.message}
                        helper={
                          monthsUntilTarget > 0
                            ? `${monthsUntilTarget} months until target date`
                            : undefined
                        }>
                        <Controller
                          control={control}
                          name="targetDate"
                          render={({ field }) => (
                            <DatePicker
                              value={field.value}
                              onChange={field.onChange}
                              id="targetDate"
                              displayFormat="dd/MM/yyyy"
                              placeholder="Select date"
                              disablePast
                            />
                          )}
                        />
                      </Field>
                    </div>

                    <Field label="Description" htmlFor="description" optional>
                      <Textarea
                        id="description"
                        placeholder="Add any notes or details about this goal..."
                        className="resize-none"
                        rows={2}
                        {...register("description")}
                      />
                    </Field>
                  </div>
                </div>

                {/* Progress Tracking */}
                <div className="space-y-4">
                  <div className="border-border border-b pb-3">
                    <h3 className="text-foreground text-sm font-semibold">
                      Progress Tracking
                    </h3>
                  </div>
                  <div className="bg-muted space-y-4 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Current Amount Saved"
                        htmlFor="currentAmountSaved"
                        helper="How much have you already saved?">
                        <Controller
                          control={control}
                          name="currentAmountSaved"
                          render={({ field }) => (
                            <MoneyInput
                              id="currentAmountSaved"
                              type="number"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value)}
                              onBlur={field.onBlur}
                            />
                          )}
                        />
                      </Field>
                      <Field
                        label="Monthly Contribution"
                        htmlFor="monthlyContribution"
                        helper={
                          suggestedMonthlyContribution > 0
                            ? `Suggested: $${suggestedMonthlyContribution.toLocaleString(
                                undefined,
                                { maximumFractionDigits: 0 }
                              )}/month to reach target`
                            : undefined
                        }>
                        <Controller
                          control={control}
                          name="monthlyContribution"
                          render={({ field }) => (
                            <MoneyInput
                              id="monthlyContribution"
                              type="number"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value)}
                              onBlur={field.onBlur}
                            />
                          )}
                        />
                      </Field>
                    </div>

                    {projectedCompletion && (
                      <div className="border-brand-teal/[0.25] bg-brand-teal/[0.12] rounded-lg border p-3">
                        <p className="text-on-success text-sm">
                          At $
                          {parseFloat(
                            monthlyContribution || "0"
                          ).toLocaleString()}
                          /month, you&apos;ll reach your goal by{" "}
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
                  <div className="border-border border-b pb-3">
                    <h3 className="text-foreground text-sm font-semibold">
                      Expenditure Integration
                    </h3>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label
                          htmlFor="addToExpenditures"
                          className="text-foreground text-sm font-semibold">
                          Add to expenditures
                        </Label>
                        <p className="text-foreground/400 mt-1 text-xs">
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
                    {toggleError && (
                      <div className="text-on-danger bg-brand-alert-red/[0.12] mt-3 rounded p-2 text-sm">
                        {toggleError}
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : goal ? "Update Goal" : "Add Goal"}
              </Button>
            </DialogFooterSticky>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add to Expenditures Confirmation Modal */}
      <AlertDialog
        open={confirmationModalOpen}
        onOpenChange={setConfirmationModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add to Expenses</AlertDialogTitle>
            <AlertDialogDescription>
              This will create an expense entry with the following details:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4 space-y-4">
            <Field label="Expense Name" htmlFor="expenseName">
              <Input
                id="expenseName"
                placeholder="Enter expense name"
                className="w-full"
                {...register("expenseName")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-foreground">Goal:</div>
              <div className="font-medium">{goalName || "-"}</div>

              <div className="text-foreground">Monthly Contribution:</div>
              <div className="font-medium">
                $
                {monthlyContribution
                  ? parseFloat(monthlyContribution).toLocaleString()
                  : "0"}
              </div>

              <div className="text-foreground">Category:</div>
              <div className="font-medium">Savings</div>

              <div className="text-foreground">Frequency:</div>
              <div className="font-medium">Monthly</div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmationModalOpen(false)
                setValue("expenseName", "")
              }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setValue("addToExpenditures", true)
                setConfirmationModalOpen(false)
              }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
