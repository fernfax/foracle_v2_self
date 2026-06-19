"use client"

import { useEffect, useState } from "react"
import {
  addCurrentHolding,
  CurrentHolding,
  updateCurrentHolding
} from "@/actions/current-holdings"
import { getFamilyMembers } from "@/actions/family-members"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import type { FamilyMember } from "@/db/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooterSticky,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

interface AddCurrentHoldingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onHoldingAdded: (holding: CurrentHolding) => void
  holding?: CurrentHolding | null
}

const holdingFormSchema = z.object({
  familyMemberId: z.string(),
  bankName: z.string().min(1, "Bank name is required"),
  holdingAmount: z.string().min(1, "Holding amount is required")
})
type HoldingFormValues = z.infer<typeof holdingFormSchema>

const emptyValues: HoldingFormValues = {
  familyMemberId: "none",
  bankName: "",
  holdingAmount: ""
}

const toFormValues = (holding?: CurrentHolding | null): HoldingFormValues =>
  holding
    ? {
        familyMemberId: holding.familyMemberId || "none",
        bankName: holding.bankName,
        holdingAmount: holding.holdingAmount
      }
    : emptyValues

export function CurrentHoldingAddDialog({
  open,
  onOpenChange,
  onHoldingAdded,
  holding
}: AddCurrentHoldingDialogProps) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<HoldingFormValues>({
    resolver: zodResolver(holdingFormSchema),
    defaultValues: emptyValues
  })

  // Fetch family members
  useEffect(() => {
    getFamilyMembers().then(setFamilyMembers)
  }, [])

  // Populate form when editing / reset for add
  useEffect(() => {
    if (open) reset(toFormValues(holding))
  }, [open, holding, reset])

  const onSubmit = async (values: HoldingFormValues) => {
    const finalFamilyMemberId =
      values.familyMemberId === "none" ? null : values.familyMemberId || null
    try {
      const resultHolding =
        holding && holding.id
          ? await updateCurrentHolding(holding.id, {
              familyMemberId: finalFamilyMemberId,
              bankName: values.bankName,
              holdingAmount: parseFloat(values.holdingAmount)
            })
          : await addCurrentHolding({
              familyMemberId: finalFamilyMemberId,
              bankName: values.bankName,
              holdingAmount: parseFloat(values.holdingAmount)
            })
      onHoldingAdded(resultHolding)
      reset(emptyValues)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save current holding:", error)
      alert("Failed to save current holding. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {holding ? "Edit Current Holding" : "Add Current Holding"}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          {holding && holding.updatedAt && (
            <p className="text-muted-foreground mt-2 text-xs">
              Last updated: {new Date(holding.updatedAt).toLocaleString()}
            </p>
          )}
          <form
            id="current-holding-form"
            onSubmit={handleSubmit(onSubmit)}
            className="mt-4 space-y-4">
            {/* Account Holder */}
            <div className="space-y-2">
              <Label htmlFor="familyMember">Account Holder</Label>
              <Controller
                control={control}
                name="familyMemberId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="familyMember">
                      <SelectValue placeholder="Select account holder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {familyMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Bank Name */}
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                placeholder="e.g., DBS, OCBC, UOB"
                {...register("bankName")}
              />
              {errors.bankName && (
                <p className="text-on-danger text-xs">
                  {errors.bankName.message}
                </p>
              )}
            </div>

            {/* Holding Amount */}
            <div className="space-y-2">
              <Label htmlFor="holdingAmount">Holding Amount</Label>
              <div className="relative">
                <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                  $
                </span>
                <Input
                  id="holdingAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-7"
                  {...register("holdingAmount")}
                />
              </div>
              {errors.holdingAmount && (
                <p className="text-on-danger text-xs">
                  {errors.holdingAmount.message}
                </p>
              )}
            </div>
          </form>
        </DialogBody>

        {/* Actions */}
        <DialogFooterSticky>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="current-holding-form"
            disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : holding ? "Update" : "Add"}
          </Button>
        </DialogFooterSticky>
      </DialogContent>
    </Dialog>
  )
}
