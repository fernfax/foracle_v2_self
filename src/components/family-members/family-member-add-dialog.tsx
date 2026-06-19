"use client"

import { createFamilyMember } from "@/actions/family-members"
import { RELATIONSHIPS } from "@/data/family-relationships.data"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { Info } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import type { FamilyMember } from "@/db/types"
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

interface AddFamilyMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMemberAdded: (member: FamilyMember) => void
  onContributingMemberAdded?: (member: FamilyMember) => void
}

// name, relationship and date of birth are all required to add a member; the
// disabled-until-valid submit is preserved via mode:"onChange" + isValid.
const addMemberFormSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  dateOfBirth: z.date(),
  isContributing: z.boolean(),
  notes: z.string()
})
type AddMemberFormValues = z.infer<typeof addMemberFormSchema>

const defaultValues: AddMemberFormValues = {
  name: "",
  relationship: "",
  dateOfBirth: undefined as unknown as Date,
  isContributing: false,
  notes: ""
}

export function FamilyMemberAddDialog({
  open,
  onOpenChange,
  onMemberAdded,
  onContributingMemberAdded
}: AddFamilyMemberDialogProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { isValid, isSubmitting }
  } = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberFormSchema),
    mode: "onChange",
    defaultValues
  })

  const isContributing = useWatch({ control, name: "isContributing" })

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) reset(defaultValues)
    onOpenChange(isOpen)
  }

  const onSubmit = async (values: AddMemberFormValues) => {
    try {
      const newMember = await createFamilyMember({
        name: values.name,
        relationship: values.relationship,
        dateOfBirth: format(values.dateOfBirth, "yyyy-MM-dd"),
        isContributing: values.isContributing,
        notes: values.notes || undefined
      })

      if (values.isContributing && onContributingMemberAdded) {
        onContributingMemberAdded(newMember)
      } else {
        onMemberAdded(newMember)
      }
      reset(defaultValues)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to create family member:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add Family Member
            <Info className="text-muted-foreground size-4" />
          </DialogTitle>
          <DialogDescription>
            Add a new family member to your profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogBody>
            <div className="grid gap-6 py-4">
              {/* Row 1: Full Name */}
              <Field label="Full Name" htmlFor="name" required>
                <Input
                  id="name"
                  placeholder="e.g., John Doe"
                  aria-required="true"
                  {...register("name")}
                />
              </Field>

              {/* Row 2: Relationship */}
              <Field label="Relationship" htmlFor="relationship" required>
                <Controller
                  control={control}
                  name="relationship"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
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
                  )}
                />
              </Field>

              {/* Row 3: Date of Birth */}
              <Field
                label="Date of Birth"
                htmlFor="dob"
                required
                helper="Used to calculate age for CPF and other calculations">
                <Controller
                  control={control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <DatePicker
                      id="dob"
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
                        id="contributing"
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                    )}
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
                  rows={3}
                  {...register("notes")}
                />
              </Field>
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
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting
                ? isContributing
                  ? "Saving..."
                  : "Adding..."
                : isContributing
                  ? "Next"
                  : "Add Member"}
            </Button>
          </DialogFooterSticky>
        </form>
      </DialogContent>
    </Dialog>
  )
}
