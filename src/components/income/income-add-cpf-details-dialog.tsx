"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronLeft, Info } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

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

const cpfFormSchema = z.object({
  ordinaryAccount: z.string(),
  specialAccount: z.string(),
  medisaveAccount: z.string()
})
type CpfFormValues = z.infer<typeof cpfFormSchema>

// Empty unless a positive value was passed in (mirrors the original
// formatDecimal: 0/undefined render as blank, otherwise 2 d.p.).
const formatDecimal = (value: number | undefined): string =>
  value === undefined || value === 0 ? "" : value.toFixed(2)

const toFormValues = (
  oa?: number,
  sa?: number,
  ma?: number
): CpfFormValues => ({
  ordinaryAccount: formatDecimal(oa),
  specialAccount: formatDecimal(sa),
  medisaveAccount: formatDecimal(ma)
})

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
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { isDirty, isSubmitting }
  } = useForm<CpfFormValues>({
    resolver: zodResolver(cpfFormSchema),
    defaultValues: toFormValues(initialOA, initialSA, initialMA)
  })

  // Pre-populate when the dialog opens / initial values change.
  useEffect(() => {
    if (open) reset(toFormValues(initialOA, initialSA, initialMA))
  }, [open, initialOA, initialSA, initialMA, reset])

  // Format a field to 2 d.p. on blur, mirroring the original handleBlur.
  const formatOnBlur = (name: keyof CpfFormValues) => {
    const num = parseFloat(getValues(name))
    if (!isNaN(num) && num > 0) setValue(name, num.toFixed(2))
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen && isDirty) {
      setShowUnsavedWarning(true)
    } else {
      onOpenChange(isOpen)
    }
  }

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false)
    reset(toFormValues(initialOA, initialSA, initialMA))
    onOpenChange(false)
  }

  const onSubmit = async (values: CpfFormValues) => {
    try {
      await onComplete({
        oa: parseFloat(values.ordinaryAccount) || 0,
        sa: parseFloat(values.specialAccount) || 0,
        ma: parseFloat(values.medisaveAccount) || 0
      })
      reset(toFormValues(initialOA, initialSA, initialMA))
    } catch (error) {
      console.error("Failed to save CPF details:", error)
    }
  }

  const handleBack = () => {
    const v = getValues()
    onBack?.({
      oa: parseFloat(v.ordinaryAccount) || 0,
      sa: parseFloat(v.specialAccount) || 0,
      ma: parseFloat(v.medisaveAccount) || 0
    })
  }

  const cpfField = (
    name: keyof CpfFormValues,
    id: string,
    label: string,
    helper: string
  ) => (
    <Field label={label} htmlFor={id} helper={helper}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <MoneyInput
            id={id}
            placeholder="0.00"
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            onBlur={() => {
              formatOnBlur(name)
              field.onBlur()
            }}
            min="0"
            step="0.01"
          />
        )}
      />
    </Field>
  )

  const isEdit =
    initialOA !== undefined ||
    initialSA !== undefined ||
    initialMA !== undefined

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEdit ? "Edit" : "Add"} CPF Account Details{" "}
              {familyMemberName && `for ${familyMemberName}`}
              <Info className="text-muted-foreground h-4 w-4" />
            </DialogTitle>
            <DialogDescription>
              Allocate the CPF contributions across the three CPF accounts.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              <div className="grid gap-6 py-4">
                {cpfField(
                  "ordinaryAccount",
                  "oa",
                  "Ordinary Account (OA)",
                  "For housing, insurance, investment, and education"
                )}
                {cpfField(
                  "specialAccount",
                  "sa",
                  "Special Account (SA)",
                  "For retirement and investment in approved assets"
                )}
                {cpfField(
                  "medisaveAccount",
                  "ma",
                  "Medisave Account (MA)",
                  "For hospitalization expenses and approved medical insurance"
                )}
              </div>
            </DialogBody>

            {/* Footer */}
            <DialogFooterSticky className="flex-col gap-4">
              {!isStandalone && (
                <StepIndicator currentStep={3} totalSteps={3} />
              )}
              <div
                className={`flex w-full gap-3 ${isStandalone ? "justify-end" : "justify-between"}`}>
                {!isStandalone && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBack}
                    disabled={isSubmitting}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                )}
                <div className="flex gap-2">
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
                      : isStandalone
                        ? "Save"
                        : "Save & Finish"}
                  </Button>
                </div>
              </div>
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
