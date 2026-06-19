"use client"

import React, { useEffect, useState } from "react"
import { ChevronLeft, Info } from "lucide-react"

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
import { MoneyInput } from "@/components/ui/money-input"
import { StepIndicator } from "@/components/ui/step-indicator"

interface AddCpfDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBack?: (cpfData?: { oa: number; sa: number; ma: number }) => void
  onComplete: (cpfDetails: { oa: number; sa: number; ma: number }) => void
  totalCpfContribution: number
  familyMemberName?: string
  initialOA?: number
  initialSA?: number
  initialMA?: number
  isStandalone?: boolean // When true, hides Back button and step indicator
}

export function IncomeAddCpfDetailsDialog({
  open,
  onOpenChange,
  onBack,
  onComplete,
  totalCpfContribution: _totalCpfContribution,
  familyMemberName,
  initialOA,
  initialSA,
  initialMA,
  isStandalone = false
}: AddCpfDetailsDialogProps) {
  const [ordinaryAccount, setOrdinaryAccount] = useState("")
  const [specialAccount, setSpecialAccount] = useState("")
  const [medisaveAccount, setMedisaveAccount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [initialValues, setInitialValues] = useState<{
    oa: string
    sa: string
    ma: string
  } | null>(null)

  // Format number to 2 decimal places
  const formatDecimal = (value: number | undefined): string => {
    if (value === undefined || value === 0) return ""
    return value.toFixed(2)
  }

  // Format on blur to show 2 decimal places
  const handleBlur = (value: string, setter: (v: string) => void) => {
    const num = parseFloat(value)
    if (!isNaN(num) && num > 0) {
      setter(num.toFixed(2))
    }
  }

  // Pre-populate fields when initial values are provided
  useEffect(() => {
    if (open) {
      const oa = formatDecimal(initialOA)
      const sa = formatDecimal(initialSA)
      const ma = formatDecimal(initialMA)

      setOrdinaryAccount(oa)
      setSpecialAccount(sa)
      setMedisaveAccount(ma)
      setInitialValues({ oa, sa, ma })
      setHasUnsavedChanges(false)
    }
  }, [open, initialOA, initialSA, initialMA])

  // Track changes
  useEffect(() => {
    if (!initialValues || !open) {
      setHasUnsavedChanges(false)
      return
    }

    const hasChanges =
      ordinaryAccount !== initialValues.oa ||
      specialAccount !== initialValues.sa ||
      medisaveAccount !== initialValues.ma

    setHasUnsavedChanges(hasChanges)
  }, [initialValues, ordinaryAccount, specialAccount, medisaveAccount, open])

  const resetForm = () => {
    setOrdinaryAccount("")
    setSpecialAccount("")
    setMedisaveAccount("")
  }

  const handleClose = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      setShowUnsavedWarning(true)
    } else {
      onOpenChange(open)
    }
  }

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false)
    setHasUnsavedChanges(false)
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onComplete({
        oa: parseFloat(ordinaryAccount) || 0,
        sa: parseFloat(specialAccount) || 0,
        ma: parseFloat(medisaveAccount) || 0
      })
      resetForm()
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error("Failed to save CPF details:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    // Pass current CPF values when going back
    const currentValues = {
      oa: parseFloat(ordinaryAccount) || 0,
      sa: parseFloat(specialAccount) || 0,
      ma: parseFloat(medisaveAccount) || 0
    }
    onBack?.(currentValues)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {initialOA !== undefined ||
              initialSA !== undefined ||
              initialMA !== undefined
                ? "Edit"
                : "Add"}{" "}
              CPF Account Details{" "}
              {familyMemberName && `for ${familyMemberName}`}
              <Info className="text-muted-foreground h-4 w-4" />
            </DialogTitle>
            <DialogDescription>
              Allocate the CPF contributions across the three CPF accounts.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <div className="grid gap-6 py-4">
              {/* Ordinary Account (OA) */}
              <Field
                label="Ordinary Account (OA)"
                htmlFor="oa"
                helper="For housing, insurance, investment, and education">
                <MoneyInput
                  id="oa"
                  placeholder="0.00"
                  value={ordinaryAccount}
                  onChange={(e) => setOrdinaryAccount(e.target.value)}
                  onBlur={() => handleBlur(ordinaryAccount, setOrdinaryAccount)}
                  min="0"
                  step="0.01"
                />
              </Field>

              {/* Special Account (SA) */}
              <Field
                label="Special Account (SA)"
                htmlFor="sa"
                helper="For retirement and investment in approved assets">
                <MoneyInput
                  id="sa"
                  placeholder="0.00"
                  value={specialAccount}
                  onChange={(e) => setSpecialAccount(e.target.value)}
                  onBlur={() => handleBlur(specialAccount, setSpecialAccount)}
                  min="0"
                  step="0.01"
                />
              </Field>

              {/* Medisave Account (MA) */}
              <Field
                label="Medisave Account (MA)"
                htmlFor="ma"
                helper="For hospitalization expenses and approved medical insurance">
                <MoneyInput
                  id="ma"
                  placeholder="0.00"
                  value={medisaveAccount}
                  onChange={(e) => setMedisaveAccount(e.target.value)}
                  onBlur={() => handleBlur(medisaveAccount, setMedisaveAccount)}
                  min="0"
                  step="0.01"
                />
              </Field>
            </div>
          </DialogBody>

          {/* Footer */}
          <DialogFooterSticky className="flex-col gap-4">
            {!isStandalone && <StepIndicator currentStep={3} totalSteps={3} />}
            <div
              className={`flex w-full gap-3 ${isStandalone ? "justify-end" : "justify-between"}`}>
              {!isStandalone && (
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={isSubmitting}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              )}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => handleClose(false)}
                  disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting
                    ? "Saving..."
                    : isStandalone
                      ? "Save"
                      : "Save & Finish"}
                </Button>
              </div>
            </div>
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
