"use client"

import { useEffect, useState } from "react"
import { updateFamilyMember } from "@/actions/family-members"
import { RELATIONSHIPS } from "@/data/family-relationships.data"
import { format, parse } from "date-fns"
import { Info } from "lucide-react"

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

interface FamilyMember {
  id: string
  name: string
  relationship: string | null
  dateOfBirth: string | null
  isContributing: boolean | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

interface EditFamilyMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: FamilyMember | null
  onMemberUpdated: (member: FamilyMember) => void
  onContributingMemberUpdated?: (member: FamilyMember) => void
}

export function FamilyMemberEditDialog({
  open,
  onOpenChange,
  member,
  onMemberUpdated,
  onContributingMemberUpdated
}: EditFamilyMemberDialogProps) {
  const [name, setName] = useState("")
  const [relationship, setRelationship] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined)
  const [isContributing, setIsContributing] = useState(false)
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [_wasContributingInitially, setWasContributingInitially] =
    useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Populate form when member changes
  useEffect(() => {
    if (member) {
      setName(member.name)
      setRelationship(member.relationship || "")
      setDateOfBirth(
        member.dateOfBirth
          ? parse(member.dateOfBirth, "yyyy-MM-dd", new Date())
          : undefined
      )
      const contributing = member.isContributing || false
      setIsContributing(contributing)
      setWasContributingInitially(contributing)
      setNotes(member.notes || "")
      setHasUnsavedChanges(false)
    }
  }, [member])

  // Track changes to form fields
  useEffect(() => {
    if (!member) return

    const hasChanges =
      name !== member.name ||
      relationship !== (member.relationship || "") ||
      (dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : null) !==
        member.dateOfBirth ||
      isContributing !== (member.isContributing || false) ||
      notes !== (member.notes || "")

    setHasUnsavedChanges(hasChanges)
  }, [member, name, relationship, dateOfBirth, isContributing, notes])

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
    if (!member || !name || !relationship) {
      return
    }

    // If contributing member, don't save yet - pass data to wizard
    if (isContributing && onContributingMemberUpdated) {
      const pendingData = {
        ...member,
        name,
        relationship,
        dateOfBirth: dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : null,
        isContributing,
        notes: notes || null
      }
      setHasUnsavedChanges(false)
      onContributingMemberUpdated(pendingData)
      // Don't close here - let parent handle transition
      return
    }

    // Otherwise, save immediately for non-contributing members
    setIsSubmitting(true)
    try {
      const updatedMember = await updateFamilyMember(member.id, {
        name,
        relationship,
        dateOfBirth: dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : null,
        isContributing,
        notes: notes || null
      })

      onMemberUpdated(updatedMember)
      setHasUnsavedChanges(false)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update family member:", error)
    } finally {
      setIsSubmitting(false)
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

          <DialogBody>
            <div className="grid gap-6 py-4">
              {/* Row 1: Full Name */}
              <Field label="Full Name" htmlFor="edit-name" required>
                <Input
                  id="edit-name"
                  placeholder="e.g., John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-required="true"
                />
              </Field>

              {/* Row 2: Relationship */}
              <Field label="Relationship" htmlFor="edit-relationship" required>
                <Select value={relationship} onValueChange={setRelationship}>
                  <SelectTrigger id="edit-relationship" aria-required="true">
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
              </Field>

              {/* Row 3: Date of Birth */}
              <Field
                label="Date of Birth"
                htmlFor="edit-dob"
                helper="Used to calculate age for CPF and other calculations">
                <DatePicker
                  id="edit-dob"
                  value={dateOfBirth}
                  onChange={setDateOfBirth}
                  fromYear={1900}
                  disableFuture
                />
              </Field>

              {/* Row 4: Contributing Member */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-contributing"
                    checked={isContributing}
                    onCheckedChange={(checked) =>
                      setIsContributing(checked === true)
                    }
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
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </Field>
            </div>
          </DialogBody>

          {/* Footer */}
          <DialogFooterSticky className="flex-col gap-4">
            {isContributing && <StepIndicator currentStep={1} totalSteps={3} />}
            <div className="flex w-full justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => handleClose(false)}
                disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!name || !relationship || isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : isContributing
                    ? "Next"
                    : "Save Changes"}
              </Button>
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
