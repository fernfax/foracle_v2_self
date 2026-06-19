"use client"

import { useEffect, useState } from "react"
import { getOrCreateSelfMember } from "@/actions/family-members"
import { format } from "date-fns"
import { Lightbulb } from "lucide-react"
import { toast } from "sonner"

import { DatePicker } from "@/components/ui/date-picker"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { OnboardingWizardNavigation } from "@/components/onboarding/onboarding-wizard-navigation"
import type { FamilyMemberData } from "@/app/onboarding/onboarding-wizard"

interface UserDetailsStepProps {
  data: FamilyMemberData | null
  onSave: (data: FamilyMemberData) => void
  onNext: () => void
  onBack: () => void
}

export function StepUserDetails({
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
  const [_memberId, setMemberId] = useState(data?.id || "")

  // Update form when data changes (e.g., navigating back)
  useEffect(() => {
    if (data) {
      setName(data.name)
      setDateOfBirth(data.dateOfBirth ? new Date(data.dateOfBirth) : undefined)
      setMemberId(data.id || "")
    }
  }, [data])

  const trimmedName = name.trim()
  const isFormValid = trimmedName && dateOfBirth

  const handleSubmit = async () => {
    if (!isFormValid || !dateOfBirth) return

    setIsSubmitting(true)
    try {
      const formattedDate = format(dateOfBirth, "yyyy-MM-dd")

      // Get or create the Self member (handles both new and existing cases)
      const savedMember = await getOrCreateSelfMember({
        name: trimmedName,
        dateOfBirth: formattedDate
      })
      setMemberId(savedMember.id)

      onSave({
        id: savedMember.id,
        name: trimmedName,
        relationship: "Self",
        dateOfBirth: formattedDate,
        isContributing: true
      })
      onNext()
    } catch (error) {
      console.error("Failed to save family member:", error)
      toast.error("Could not save your details. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-6">
        {/* Full Name */}
        <Field label="Full Name" htmlFor="name" required>
          <Input
            id="name"
            placeholder="e.g., John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-required="true"
          />
        </Field>

        {/* Relationship - Locked to Self */}
        <Field
          label="Relationship"
          helper="You can add other family members from the dashboard later">
          <Input
            value="Self"
            disabled
            className="bg-muted text-muted-foreground"
          />
        </Field>

        {/* Date of Birth */}
        <Field
          label="Date of Birth"
          htmlFor="dob"
          required
          helper="Used to calculate age for CPF rates and projections">
          <DatePicker
            id="dob"
            value={dateOfBirth}
            onChange={setDateOfBirth}
            fromYear={1930}
            disableFuture
          />
        </Field>

        {/* Add More Later Info Box */}
        <div className="border-brand-terracotta/[0.25] bg-brand-terracotta/[0.06] flex gap-3 rounded-xl border p-4">
          <div className="bg-brand-terracotta/[0.1] flex size-8 shrink-0 items-center justify-center rounded-full">
            <Lightbulb className="text-on-warning size-4" />
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

      <OnboardingWizardNavigation
        onBack={onBack}
        onNext={handleSubmit}
        canProceed={!!isFormValid}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
