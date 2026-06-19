"use client"

import { useState } from "react"
import { createFamilyMember } from "@/actions/family-members"
import { RELATIONSHIPS } from "@/data/family-relationships.data"
import { format } from "date-fns"
import { Info } from "lucide-react"

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

interface AddFamilyMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMemberAdded: (member: FamilyMember) => void
  onContributingMemberAdded?: (member: FamilyMember) => void
}

export function AddFamilyMemberDialog({
  open,
  onOpenChange,
  onMemberAdded,
  onContributingMemberAdded
}: AddFamilyMemberDialogProps) {
  const [name, setName] = useState("")
  const [relationship, setRelationship] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined)
  const [isContributing, setIsContributing] = useState(false)
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setName("")
    setRelationship("")
    setDateOfBirth(undefined)
    setIsContributing(false)
    setNotes("")
  }

  const handleSubmit = async () => {
    if (!name || !relationship || !dateOfBirth) {
      return
    }

    setIsSubmitting(true)
    try {
      const newMember = await createFamilyMember({
        name,
        relationship,
        dateOfBirth: dateOfBirth
          ? format(dateOfBirth, "yyyy-MM-dd")
          : undefined,
        isContributing,
        notes: notes || undefined
      })

      if (isContributing && onContributingMemberAdded) {
        onContributingMemberAdded(newMember)
      } else {
        onMemberAdded(newMember)
      }
      resetForm()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to create family member:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add Family Member
            <Info className="text-muted-foreground h-4 w-4" />
          </DialogTitle>
          <DialogDescription>
            Add a new family member to your profile.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="grid gap-6 py-4">
            {/* Row 1: Full Name */}
            <Field label="Full Name" htmlFor="name" required>
              <Input
                id="name"
                placeholder="e.g., John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-required="true"
              />
            </Field>

            {/* Row 2: Relationship */}
            <Field label="Relationship" htmlFor="relationship" required>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger id="relationship" aria-required="true">
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
              htmlFor="dob"
              required
              helper="Used to calculate age for CPF and other calculations">
              <DatePicker
                id="dob"
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
                  id="contributing"
                  checked={isContributing}
                  onCheckedChange={(checked) =>
                    setIsContributing(checked === true)
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="contributing"
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
              htmlFor="notes"
              helper="Add any additional notes about this family member">
              <Textarea
                id="notes"
                placeholder="e.g., Currently studying, works at..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </Field>
          </div>
        </DialogBody>

        {/* Footer */}
        <DialogFooterSticky>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name || !relationship || !dateOfBirth || isSubmitting}>
            {isSubmitting
              ? isContributing
                ? "Saving..."
                : "Adding..."
              : isContributing
                ? "Next"
                : "Add Member"}
          </Button>
        </DialogFooterSticky>
      </DialogContent>
    </Dialog>
  )
}
