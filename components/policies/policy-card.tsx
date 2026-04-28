"use client";

import { useState } from "react";
import { Check, X, MoreVertical, Pencil, Trash2, Expand } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PolicyCardProps {
  policy: {
    id: string;
    provider: string;
    policyNumber: string | null;
    policyType: string;
    status: string | null;
    startDate: string;
    maturityDate: string | null;
    coverageUntilAge: number | null;
    premiumAmount: string;
    premiumFrequency: string;
    totalPremiumDuration: number | null;
    coverageOptions: string | null;
    description: string | null;
    isActive: boolean | null;
    linkedExpenseId: string | null;
  };
  familyMemberName?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PolicyCard({ policy, familyMemberName, onEdit, onDelete }: PolicyCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getCoverageOptions = () => {
    if (!policy.coverageOptions) return [];
    try {
      const options = JSON.parse(policy.coverageOptions);
      return Object.entries(options)
        .filter(([_, value]) => value && parseFloat(value as string) > 0)
        .map(([key, value]) => {
          // Convert camelCase to readable format
          const label = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
          return { label, amount: parseFloat(value as string) };
        });
    } catch {
      return [];
    }
  };

  const coverages = getCoverageOptions();
  const isInExpenses = !!policy.linkedExpenseId;

  return (
    <>
      <div className="bg-white rounded-lg border border-border p-4 hover:shadow-md transition-shadow relative cursor-pointer" onClick={() => setIsModalOpen(true)}>
        {/* Expand Icon */}
        <Expand className="h-3.5 w-3.5 text-muted-foreground absolute top-3 right-3" />

        {/* Compact Header */}
        <div className="pr-8 mb-3">
          <h3 className="text-lg font-bold text-foreground mb-2">
            {policy.policyType}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-xs font-medium uppercase text-[#7A3A0A] border-[rgba(184,98,42,0.25)]">
              {policy.provider}
            </Badge>
            <Badge variant="outline" className="text-xs font-medium uppercase text-[#007A68] border-[rgba(0,196,170,0.25)] bg-[rgba(0,196,170,0.12)]">
              {policy.status || "ACTIVE"}
            </Badge>
          </div>
          <div className={`flex items-center gap-1 mt-2 text-xs ${isInExpenses ? 'text-[#007A68]' : 'text-muted-foreground'}`}>
            {isInExpenses ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            <span>{isInExpenses ? 'In Expenses' : 'Not in Expenses'}</span>
          </div>
        </div>

        {/* Compact Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-foreground">Premium:</span>
            <span className="font-medium text-[#007A68]">
              ${parseFloat(policy.premiumAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /{policy.premiumFrequency.toLowerCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Policy Details</DialogTitle>
            <DialogDescription>
              {familyMemberName}'s {policy.policyType} Policy
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Edit Action */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsModalOpen(false);
                  onEdit?.();
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Policy
              </Button>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs font-medium uppercase">
                {policy.policyType}
              </Badge>
              <Badge variant="outline" className="text-xs font-medium uppercase text-[#7A3A0A] border-[rgba(184,98,42,0.25)]">
                {policy.provider}
              </Badge>
              <Badge variant="outline" className="text-xs font-medium uppercase text-[#007A68] border-[rgba(0,196,170,0.25)] bg-[rgba(0,196,170,0.12)]">
                {policy.status || "ACTIVE"}
              </Badge>
              <Badge variant="outline" className={`text-xs font-medium ${isInExpenses ? 'text-[#007A68] border-[rgba(0,196,170,0.25)]' : 'text-muted-foreground border-border'}`}>
                {isInExpenses ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                {isInExpenses ? 'In Expenses' : 'Not in Expenses'}
              </Badge>
            </div>

            {/* Policy Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Policy Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-foreground">Policy Number</p>
                  <p className="font-medium">{policy.policyNumber || "TBC"}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground">Start Date</p>
                  <p className="font-medium">{format(new Date(policy.startDate), "MMMM d, yyyy")}</p>
                </div>
                {policy.maturityDate && (
                  <div>
                    <p className="text-sm text-foreground">End Date</p>
                    <p className="font-medium">{format(new Date(policy.maturityDate), "MMMM d, yyyy")}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-foreground">Premium</p>
                  <p className="font-medium text-[#007A68]">
                    ${parseFloat(policy.premiumAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /{policy.premiumFrequency.toLowerCase()}
                  </p>
                </div>
                {policy.totalPremiumDuration && (
                  <div>
                    <p className="text-sm text-foreground">Premium Duration</p>
                    <p className="font-medium">{policy.totalPremiumDuration} years</p>
                  </div>
                )}
                {policy.coverageUntilAge && (
                  <div>
                    <p className="text-sm text-foreground">Coverage Until Age</p>
                    <p className="font-medium">{policy.coverageUntilAge}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Coverage Details */}
            {coverages.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Coverage</h3>
                <div className="grid grid-cols-2 gap-4">
                  {coverages.map((coverage, index) => (
                    <div key={index}>
                      <p className="text-sm text-foreground">{coverage.label}</p>
                      <p className="font-medium">
                        ${coverage.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {policy.description && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Description</h3>
                <p className="text-sm text-foreground">{policy.description}</p>
              </div>
            )}

            {/* Delete Action - at bottom */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsModalOpen(false);
                  onDelete?.();
                }}
                className="text-[#8B0000] hover:text-[#8B0000] w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Policy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
