"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  createPropertyAsset,
  updatePropertyAsset
} from "@/actions/property-assets"
import { format } from "date-fns"

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

interface PropertyAsset {
  id: string
  propertyName: string
  purchaseDate: string
  originalPurchasePrice: string
  loanAmountTaken: string | null
  outstandingLoan: string
  monthlyLoanPayment: string
  interestRate: string
  principalCpfWithdrawn: string | null
  housingGrantTaken: string | null
  accruedInterestToDate: string | null
  linkedExpenseId: string | null
  paidByCpf: boolean | null
}

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
  // Property Information
  const [propertyName, setPropertyName] = useState(property?.propertyName || "")
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(
    property?.purchaseDate ? new Date(property.purchaseDate) : undefined
  )

  // Purchase Details
  const [originalPurchasePrice, setOriginalPurchasePrice] = useState(
    property?.originalPurchasePrice || ""
  )
  const [loanAmountTaken, setLoanAmountTaken] = useState(
    property?.loanAmountTaken || ""
  )

  // Loan Repayment
  const [outstandingLoan, setOutstandingLoan] = useState(
    property?.outstandingLoan || ""
  )
  const [monthlyLoanPayment, setMonthlyLoanPayment] = useState(
    property?.monthlyLoanPayment || ""
  )
  const [interestRate, setInterestRate] = useState(property?.interestRate || "")

  // Additional Details
  const [principalCpfWithdrawn, setPrincipalCpfWithdrawn] = useState(
    property?.principalCpfWithdrawn || ""
  )
  const [housingGrantTaken, setHousingGrantTaken] = useState(
    property?.housingGrantTaken || ""
  )
  const [accruedInterestToDate, setAccruedInterestToDate] = useState(
    property?.accruedInterestToDate || ""
  )

  // CPF Integration
  const [paidByCpf, setPaidByCpf] = useState(!!property?.paidByCpf)

  // Expenditure Integration
  const [addToExpenditures, setAddToExpenditures] = useState(
    !!property?.linkedExpenseId
  )
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false)
  const [expenseName, setExpenseName] = useState("")
  const [expenditureAmount, setExpenditureAmount] = useState("")
  const [validationError, setValidationError] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-calculated fields
  const loanAmountRepaid = useMemo(() => {
    const taken = parseFloat(loanAmountTaken) || 0
    const outstanding = parseFloat(outstandingLoan) || 0
    return taken - outstanding
  }, [loanAmountTaken, outstandingLoan])

  const interestRepayment = useMemo(() => {
    const outstanding = parseFloat(outstandingLoan) || 0
    const rate = parseFloat(interestRate) || 0
    return (outstanding * (rate / 100)) / 12
  }, [outstandingLoan, interestRate])

  const principalRepayment = useMemo(() => {
    const monthly = parseFloat(monthlyLoanPayment) || 0
    return monthly - interestRepayment
  }, [monthlyLoanPayment, interestRepayment])

  const amountToBeReturnedToCpf = useMemo(() => {
    const principal = parseFloat(principalCpfWithdrawn) || 0
    const grant = parseFloat(housingGrantTaken) || 0
    const accrued = parseFloat(accruedInterestToDate) || 0
    return principal + grant + accrued
  }, [principalCpfWithdrawn, housingGrantTaken, accruedInterestToDate])

  const resetForm = () => {
    setPropertyName("")
    setPurchaseDate(undefined)
    setOriginalPurchasePrice("")
    setLoanAmountTaken("")
    setOutstandingLoan("")
    setMonthlyLoanPayment("")
    setInterestRate("")
    setPrincipalCpfWithdrawn("")
    setHousingGrantTaken("")
    setAccruedInterestToDate("")
    setPaidByCpf(false)
    setAddToExpenditures(false)
    setConfirmationModalOpen(false)
    setExpenseName("")
    setExpenditureAmount("")
    setValidationError("")
  }

  // Handle toggle change with validation
  const handleToggleChange = (checked: boolean) => {
    if (checked) {
      // Validate required fields before allowing toggle
      if (!purchaseDate || !monthlyLoanPayment) {
        setValidationError(
          "Please fill in Purchase Date and Monthly Loan Payment before adding to expenses."
        )
        return
      }
      setValidationError("")
      // Generate default expense name and set initial expenditure amount
      setExpenseName(
        propertyName
          ? `${propertyName} - Loan Payment`
          : "Property Loan Payment"
      )
      setExpenditureAmount(monthlyLoanPayment)
      setConfirmationModalOpen(true)
    } else {
      setAddToExpenditures(false)
      setExpenseName("")
      setExpenditureAmount("")
    }
  }

  // Confirm adding to expenditures
  const handleConfirmAddToExpenditures = () => {
    setAddToExpenditures(true)
    setConfirmationModalOpen(false)
  }

  // Cancel adding to expenditures
  const handleCancelAddToExpenditures = () => {
    setConfirmationModalOpen(false)
    setExpenseName("")
  }

  // Update form fields when property prop changes (for edit mode)
  useEffect(() => {
    if (property) {
      setPropertyName(property.propertyName)
      setPurchaseDate(new Date(property.purchaseDate))
      setOriginalPurchasePrice(property.originalPurchasePrice)
      setLoanAmountTaken(property.loanAmountTaken || "")
      setOutstandingLoan(property.outstandingLoan)
      setMonthlyLoanPayment(property.monthlyLoanPayment)
      setInterestRate(property.interestRate)
      setPrincipalCpfWithdrawn(property.principalCpfWithdrawn || "")
      setHousingGrantTaken(property.housingGrantTaken || "")
      setAccruedInterestToDate(property.accruedInterestToDate || "")
      setPaidByCpf(!!property.paidByCpf)
      setAddToExpenditures(!!property.linkedExpenseId)
    }
  }, [property])

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm()
    }
    onOpenChange(isOpen)
  }

  const handleSubmit = async () => {
    if (
      !propertyName ||
      !purchaseDate ||
      !originalPurchasePrice ||
      !outstandingLoan ||
      !monthlyLoanPayment ||
      !interestRate
    ) {
      return
    }

    setIsSubmitting(true)

    try {
      const data = {
        propertyName,
        purchaseDate: format(purchaseDate, "yyyy-MM-dd"),
        originalPurchasePrice: parseFloat(originalPurchasePrice),
        loanAmountTaken: loanAmountTaken
          ? parseFloat(loanAmountTaken)
          : undefined,
        outstandingLoan: parseFloat(outstandingLoan),
        monthlyLoanPayment: parseFloat(monthlyLoanPayment),
        interestRate: parseFloat(interestRate),
        principalCpfWithdrawn: principalCpfWithdrawn
          ? parseFloat(principalCpfWithdrawn)
          : undefined,
        housingGrantTaken: housingGrantTaken
          ? parseFloat(housingGrantTaken)
          : undefined,
        accruedInterestToDate: accruedInterestToDate
          ? parseFloat(accruedInterestToDate)
          : undefined,
        paidByCpf,
        addToExpenditures,
        expenseName: addToExpenditures ? expenseName : undefined,
        expenditureAmount:
          addToExpenditures && expenditureAmount
            ? parseFloat(expenditureAmount)
            : undefined
      }

      if (property) {
        await updatePropertyAsset(property.id, data)
      } else {
        await createPropertyAsset(data)
      }

      handleClose(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save property:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid =
    propertyName &&
    purchaseDate &&
    originalPurchasePrice &&
    outstandingLoan &&
    monthlyLoanPayment &&
    interestRate

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {property ? "Edit Property" : "Add Property"}
            </DialogTitle>
          </DialogHeader>

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
                      required>
                      <Input
                        id="propertyName"
                        placeholder="e.g. Fernvale HDB"
                        value={propertyName}
                        onChange={(e) => setPropertyName(e.target.value)}
                        aria-required="true"
                      />
                    </Field>
                    <Field
                      label="Purchase Date"
                      htmlFor="purchaseDate"
                      required>
                      <DatePicker
                        id="purchaseDate"
                        value={purchaseDate}
                        onChange={setPurchaseDate}
                        displayFormat="dd/MM/yyyy"
                        placeholder="Select date"
                        disableFuture
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
                      required>
                      <MoneyInput
                        id="originalPurchasePrice"
                        placeholder="0.00"
                        value={originalPurchasePrice}
                        onChange={(e) =>
                          setOriginalPurchasePrice(e.target.value)
                        }
                        min="0"
                        step="0.01"
                        aria-required="true"
                      />
                    </Field>
                    <Field label="Loan Amount Taken" htmlFor="loanAmountTaken">
                      <MoneyInput
                        id="loanAmountTaken"
                        placeholder="0.00"
                        value={loanAmountTaken}
                        onChange={(e) => setLoanAmountTaken(e.target.value)}
                        min="0"
                        step="0.01"
                      />
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
                      required>
                      <MoneyInput
                        id="outstandingLoan"
                        placeholder="0"
                        value={outstandingLoan}
                        onChange={(e) => setOutstandingLoan(e.target.value)}
                        min="0"
                        step="0.01"
                        aria-required="true"
                      />
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
                      required>
                      <MoneyInput
                        id="monthlyLoanPayment"
                        placeholder="0.00"
                        value={monthlyLoanPayment}
                        onChange={(e) => setMonthlyLoanPayment(e.target.value)}
                        min="0"
                        step="0.01"
                        aria-required="true"
                      />
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
                        <Switch
                          id="paidByCpf"
                          checked={paidByCpf}
                          onCheckedChange={setPaidByCpf}
                        />
                      </div>
                    </Field>
                    <Field
                      label="Interest Rate"
                      htmlFor="interestRate"
                      required
                      helper="Your interest rate with HDB/Bank">
                      <MoneyInput
                        symbol="%"
                        side="prefix"
                        id="interestRate"
                        placeholder="0.00"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        min="0"
                        step="0.01"
                        aria-required="true"
                      />
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
                      <MoneyInput
                        id="principalCpfWithdrawn"
                        placeholder="0.00"
                        value={principalCpfWithdrawn}
                        onChange={(e) =>
                          setPrincipalCpfWithdrawn(e.target.value)
                        }
                        min="0"
                        step="0.01"
                      />
                    </Field>
                    <Field
                      label="Housing Grant Taken"
                      htmlFor="housingGrantTaken">
                      <MoneyInput
                        id="housingGrantTaken"
                        placeholder="0.00"
                        value={housingGrantTaken}
                        onChange={(e) => setHousingGrantTaken(e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label="Accrued Interest to Date"
                      htmlFor="accruedInterestToDate">
                      <MoneyInput
                        id="accruedInterestToDate"
                        placeholder="0.00"
                        value={accruedInterestToDate}
                        onChange={(e) =>
                          setAccruedInterestToDate(e.target.value)
                        }
                        min="0"
                        step="0.01"
                      />
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
                  {validationError && (
                    <div className="text-on-danger bg-brand-alert-red/[0.12] mt-3 rounded p-2 text-sm">
                      {validationError}
                    </div>
                  )}
                </div>
              </div>
            </div>
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
              disabled={!isFormValid || isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : property
                  ? "Update Property"
                  : "Add Property"}
            </Button>
          </DialogFooterSticky>
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
            {/* Expense Name Input - Editable */}
            <Field label="Expense Name" htmlFor="expenseName">
              <Input
                id="expenseName"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                placeholder="Enter expense name"
                className="w-full"
              />
            </Field>

            {/* Monthly Payment Input - Editable */}
            <Field
              label="Monthly Payment"
              htmlFor="expenditureAmount"
              helper="Defaults to your monthly loan payment. Adjust if needed.">
              <MoneyInput
                id="expenditureAmount"
                value={expenditureAmount}
                onChange={(e) => setExpenditureAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full"
              />
            </Field>

            {/* Display-only Details */}
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
  )
}
