"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, Info } from "lucide-react";
import { StepIndicator } from "@/components/ui/step-indicator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AddCpfDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack?: (cpfData?: { oa: number; sa: number; ma: number }) => void;
  onComplete: (cpfDetails: { oa: number; sa: number; ma: number }) => void;
  totalCpfContribution: number;
  familyMemberName?: string;
  initialOA?: number;
  initialSA?: number;
  initialMA?: number;
  isStandalone?: boolean; // When true, hides Back button and step indicator
}

export function AddCpfDetailsDialog({
  open,
  onOpenChange,
  onBack,
  onComplete,
  totalCpfContribution,
  familyMemberName,
  initialOA,
  initialSA,
  initialMA,
  isStandalone = false,
}: AddCpfDetailsDialogProps) {
  const [ordinaryAccount, setOrdinaryAccount] = useState("");
  const [specialAccount, setSpecialAccount] = useState("");
  const [medisaveAccount, setMedisaveAccount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialValues, setInitialValues] = useState<{oa: string; sa: string; ma: string} | null>(null);

  // Format number to 2 decimal places
  const formatDecimal = (value: number | undefined): string => {
    if (value === undefined || value === 0) return "";
    return value.toFixed(2);
  };

  // Format on blur to show 2 decimal places
  const handleBlur = (value: string, setter: (v: string) => void) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      setter(num.toFixed(2));
    }
  };

  // Pre-populate fields when initial values are provided
  useEffect(() => {
    if (open) {
      const oa = formatDecimal(initialOA);
      const sa = formatDecimal(initialSA);
      const ma = formatDecimal(initialMA);

      setOrdinaryAccount(oa);
      setSpecialAccount(sa);
      setMedisaveAccount(ma);
      setInitialValues({ oa, sa, ma });
      setHasUnsavedChanges(false);
    }
  }, [open, initialOA, initialSA, initialMA]);

  // Track changes
  useEffect(() => {
    if (!initialValues || !open) {
      setHasUnsavedChanges(false);
      return;
    }

    const hasChanges =
      ordinaryAccount !== initialValues.oa ||
      specialAccount !== initialValues.sa ||
      medisaveAccount !== initialValues.ma;

    setHasUnsavedChanges(hasChanges);
  }, [initialValues, ordinaryAccount, specialAccount, medisaveAccount, open]);

  const resetForm = () => {
    setOrdinaryAccount("");
    setSpecialAccount("");
    setMedisaveAccount("");
  };

  const handleClose = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onOpenChange(open);
    }
  };

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false);
    setHasUnsavedChanges(false);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete({
        oa: parseFloat(ordinaryAccount) || 0,
        sa: parseFloat(specialAccount) || 0,
        ma: parseFloat(medisaveAccount) || 0,
      });
      resetForm();
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save CPF details:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    // Pass current CPF values when going back
    const currentValues = {
      oa: parseFloat(ordinaryAccount) || 0,
      sa: parseFloat(specialAccount) || 0,
      ma: parseFloat(medisaveAccount) || 0,
    };
    onBack?.(currentValues);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {initialOA !== undefined || initialSA !== undefined || initialMA !== undefined ? 'Edit' : 'Add'} CPF Account Details {familyMemberName && `for ${familyMemberName}`}
            <Info className="h-4 w-4 text-muted-foreground" />
          </DialogTitle>
          <DialogDescription>
            Allocate the CPF contributions across the three CPF accounts.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Ordinary Account (OA) */}
          <div className="space-y-2">
            <Label htmlFor="oa">Ordinary Account (OA)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="oa"
                type="number"
                placeholder="0.00"
                value={ordinaryAccount}
                onChange={(e) => setOrdinaryAccount(e.target.value)}
                onBlur={() => handleBlur(ordinaryAccount, setOrdinaryAccount)}
                min="0"
                step="0.01"
                className="bg-white pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              For housing, insurance, investment, and education
            </p>
          </div>

          {/* Special Account (SA) */}
          <div className="space-y-2">
            <Label htmlFor="sa">Special Account (SA)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="sa"
                type="number"
                placeholder="0.00"
                value={specialAccount}
                onChange={(e) => setSpecialAccount(e.target.value)}
                onBlur={() => handleBlur(specialAccount, setSpecialAccount)}
                min="0"
                step="0.01"
                className="bg-white pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              For retirement and investment in approved assets
            </p>
          </div>

          {/* Medisave Account (MA) */}
          <div className="space-y-2">
            <Label htmlFor="ma">Medisave Account (MA)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="ma"
                type="number"
                placeholder="0.00"
                value={medisaveAccount}
                onChange={(e) => setMedisaveAccount(e.target.value)}
                onBlur={() => handleBlur(medisaveAccount, setMedisaveAccount)}
                min="0"
                step="0.01"
                className="bg-white pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              For hospitalization expenses and approved medical insurance
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="space-y-4">
          {!isStandalone && <StepIndicator currentStep={3} totalSteps={3} />}
          <div className={`flex gap-3 ${isStandalone ? 'justify-end' : 'justify-between'}`}>
            {!isStandalone && (
              <Button variant="ghost" onClick={handleBack} disabled={isSubmitting}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => handleClose(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : isStandalone ? "Save" : "Save & Finish"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to close? All your changes will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continue Editing</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmClose}>Discard Changes</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
