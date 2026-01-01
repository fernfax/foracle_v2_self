"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Lightbulb } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { WizardNavigation } from "../WizardNavigation";
import { getOrCreateSelfMember } from "@/lib/actions/family-members";
import type { FamilyMemberData } from "@/app/onboarding/OnboardingWizard";

interface UserDetailsStepProps {
  data: FamilyMemberData | null;
  onSave: (data: FamilyMemberData) => void;
  onNext: () => void;
  onBack: () => void;
}

export function UserDetailsStep({ data, onSave, onNext, onBack }: UserDetailsStepProps) {
  const [name, setName] = useState(data?.name || "");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(
    data?.dateOfBirth ? new Date(data.dateOfBirth) : undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [memberId, setMemberId] = useState(data?.id || "");

  // Update form when data changes (e.g., navigating back)
  useEffect(() => {
    if (data) {
      setName(data.name);
      setDateOfBirth(data.dateOfBirth ? new Date(data.dateOfBirth) : undefined);
      setMemberId(data.id || "");
    }
  }, [data]);

  const isFormValid = name && dateOfBirth;

  const handleSubmit = async () => {
    if (!isFormValid || !dateOfBirth) return;

    setIsSubmitting(true);
    try {
      const formattedDate = format(dateOfBirth, "yyyy-MM-dd");

      // Get or create the Self member (handles both new and existing cases)
      const savedMember = await getOrCreateSelfMember({
        name,
        dateOfBirth: formattedDate,
      });
      setMemberId(savedMember.id);

      onSave({
        id: savedMember.id,
        name,
        relationship: "Self",
        dateOfBirth: formattedDate,
        isContributing: true,
      });
      onNext();
    } catch (error) {
      console.error("Failed to save family member:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="space-y-6 flex-1">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Full Name <span className="text-red-500">*</span>
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
          <p className="text-xs text-muted-foreground">
            You can add other family members from the dashboard later
          </p>
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label>
            Date of Birth <span className="text-red-500">*</span>
          </Label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-background",
                  !dateOfBirth && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateOfBirth ? format(dateOfBirth, "MMMM do, yyyy") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateOfBirth}
                onSelect={(date) => {
                  setDateOfBirth(date);
                  setDatePickerOpen(false);
                }}
                initialFocus
                fixedWeeks
                captionLayout="dropdown"
                fromYear={1930}
                toYear={new Date().getFullYear()}
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            Used to calculate age for CPF rates and projections
          </p>
        </div>

        {/* Add More Later Info Box */}
        <div className="flex gap-3 p-4 rounded-xl bg-[#eaeffc] border border-blue-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <Lightbulb className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Add More Later
            </p>
            <p className="text-sm text-muted-foreground">
              You can add more family members from your dashboard after completing the initial setup.
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
  );
}
