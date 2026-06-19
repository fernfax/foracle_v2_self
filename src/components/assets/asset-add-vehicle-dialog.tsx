"use client"

import { useEffect, useMemo, useState } from "react"
import {
  createVehicleAsset,
  updateVehicleAsset
} from "@/actions/vehicle-assets"
import { zodResolver } from "@hookform/resolvers/zod"
import { differenceInMonths, format } from "date-fns"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import type { VehicleAsset } from "@/db/types"
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
import { Switch } from "@/components/ui/switch"

// Form-layer schema (string money/tenure inputs + Date pickers). Distinct from
// the drizzle-zod service schema; onSubmit maps to the action's number shape.
const vehicleFormSchema = z.object({
  vehicleName: z.string().trim().min(1, "Vehicle name is required").max(255),
  purchaseDate: z.date({ message: "Purchase date is required" }),
  coeExpiryDate: z.date().optional(),
  originalPurchasePrice: z
    .string()
    .min(1, "Purchase price is required")
    .refine((v) => parseFloat(v) > 0, "Must be greater than 0"),
  loanAmountTaken: z.string().optional(),
  loanInterestRate: z.string().optional(),
  loanTenureYears: z.string().optional(),
  loanTenureMonths: z.string().optional(),
  loanAmountRepaid: z.string().optional(),
  monthlyLoanPayment: z.string().optional(),
  addToExpenditures: z.boolean(),
  expenseName: z.string().optional()
})
type VehicleFormValues = z.infer<typeof vehicleFormSchema>

const toFormValues = (v?: VehicleAsset | null): VehicleFormValues => ({
  vehicleName: v?.vehicleName ?? "",
  purchaseDate: v?.purchaseDate
    ? new Date(v.purchaseDate)
    : (undefined as unknown as Date),
  coeExpiryDate: v?.coeExpiryDate ? new Date(v.coeExpiryDate) : undefined,
  originalPurchasePrice: v?.originalPurchasePrice ?? "",
  loanAmountTaken: v?.loanAmountTaken ?? "",
  loanInterestRate: v?.loanInterestRate ?? "",
  loanTenureYears: v?.loanTenureYears != null ? String(v.loanTenureYears) : "",
  loanTenureMonths:
    v?.loanTenureMonths != null ? String(v.loanTenureMonths) : "",
  loanAmountRepaid: v?.loanAmountRepaid ?? "",
  monthlyLoanPayment: v?.monthlyLoanPayment ?? "",
  addToExpenditures: !!v?.linkedExpenseId,
  expenseName: ""
})

const num = (s?: string) => parseFloat(s ?? "") || 0
const int = (s?: string) => parseInt(s ?? "") || 0

interface AddVehicleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle?: VehicleAsset | null
  onSuccess?: () => void
}

export function AssetAddVehicleDialog({
  open,
  onOpenChange,
  vehicle,
  onSuccess
}: AddVehicleDialogProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: toFormValues(vehicle)
  })

  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false)
  const [toggleError, setToggleError] = useState("")

  useEffect(() => {
    if (open) reset(toFormValues(vehicle))
  }, [open, vehicle, reset])

  const vehicleName = useWatch({ control, name: "vehicleName" })
  const purchaseDate = useWatch({ control, name: "purchaseDate" })
  const coeExpiryDate = useWatch({ control, name: "coeExpiryDate" })
  const originalPurchasePrice = useWatch({
    control,
    name: "originalPurchasePrice"
  })
  const loanAmountTaken = useWatch({ control, name: "loanAmountTaken" })
  const loanInterestRate = useWatch({ control, name: "loanInterestRate" })
  const loanTenureYears = useWatch({ control, name: "loanTenureYears" })
  const loanTenureMonths = useWatch({ control, name: "loanTenureMonths" })
  const loanAmountRepaid = useWatch({ control, name: "loanAmountRepaid" })
  const monthlyLoanPayment = useWatch({ control, name: "monthlyLoanPayment" })
  const addToExpenditures = useWatch({ control, name: "addToExpenditures" })

  // Flat-rate outstanding loan: P × (n − k) / n (SG banks use flat rate).
  const { outstandingLoan, outstandingLoanMethod } = useMemo(() => {
    const principal = num(loanAmountTaken)
    const totalMonths = int(loanTenureYears) * 12 + int(loanTenureMonths)
    if (principal > 0 && totalMonths > 0 && purchaseDate) {
      const monthsElapsed = Math.max(
        0,
        differenceInMonths(new Date(), purchaseDate)
      )
      const k = Math.min(monthsElapsed, totalMonths)
      return {
        outstandingLoan: Math.max(
          0,
          (principal * (totalMonths - k)) / totalMonths
        ),
        outstandingLoanMethod: "flat" as const
      }
    }
    return {
      outstandingLoan: Math.max(0, principal - num(loanAmountRepaid)),
      outstandingLoanMethod: "simple" as const
    }
  }, [
    loanAmountTaken,
    loanTenureYears,
    loanTenureMonths,
    purchaseDate,
    loanAmountRepaid
  ])

  // Suggested monthly: (P + P × rate × years) / totalMonths.
  const suggestedMonthlyPayment = useMemo(() => {
    const principal = num(loanAmountTaken)
    const rate = num(loanInterestRate)
    const totalMonths = int(loanTenureYears) * 12 + int(loanTenureMonths)
    if (principal > 0 && rate > 0 && totalMonths > 0) {
      const years = totalMonths / 12
      return (principal + principal * (rate / 100) * years) / totalMonths
    }
    return null
  }, [loanAmountTaken, loanInterestRate, loanTenureYears, loanTenureMonths])

  const masWarning = useMemo(() => {
    const principal = num(loanAmountTaken)
    const price = num(originalPurchasePrice)
    return principal > 0 && price > 0 && principal > price * 0.7
  }, [loanAmountTaken, originalPurchasePrice])

  const coeOverlapWarning = useMemo(() => {
    if (!purchaseDate || !coeExpiryDate) return false
    const totalMonths = int(loanTenureYears) * 12 + int(loanTenureMonths)
    if (totalMonths === 0) return false
    const loanEndDate = new Date(purchaseDate)
    loanEndDate.setMonth(loanEndDate.getMonth() + totalMonths)
    return loanEndDate > coeExpiryDate
  }, [purchaseDate, coeExpiryDate, loanTenureYears, loanTenureMonths])

  const tenureWarning = useMemo(
    () => int(loanTenureYears) * 12 + int(loanTenureMonths) > 84,
    [loanTenureYears, loanTenureMonths]
  )

  const handleToggleChange = (checked: boolean) => {
    if (!checked) {
      setValue("addToExpenditures", false)
      return
    }
    if (!getValues("purchaseDate") || !getValues("monthlyLoanPayment")) {
      setToggleError(
        "Please fill in Purchase Date and Monthly Loan Payment before adding to expenses."
      )
      return
    }
    setToggleError("")
    if (!getValues("expenseName")) {
      setValue(
        "expenseName",
        vehicleName ? `${vehicleName} - Loan Payment` : "Vehicle Loan Payment"
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

  const onSubmit = async (values: VehicleFormValues) => {
    const data = {
      vehicleName: values.vehicleName,
      purchaseDate: format(values.purchaseDate, "yyyy-MM-dd"),
      coeExpiryDate: values.coeExpiryDate
        ? format(values.coeExpiryDate, "yyyy-MM-dd")
        : undefined,
      originalPurchasePrice: parseFloat(values.originalPurchasePrice),
      loanAmountTaken: values.loanAmountTaken
        ? parseFloat(values.loanAmountTaken)
        : undefined,
      loanInterestRate: values.loanInterestRate
        ? parseFloat(values.loanInterestRate)
        : undefined,
      loanTenureYears: values.loanTenureYears
        ? parseInt(values.loanTenureYears)
        : undefined,
      loanTenureMonths: values.loanTenureMonths
        ? parseInt(values.loanTenureMonths)
        : undefined,
      loanAmountRepaid: values.loanAmountRepaid
        ? parseFloat(values.loanAmountRepaid)
        : undefined,
      monthlyLoanPayment: values.monthlyLoanPayment
        ? parseFloat(values.monthlyLoanPayment)
        : undefined,
      addToExpenditures: values.addToExpenditures,
      expenseName: values.addToExpenditures ? values.expenseName : undefined
    }
    try {
      if (vehicle) {
        await updateVehicleAsset(vehicle.id, data)
      } else {
        await createVehicleAsset(data)
      }
      handleClose(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save vehicle:", error)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {vehicle ? "Edit Vehicle" : "Add Vehicle"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              <div className="space-y-6 py-4">
                {/* Vehicle Information */}
                <div className="space-y-4">
                  <div className="border-border border-b pb-3">
                    <h3 className="text-foreground text-sm font-semibold">
                      Vehicle Information
                    </h3>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Vehicle Name"
                        htmlFor="vehicleName"
                        required
                        error={errors.vehicleName?.message}>
                        <Input
                          id="vehicleName"
                          placeholder="e.g. Honda Vezel"
                          aria-required="true"
                          {...register("vehicleName")}
                        />
                      </Field>
                      <Field
                        label="Purchase Date"
                        htmlFor="purchaseDate"
                        required
                        error={errors.purchaseDate?.message}>
                        <Controller
                          control={control}
                          name="purchaseDate"
                          render={({ field }) => (
                            <DatePicker
                              id="purchaseDate"
                              value={field.value}
                              onChange={field.onChange}
                              displayFormat="dd/MM/yyyy"
                              placeholder="Select date"
                              disableFuture
                            />
                          )}
                        />
                      </Field>
                    </div>
                    <div className="mt-4">
                      <Field
                        label="COE Expiry Date"
                        htmlFor="coeExpiryDate"
                        helper="Certificate of Entitlement expiry date (Singapore)">
                        <Controller
                          control={control}
                          name="coeExpiryDate"
                          render={({ field }) => (
                            <DatePicker
                              id="coeExpiryDate"
                              value={field.value}
                              onChange={field.onChange}
                              displayFormat="dd/MM/yyyy"
                              placeholder="Select date"
                            />
                          )}
                        />
                      </Field>
                    </div>
                  </div>
                </div>

                {/* Purchase Details */}
                <div className="space-y-4">
                  <div className="border-border border-b pb-3">
                    <h3 className="text-foreground text-sm font-semibold">
                      Purchase Details
                    </h3>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Original Purchase Price"
                        htmlFor="originalPurchasePrice"
                        required
                        error={errors.originalPurchasePrice?.message}>
                        <Controller
                          control={control}
                          name="originalPurchasePrice"
                          render={({ field }) => (
                            <MoneyInput
                              id="originalPurchasePrice"
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
                        label="Loan Amount Taken"
                        htmlFor="loanAmountTaken">
                        <Controller
                          control={control}
                          name="loanAmountTaken"
                          render={({ field }) => (
                            <MoneyInput
                              id="loanAmountTaken"
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
                        {masWarning && (
                          <p className="text-on-warning text-xs">
                            Exceeds MAS cap of 70% of purchase price
                          </p>
                        )}
                      </Field>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <Field
                        label="Flat Interest Rate (%)"
                        htmlFor="loanInterestRate"
                        helper="Flat rate p.a. as quoted by your bank">
                        <Controller
                          control={control}
                          name="loanInterestRate"
                          render={({ field }) => (
                            <MoneyInput
                              symbol="%"
                              side="suffix"
                              id="loanInterestRate"
                              type="number"
                              placeholder="e.g. 2.68"
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
                        label="Loan Tenure"
                        helper={
                          tenureWarning || coeOverlapWarning
                            ? undefined
                            : "Max 7 years (MAS)"
                        }>
                        <div className="flex gap-2">
                          <Controller
                            control={control}
                            name="loanTenureYears"
                            render={({ field }) => (
                              <MoneyInput
                                symbol="yr"
                                side="suffix"
                                id="loanTenureYears"
                                type="number"
                                placeholder="0"
                                min="0"
                                max="7"
                                step="1"
                                className="flex-1"
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value)}
                                onBlur={field.onBlur}
                              />
                            )}
                          />
                          <Controller
                            control={control}
                            name="loanTenureMonths"
                            render={({ field }) => (
                              <MoneyInput
                                symbol="mo"
                                side="suffix"
                                id="loanTenureMonths"
                                type="number"
                                placeholder="0"
                                min="0"
                                max="11"
                                step="1"
                                className="flex-1"
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value)}
                                onBlur={field.onBlur}
                              />
                            )}
                          />
                        </div>
                        {tenureWarning ? (
                          <p className="text-on-warning text-xs">
                            MAS caps car loans at 7 years
                          </p>
                        ) : coeOverlapWarning ? (
                          <p className="text-on-warning text-xs">
                            Loan tenure extends past COE expiry date
                          </p>
                        ) : null}
                      </Field>
                    </div>
                  </div>
                </div>

                {/* Loan Repayment */}
                <div className="space-y-4">
                  <div className="border-border border-b pb-3">
                    <h3 className="text-foreground text-sm font-semibold">
                      Loan Repayment
                    </h3>
                  </div>
                  <div className="bg-muted space-y-4 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Loan Amount Repaid"
                        htmlFor="loanAmountRepaid">
                        <Controller
                          control={control}
                          name="loanAmountRepaid"
                          render={({ field }) => (
                            <MoneyInput
                              id="loanAmountRepaid"
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
                        label="Outstanding Loan"
                        htmlFor="outstandingLoan"
                        helper={
                          outstandingLoanMethod === "flat"
                            ? "Flat rate: principal reduces linearly over tenure"
                            : "Calculated as: Loan Amount Taken − Loan Amount Repaid"
                        }>
                        <MoneyInput
                          id="outstandingLoan"
                          type="number"
                          value={outstandingLoan.toFixed(2)}
                          disabled
                          className="bg-muted"
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Monthly Loan Payment"
                        htmlFor="monthlyLoanPayment">
                        <Controller
                          control={control}
                          name="monthlyLoanPayment"
                          render={({ field }) => (
                            <MoneyInput
                              id="monthlyLoanPayment"
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
                        {suggestedMonthlyPayment !== null && (
                          <p className="text-muted-foreground text-xs">
                            Suggested:{" "}
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="text-on-success h-auto p-0"
                              onClick={() =>
                                setValue(
                                  "monthlyLoanPayment",
                                  suggestedMonthlyPayment.toFixed(2)
                                )
                              }>
                              ${suggestedMonthlyPayment.toFixed(2)}
                            </Button>{" "}
                            (from flat rate)
                          </p>
                        )}
                      </Field>
                    </div>
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
                          Enable this to automatically track this vehicle&apos;s
                          monthly loan payment as a recurring expenditure
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

            <DialogFooterSticky>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleClose(false)}
                disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : vehicle
                    ? "Update Vehicle"
                    : "Add Vehicle"}
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
              <div className="text-foreground">Vehicle:</div>
              <div className="font-medium">{vehicleName || "-"}</div>

              <div className="text-foreground">Monthly Payment:</div>
              <div className="font-medium">
                $
                {monthlyLoanPayment
                  ? parseFloat(monthlyLoanPayment).toLocaleString()
                  : "0"}
              </div>

              <div className="text-foreground">Frequency:</div>
              <div className="font-medium">Monthly</div>

              <div className="text-foreground">Start Date:</div>
              <div className="font-medium">
                {purchaseDate ? format(purchaseDate, "MMMM d, yyyy") : "-"}
              </div>
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
