"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  createVehicleAsset,
  updateVehicleAsset
} from "@/actions/vehicle-assets"
import { differenceInMonths, format } from "date-fns"

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
  // Vehicle Information
  const [vehicleName, setVehicleName] = useState(vehicle?.vehicleName || "")
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(
    vehicle?.purchaseDate ? new Date(vehicle.purchaseDate) : undefined
  )
  const [coeExpiryDate, setCoeExpiryDate] = useState<Date | undefined>(
    vehicle?.coeExpiryDate ? new Date(vehicle.coeExpiryDate) : undefined
  )

  // Purchase Details
  const [originalPurchasePrice, setOriginalPurchasePrice] = useState(
    vehicle?.originalPurchasePrice || ""
  )
  const [loanAmountTaken, setLoanAmountTaken] = useState(
    vehicle?.loanAmountTaken || ""
  )
  const [loanInterestRate, setLoanInterestRate] = useState(
    vehicle?.loanInterestRate || ""
  )
  const [loanTenureYears, setLoanTenureYears] = useState(
    vehicle?.loanTenureYears != null ? String(vehicle.loanTenureYears) : ""
  )
  const [loanTenureMonths, setLoanTenureMonths] = useState(
    vehicle?.loanTenureMonths != null ? String(vehicle.loanTenureMonths) : ""
  )

  // Loan Repayment
  const [loanAmountRepaid, setLoanAmountRepaid] = useState(
    vehicle?.loanAmountRepaid || ""
  )
  const [monthlyLoanPayment, setMonthlyLoanPayment] = useState(
    vehicle?.monthlyLoanPayment || ""
  )

  // Expenditure Integration
  const [addToExpenditures, setAddToExpenditures] = useState(
    !!vehicle?.linkedExpenseId
  )
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false)
  const [expenseName, setExpenseName] = useState("")
  const [validationError, setValidationError] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Flat-rate outstanding loan: P × (n − k) / n (SG banks use flat rate, not compound)
  const { outstandingLoan, outstandingLoanMethod } = useMemo(() => {
    const principal = parseFloat(loanAmountTaken) || 0
    const tenureYears = parseInt(loanTenureYears) || 0
    const tenureMonthsPart = parseInt(loanTenureMonths) || 0
    const totalMonths = tenureYears * 12 + tenureMonthsPart

    if (principal > 0 && totalMonths > 0 && purchaseDate) {
      const monthsElapsed = Math.max(
        0,
        differenceInMonths(new Date(), purchaseDate)
      )
      const k = Math.min(monthsElapsed, totalMonths)
      const balance = (principal * (totalMonths - k)) / totalMonths
      return {
        outstandingLoan: Math.max(0, balance),
        outstandingLoanMethod: "flat" as const
      }
    }

    // Fallback: simple subtraction
    const repaid = parseFloat(loanAmountRepaid) || 0
    return {
      outstandingLoan: Math.max(0, principal - repaid),
      outstandingLoanMethod: "simple" as const
    }
  }, [
    loanAmountTaken,
    loanTenureYears,
    loanTenureMonths,
    purchaseDate,
    loanAmountRepaid
  ])

  // Suggested monthly payment from flat rate formula: (P + P × rate × years) / totalMonths
  const suggestedMonthlyPayment = useMemo(() => {
    const principal = parseFloat(loanAmountTaken) || 0
    const rate = parseFloat(loanInterestRate) || 0
    const tenureYears = parseInt(loanTenureYears) || 0
    const tenureMonthsPart = parseInt(loanTenureMonths) || 0
    const totalMonths = tenureYears * 12 + tenureMonthsPart
    if (principal > 0 && rate > 0 && totalMonths > 0) {
      const years = totalMonths / 12
      return (principal + principal * (rate / 100) * years) / totalMonths
    }
    return null
  }, [loanAmountTaken, loanInterestRate, loanTenureYears, loanTenureMonths])

  // MAS quantum warning: loan > 70% of purchase price
  const masWarning = useMemo(() => {
    const principal = parseFloat(loanAmountTaken) || 0
    const price = parseFloat(originalPurchasePrice) || 0
    if (principal > 0 && price > 0 && principal > price * 0.7) return true
    return false
  }, [loanAmountTaken, originalPurchasePrice])

  // COE vs tenure mismatch warning
  const coeOverlapWarning = useMemo(() => {
    if (!purchaseDate || !coeExpiryDate) return false
    const tenureYears = parseInt(loanTenureYears) || 0
    const tenureMonthsPart = parseInt(loanTenureMonths) || 0
    const totalMonths = tenureYears * 12 + tenureMonthsPart
    if (totalMonths === 0) return false
    const loanEndDate = new Date(purchaseDate)
    loanEndDate.setMonth(loanEndDate.getMonth() + totalMonths)
    return loanEndDate > coeExpiryDate
  }, [purchaseDate, coeExpiryDate, loanTenureYears, loanTenureMonths])

  // MAS max tenure warning: > 7 years
  const tenureWarning = useMemo(() => {
    const tenureYears = parseInt(loanTenureYears) || 0
    const tenureMonthsPart = parseInt(loanTenureMonths) || 0
    return tenureYears * 12 + tenureMonthsPart > 84
  }, [loanTenureYears, loanTenureMonths])

  const resetForm = () => {
    setVehicleName("")
    setPurchaseDate(undefined)
    setCoeExpiryDate(undefined)
    setOriginalPurchasePrice("")
    setLoanAmountTaken("")
    setLoanInterestRate("")
    setLoanTenureYears("")
    setLoanTenureMonths("")
    setLoanAmountRepaid("")
    setMonthlyLoanPayment("")
    setAddToExpenditures(false)
    setConfirmationModalOpen(false)
    setExpenseName("")
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
      // Generate default expense name
      setExpenseName(
        vehicleName ? `${vehicleName} - Loan Payment` : "Vehicle Loan Payment"
      )
      setConfirmationModalOpen(true)
    } else {
      setAddToExpenditures(false)
      setExpenseName("")
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

  // Update form fields when vehicle prop changes (for edit mode)
  useEffect(() => {
    if (vehicle) {
      setVehicleName(vehicle.vehicleName)
      setPurchaseDate(new Date(vehicle.purchaseDate))
      setCoeExpiryDate(
        vehicle.coeExpiryDate ? new Date(vehicle.coeExpiryDate) : undefined
      )
      setOriginalPurchasePrice(vehicle.originalPurchasePrice)
      setLoanAmountTaken(vehicle.loanAmountTaken || "")
      setLoanInterestRate(vehicle.loanInterestRate || "")
      setLoanTenureYears(
        vehicle.loanTenureYears != null ? String(vehicle.loanTenureYears) : ""
      )
      setLoanTenureMonths(
        vehicle.loanTenureMonths != null ? String(vehicle.loanTenureMonths) : ""
      )
      setLoanAmountRepaid(vehicle.loanAmountRepaid || "")
      setMonthlyLoanPayment(vehicle.monthlyLoanPayment || "")
      setAddToExpenditures(!!vehicle.linkedExpenseId)
    }
  }, [vehicle])

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm()
    }
    onOpenChange(isOpen)
  }

  const handleSubmit = async () => {
    if (!vehicleName || !purchaseDate || !originalPurchasePrice) {
      return
    }

    setIsSubmitting(true)

    try {
      const data = {
        vehicleName,
        purchaseDate: format(purchaseDate, "yyyy-MM-dd"),
        coeExpiryDate: coeExpiryDate
          ? format(coeExpiryDate, "yyyy-MM-dd")
          : undefined,
        originalPurchasePrice: parseFloat(originalPurchasePrice),
        loanAmountTaken: loanAmountTaken
          ? parseFloat(loanAmountTaken)
          : undefined,
        loanInterestRate: loanInterestRate
          ? parseFloat(loanInterestRate)
          : undefined,
        loanTenureYears: loanTenureYears
          ? parseInt(loanTenureYears)
          : undefined,
        loanTenureMonths: loanTenureMonths
          ? parseInt(loanTenureMonths)
          : undefined,
        loanAmountRepaid: loanAmountRepaid
          ? parseFloat(loanAmountRepaid)
          : undefined,
        monthlyLoanPayment: monthlyLoanPayment
          ? parseFloat(monthlyLoanPayment)
          : undefined,
        addToExpenditures,
        expenseName: addToExpenditures ? expenseName : undefined
      }

      if (vehicle) {
        await updateVehicleAsset(vehicle.id, data)
      } else {
        await createVehicleAsset(data)
      }

      handleClose(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save vehicle:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = vehicleName && purchaseDate && originalPurchasePrice

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {vehicle ? "Edit Vehicle" : "Add Vehicle"}
            </DialogTitle>
          </DialogHeader>

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
                    <Field label="Vehicle Name" htmlFor="vehicleName" required>
                      <Input
                        id="vehicleName"
                        placeholder="e.g. Honda Vezel"
                        value={vehicleName}
                        onChange={(e) => setVehicleName(e.target.value)}
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
                  <div className="mt-4">
                    <Field
                      label="COE Expiry Date"
                      htmlFor="coeExpiryDate"
                      helper="Certificate of Entitlement expiry date (Singapore)">
                      <DatePicker
                        id="coeExpiryDate"
                        value={coeExpiryDate}
                        onChange={setCoeExpiryDate}
                        displayFormat="dd/MM/yyyy"
                        placeholder="Select date"
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
                        type="number"
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
                        type="number"
                        placeholder="0.00"
                        value={loanAmountTaken}
                        onChange={(e) => setLoanAmountTaken(e.target.value)}
                        min="0"
                        step="0.01"
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
                      <MoneyInput
                        symbol="%"
                        side="suffix"
                        id="loanInterestRate"
                        type="number"
                        placeholder="e.g. 2.68"
                        value={loanInterestRate}
                        onChange={(e) => setLoanInterestRate(e.target.value)}
                        min="0"
                        step="0.01"
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
                        <MoneyInput
                          symbol="yr"
                          side="suffix"
                          id="loanTenureYears"
                          type="number"
                          placeholder="0"
                          value={loanTenureYears}
                          onChange={(e) => setLoanTenureYears(e.target.value)}
                          min="0"
                          max="7"
                          step="1"
                          className="flex-1"
                        />
                        <MoneyInput
                          symbol="mo"
                          side="suffix"
                          id="loanTenureMonths"
                          type="number"
                          placeholder="0"
                          value={loanTenureMonths}
                          onChange={(e) => setLoanTenureMonths(e.target.value)}
                          min="0"
                          max="11"
                          step="1"
                          className="flex-1"
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
                      <MoneyInput
                        id="loanAmountRepaid"
                        type="number"
                        placeholder="0.00"
                        value={loanAmountRepaid}
                        onChange={(e) => setLoanAmountRepaid(e.target.value)}
                        min="0"
                        step="0.01"
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
                      <MoneyInput
                        id="monthlyLoanPayment"
                        type="number"
                        placeholder="0.00"
                        value={monthlyLoanPayment}
                        onChange={(e) => setMonthlyLoanPayment(e.target.value)}
                        min="0"
                        step="0.01"
                      />
                      {suggestedMonthlyPayment !== null && (
                        <p className="text-muted-foreground text-xs">
                          Suggested:{" "}
                          <Button
                            variant="link"
                            size="sm"
                            className="text-on-success h-auto p-0"
                            onClick={() =>
                              setMonthlyLoanPayment(
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
                : vehicle
                  ? "Update Vehicle"
                  : "Add Vehicle"}
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

            {/* Display-only Details */}
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
