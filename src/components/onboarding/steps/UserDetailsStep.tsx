"use client"

import { useEffect, useState } from "react"
import { getOrCreateSelfMember } from "@/actions/family-members"
import { format } from "date-fns"
import { CalendarIcon, Lightbulb } from "lucide-react"

import { today } from "@/lib/date-helpers"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { WizardNavigation } from "@/components/onboarding/WizardNavigation"
import type { FamilyMemberData } from "@/app/onboarding/OnboardingWizard"

interface UserDetailsStepProps {
  data: FamilyMemberData | null
  onSave: (data: FamilyMemberData) => void
  onNext: () => void
  onBack: () => void
}

export function UserDetailsStep({
  data,
  onSave,
  onNext,
  onBack
}: UserDetailsStepProps) {
  const [name, setName] = useState(data?.name || "")
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(
    data?.dateOfBirth ? new Date(data.dateOfBirth) : undefined
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [_memberId, setMemberId] = useState(data?.id || "")

  // Update form when data changes (e.g., navigating back)
  useEffect(() => {
    if (data) {
      setName(data.name)
      setDateOfBirth(data.dateOfBirth ? new Date(data.dateOfBirth) : undefined)
      setMemberId(data.id || "")
    }
  }, [data])

  const isFormValid = name && dateOfBirth

  const handleSubmit = async () => {
    if (!isFormValid || !dateOfBirth) return

    setIsSubmitting(true)
    try {
      const formattedDate = format(dateOfBirth, "yyyy-MM-dd")

      // Get or create the Self member (handles both new and existing cases)
      const savedMember = await getOrCreateSelfMember({
        name,
        dateOfBirth: formattedDate
      })
      setMemberId(savedMember.id)

      onSave({
        id: savedMember.id,
        name,
        relationship: "Self",
        dateOfBirth: formattedDate,
        isContributing: true
      })
      onNext()
    } catch (error) {
      console.error("Failed to save family member:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-6">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Full Name <span className="text-[#8B0000]">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g., John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-background"
          />
        </div>

        {/* Relationship - Locked to Self */}
        <div className="space-y-2">
          <Label>Relationship</Label>
          <Input
            value="Self"
            disabled
            className="bg-muted text-muted-foreground"
          />
          <p className="text-muted-foreground text-xs">
            You can add other family members from the dashboard later
          </p>
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label>
            Date of Birth <span className="text-[#8B0000]">*</span>
          </Label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "bg-background w-full justify-start text-left font-normal",
                  !dateOfBirth && "text-muted-foreground"
                )}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateOfBirth
                  ? format(dateOfBirth, "MMMM do, yyyy")
                  : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateOfBirth}
                onSelect={(date) => {
                  setDateOfBirth(date)
                  setDatePickerOpen(false)
                }}
                initialFocus
                fixedWeeks
                captionLayout="dropdown"
                fromYear={1930}
                toYear={new Date().getFullYear()}
                disabled={{ after: today() }}
              />
            </PopoverContent>
          </Popover>
          <p className="text-muted-foreground text-xs">
            Used to calculate age for CPF rates and projections
          </p>
        </div>

        {/* Add More Later Info Box */}
        <div className="flex gap-3 rounded-xl border border-[rgba(184,98,42,0.25)] bg-[rgba(184,98,42,0.06)] p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(184,98,42,0.10)]">
            <Lightbulb className="h-4 w-4 text-[#7A5A00]" />
          </div>
          <div>
            <p className="text-foreground text-sm font-medium">
              Add More Later
            </p>
            <p className="text-muted-foreground text-sm">
              You can add more family members from your dashboard after
              completing the initial setup.
            </p>
          </div>
        </div>
      </div>

      <WizardNavigation
        onBack={onBack}
        onNext={handleSubmit}
        canProceed={!!isFormValid}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
