"use client"

import { useEffect, useState } from "react"
import { updateFamilyMember } from "@/actions/family-members"
import { RELATIONSHIPS } from "@/data/family-relationships.data"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, parse } from "date-fns"
import { Info } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import type { FamilyMember } from "@/db/types"
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
import { Checkbox } from "@/components/ui/checkbox"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { StepIndicator } from "@/components/ui/step-indicator"
import { Textarea } from "@/components/ui/textarea"

interface EditFamilyMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: FamilyMember | null
  onMemberUpdated: (member: FamilyMember) => void
  onContributingMemberUpdated?: (member: FamilyMember) => void
}

// Edit requires name + relationship (date of birth is optional here); the
// disabled-until-valid submit is preserved via mode:"onChange" + isValid.
const editMemberFormSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  dateOfBirth: z.date().optional(),
  isContributing: z.boolean(),
  notes: z.string()
})
type EditMemberFormValues = z.infer<typeof editMemberFormSchema>

function toFormValues(member: FamilyMember): EditMemberFormValues {
  return {
    name: member.name,
    relationship: member.relationship || "",
    dateOfBirth: member.dateOfBirth
      ? parse(member.dateOfBirth, "yyyy-MM-dd", new Date())
      : undefined,
    isContributing: member.isContributing || false,
    notes: member.notes || ""
  }
}

export function FamilyMemberEditDialog({
  open,
  onOpenChange,
  member,
  onMemberUpdated,
  onContributingMemberUpdated
}: EditFamilyMemberDialogProps) {
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { isValid, isDirty, isSubmitting }
  } = useForm<EditMemberFormValues>({
    resolver: zodResolver(editMemberFormSchema),
    mode: "onChange"
  })

  const isContributing = useWatch({ control, name: "isContributing" })

  // Populate form when the member changes
  useEffect(() => {
    if (member) reset(toFormValues(member))
  }, [member, reset])

  const handleClose = (isOpen: boolean) => {
    if (!isOpen && isDirty) {
      setShowUnsavedWarning(true)
    } else {
      onOpenChange(isOpen)
    }
  }

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false)
    if (member) reset(toFormValues(member))
    onOpenChange(false)
  }

  const onSubmit = async (values: EditMemberFormValues) => {
    if (!member) return
    const dob = values.dateOfBirth
      ? format(values.dateOfBirth, "yyyy-MM-dd")
      : null

    // Contributing members defer the save to the wizard — hand back the merged
    // row and let the parent drive the transition (don't close here).
    if (values.isContributing && onContributingMemberUpdated) {
      onContributingMemberUpdated({
        ...member,
        name: values.name,
        relationship: values.relationship,
        dateOfBirth: dob,
        isContributing: values.isContributing,
        notes: values.notes || null
      })
      return
    }

    try {
      const updatedMember = await updateFamilyMember(member.id, {
        name: values.name,
        relationship: values.relationship,
        dateOfBirth: dob,
        isContributing: values.isContributing,
        notes: values.notes || null
      })
      onMemberUpdated(updatedMember)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update family member:", error)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Edit Family Member
              <Info className="text-muted-foreground h-4 w-4" />
            </DialogTitle>
            <DialogDescription>
              Update the family member details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              <div className="grid gap-6 py-4">
                {/* Row 1: Full Name */}
                <Field label="Full Name" htmlFor="edit-name" required>
                  <Input
                    id="edit-name"
                    placeholder="e.g., John Doe"
                    aria-required="true"
                    {...register("name")}
                  />
                </Field>

                {/* Row 2: Relationship */}
                <Field
                  label="Relationship"
                  htmlFor="edit-relationship"
                  required>
                  <Controller
                    control={control}
                    name="relationship"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}>
                        <SelectTrigger
                          id="edit-relationship"
                          aria-required="true">
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          {RELATIONSHIPS.map((rel) => (
                            <SelectItem key={rel.value} value={rel.value}>
                              {rel.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>

                {/* Row 3: Date of Birth */}
                <Field
                  label="Date of Birth"
                  htmlFor="edit-dob"
                  helper="Used to calculate age for CPF and other calculations">
                  <Controller
                    control={control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <DatePicker
                        id="edit-dob"
                        value={field.value}
                        onChange={field.onChange}
                        fromYear={1900}
                        disableFuture
                      />
                    )}
                  />
                </Field>

                {/* Row 4: Contributing Member */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Controller
                      control={control}
                      name="isContributing"
                      render={({ field }) => (
                        <Checkbox
                          id="edit-contributing"
                          checked={field.value}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true)
                          }
                        />
                      )}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor="edit-contributing"
                        className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Contributing member
                      </Label>
                      <p className="text-muted-foreground text-xs">
                        Consider this member&apos;s income into the total income
                      </p>
                    </div>
                  </div>
                </div>

                {/* Row 5: Notes */}
                <Field
                  label="Notes"
                  htmlFor="edit-notes"
                  helper="Add any additional notes about this family member">
                  <Textarea
                    id="edit-notes"
                    placeholder="e.g., Currently studying, works at..."
                    rows={3}
                    {...register("notes")}
                  />
                </Field>
              </div>
            </DialogBody>

            {/* Footer */}
            <DialogFooterSticky className="flex-col gap-4">
              {isContributing && (
                <StepIndicator currentStep={1} totalSteps={3} />
              )}
              <div className="flex w-full justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleClose(false)}
                  disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!isValid || isSubmitting}>
                  {isSubmitting
                    ? "Saving..."
                    : isContributing
                      ? "Next"
                      : "Save Changes"}
                </Button>
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
