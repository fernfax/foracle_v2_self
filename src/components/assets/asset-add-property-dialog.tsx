"use client"

import { useEffect, useMemo, useState } from "react"
import {
  createPropertyAsset,
  updatePropertyAsset
} from "@/actions/property-assets"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import type { PropertyAsset } from "@/db/types"
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

const propertyFormSchema = z.object({
  propertyName: z.string().trim().min(1, "Property name is required").max(255),
  purchaseDate: z.date({ message: "Purchase date is required" }),
  originalPurchasePrice: z
    .string()
    .min(1, "Purchase price is required")
    .refine((v) => parseFloat(v) > 0, "Must be greater than 0"),
  loanAmountTaken: z.string().optional(),
  outstandingLoan: z.string().min(1, "Outstanding loan is required"),
  monthlyLoanPayment: z.string().min(1, "Monthly payment is required"),
  interestRate: z.string().min(1, "Interest rate is required"),
  principalCpfWithdrawn: z.string().optional(),
  housingGrantTaken: z.string().optional(),
  accruedInterestToDate: z.string().optional(),
  paidByCpf: z.boolean(),
  addToExpenditures: z.boolean(),
  expenseName: z.string().optional(),
  expenditureAmount: z.string().optional()
})
type PropertyFormValues = z.infer<typeof propertyFormSchema>

const toFormValues = (p?: PropertyAsset | null): PropertyFormValues => ({
  propertyName: p?.propertyName ?? "",
  purchaseDate: p?.purchaseDate
    ? new Date(p.purchaseDate)
    : (undefined as unknown as Date),
  originalPurchasePrice: p?.originalPurchasePrice ?? "",
  loanAmountTaken: p?.loanAmountTaken ?? "",
  outstandingLoan: p?.outstandingLoan ?? "",
  monthlyLoanPayment: p?.monthlyLoanPayment ?? "",
  interestRate: p?.interestRate ?? "",
  principalCpfWithdrawn: p?.principalCpfWithdrawn ?? "",
  housingGrantTaken: p?.housingGrantTaken ?? "",
  accruedInterestToDate: p?.accruedInterestToDate ?? "",
  paidByCpf: !!p?.paidByCpf,
  addToExpenditures: !!p?.linkedExpenseId,
  expenseName: "",
  expenditureAmount: ""
})

const num = (s?: string) => parseFloat(s ?? "") || 0

interface AddPropertyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  property?: PropertyAsset | null
  onSuccess?: () => void
}

export function AssetAddPropertyDialog({
  open,
  onOpenChange,
  property,
  onSuccess
}: AddPropertyDialogProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: toFormValues(property)
  })

  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false)
  const [toggleError, setToggleError] = useState("")

  useEffect(() => {
    if (open) reset(toFormValues(property))
  }, [open, property, reset])

  const propertyName = useWatch({ control, name: "propertyName" })
  const purchaseDate = useWatch({ control, name: "purchaseDate" })
  const loanAmountTaken = useWatch({ control, name: "loanAmountTaken" })
  const outstandingLoan = useWatch({ control, name: "outstandingLoan" })
  const monthlyLoanPayment = useWatch({ control, name: "monthlyLoanPayment" })
  const interestRate = useWatch({ control, name: "interestRate" })
  const principalCpfWithdrawn = useWatch({
    control,
    name: "principalCpfWithdrawn"
  })
  const housingGrantTaken = useWatch({ control, name: "housingGrantTaken" })
  const accruedInterestToDate = useWatch({
    control,
    name: "accruedInterestToDate"
  })
  const addToExpenditures = useWatch({ control, name: "addToExpenditures" })

  const loanAmountRepaid = useMemo(
    () => num(loanAmountTaken) - num(outstandingLoan),
    [loanAmountTaken, outstandingLoan]
  )
  const interestRepayment = useMemo(
    () => (num(outstandingLoan) * (num(interestRate) / 100)) / 12,
    [outstandingLoan, interestRate]
  )
  const principalRepayment = useMemo(
    () => num(monthlyLoanPayment) - interestRepayment,
    [monthlyLoanPayment, interestRepayment]
  )
  const amountToBeReturnedToCpf = useMemo(
    () =>
      num(principalCpfWithdrawn) +
      num(housingGrantTaken) +
      num(accruedInterestToDate),
    [principalCpfWithdrawn, housingGrantTaken, accruedInterestToDate]
  )

  const handleToggleChange = (checked: boolean) => {
    if (!checked) {
      setValue("addToExpenditures", false)
      return
    }
    const monthly = getValues("monthlyLoanPayment")
    if (!getValues("purchaseDate") || !monthly) {
      setToggleError(
        "Please fill in Purchase Date and Monthly Loan Payment before adding to expenses."
      )
      return
    }
    setToggleError("")
    if (!getValues("expenseName")) {
      setValue(
        "expenseName",
        propertyName
          ? `${propertyName} - Loan Payment`
          : "Property Loan Payment"
      )
    }
    setValue("expenditureAmount", monthly)
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

  const onSubmit = async (values: PropertyFormValues) => {
    const data = {
      propertyName: values.propertyName,
      purchaseDate: format(values.purchaseDate, "yyyy-MM-dd"),
      originalPurchasePrice: parseFloat(values.originalPurchasePrice),
      loanAmountTaken: values.loanAmountTaken
        ? parseFloat(values.loanAmountTaken)
        : undefined,
      outstandingLoan: parseFloat(values.outstandingLoan),
      monthlyLoanPayment: parseFloat(values.monthlyLoanPayment),
      interestRate: parseFloat(values.interestRate),
      principalCpfWithdrawn: values.principalCpfWithdrawn
        ? parseFloat(values.principalCpfWithdrawn)
        : undefined,
      housingGrantTaken: values.housingGrantTaken
        ? parseFloat(values.housingGrantTaken)
        : undefined,
      accruedInterestToDate: values.accruedInterestToDate
        ? parseFloat(values.accruedInterestToDate)
        : undefined,
      paidByCpf: values.paidByCpf,
      addToExpenditures: values.addToExpenditures,
      expenseName: values.addToExpenditures ? values.expenseName : undefined,
      expenditureAmount:
        values.addToExpenditures && values.expenditureAmount
          ? parseFloat(values.expenditureAmount)
          : undefined
    }
    try {
      if (property) {
        await updatePropertyAsset(property.id, data)
      } else {
        await createPropertyAsset(data)
      }
      handleClose(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save property:", error)
    }
  }

  const moneyField = (
    name: keyof PropertyFormValues,
    extra?: Record<string, unknown>
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <MoneyInput
          id={name}
          placeholder="0.00"
          min="0"
          step="0.01"
          value={(field.value as string) ?? ""}
          onChange={(e) => field.onChange(e.target.value)}
          onBlur={field.onBlur}
          {...extra}
        />
      )}
    />
  )

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {property ? "Edit Property" : "Add Property"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              <div className="space-y-6 py-4">
                {/* Property Information */}
                <div className="space-y-4">
                  <div className="border-border border-b pb-3">
                    <h3 className="text-foreground text-sm font-semibold">
                      Property Information
                    </h3>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Property Name"
                        htmlFor="propertyName"
                        required
                        error={errors.propertyName?.message}>
                        <Input
                          id="propertyName"
                          placeholder="e.g. Fernvale HDB"
                          aria-required="true"
                          {...register("propertyName")}
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
                        {moneyField("originalPurchasePrice", {
                          "aria-required": "true"
                        })}
                      </Field>
                      <Field
                        label="Loan Amount Taken"
                        htmlFor="loanAmountTaken">
                        {moneyField("loanAmountTaken")}
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
                        label="Outstanding Loan"
                        htmlFor="outstandingLoan"
                        required
                        error={errors.outstandingLoan?.message}>
                        {moneyField("outstandingLoan", {
                          "aria-required": "true"
                        })}
                      </Field>
                      <Field
                        label="Loan Amount Repaid"
                        htmlFor="loanAmountRepaid"
                        helper="Auto populated: Loan Amount Taken - Outstanding Loan">
                        <MoneyInput
                          id="loanAmountRepaid"
                          value={loanAmountRepaid.toFixed(2)}
                          disabled
                          className="bg-muted"
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Monthly Loan Payment"
                        htmlFor="monthlyLoanPayment"
                        required
                        error={errors.monthlyLoanPayment?.message}>
                        {moneyField("monthlyLoanPayment", {
                          "aria-required": "true"
                        })}
                        <p className="text-muted-foreground text-xs">
                          You pay this amount monthly
                        </p>
                        <div className="bg-card border-border mt-3 flex items-center justify-between rounded-lg border p-2.5">
                          <div className="flex-1">
                            <Label
                              htmlFor="paidByCpf"
                              className="text-foreground text-xs font-semibold">
                              Paid by CPF?
                            </Label>
                            <p className="text-foreground/400 mt-0.5 text-[11px]">
                              Deduct from CPF OA projection, split across all
                              CPF-contributing members
                            </p>
                          </div>
                          <Controller
                            control={control}
                            name="paidByCpf"
                            render={({ field }) => (
                              <Switch
                                id="paidByCpf"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            )}
                          />
                        </div>
                      </Field>
                      <Field
                        label="Interest Rate"
                        htmlFor="interestRate"
                        required
                        error={errors.interestRate?.message}
                        helper="Your interest rate with HDB/Bank">
                        {moneyField("interestRate", {
                          symbol: "%",
                          side: "prefix",
                          "aria-required": "true"
                        })}
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Interest Repayment"
                        htmlFor="interestRepayment"
                        helper={
                          <>
                            Auto calculated: Outstanding Loan x (Interest Rate /
                            100) / 12
                            <br />
                            This amount is used to pay off the interest rate
                          </>
                        }>
                        <MoneyInput
                          id="interestRepayment"
                          value={interestRepayment.toFixed(2)}
                          disabled
                          className="bg-muted"
                        />
                      </Field>
                      <Field
                        label="Principal Repayment"
                        htmlFor="principalRepayment"
                        helper={
                          <>
                            Auto calculated: Monthly Loan Payment - Interest
                            Repayment
                            <br />
                            This amount is used to pay off your outstanding loan
                          </>
                        }>
                        <MoneyInput
                          id="principalRepayment"
                          value={principalRepayment.toFixed(2)}
                          disabled
                          className="bg-muted"
                        />
                      </Field>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="space-y-4">
                  <div className="border-border border-b pb-3">
                    <h3 className="text-foreground text-sm font-semibold">
                      Additional Details
                    </h3>
                  </div>
                  <div className="bg-muted space-y-4 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Principal CPF Withdrawn"
                        htmlFor="principalCpfWithdrawn">
                        {moneyField("principalCpfWithdrawn")}
                      </Field>
                      <Field
                        label="Housing Grant Taken"
                        htmlFor="housingGrantTaken">
                        {moneyField("housingGrantTaken")}
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Accrued Interest to Date"
                        htmlFor="accruedInterestToDate">
                        {moneyField("accruedInterestToDate")}
                      </Field>
                      <Field
                        label="Amount to be returned to CPF"
                        htmlFor="amountToBeReturnedToCpf"
                        helper="Auto calculated: Principal CPF Withdrawn + Housing Grant Taken + Accrued Interest to Date">
                        <MoneyInput
                          id="amountToBeReturnedToCpf"
                          value={amountToBeReturnedToCpf.toFixed(2)}
                          disabled
                          className="bg-muted"
                        />
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
                          Automatically track this property&apos;s monthly loan
                          payment as a recurring expenditure
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
                  : property
                    ? "Update Property"
                    : "Add Property"}
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

            <Field
              label="Monthly Payment"
              htmlFor="expenditureAmount"
              helper="Defaults to your monthly loan payment. Adjust if needed.">
              {moneyField("expenditureAmount", { className: "w-full" })}
            </Field>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-foreground">Property:</div>
              <div className="font-medium">{propertyName || "-"}</div>

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
