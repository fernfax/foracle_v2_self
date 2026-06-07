"use client";

import { useState } from "react";
import { Check, X, Pencil, Trash2, ChevronRight } from "lucide-react";
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

  // Primary sum assured: largest of death, CI, TPD
  const primaryCoverage = coverages.length > 0
    ? coverages.reduce((max, c) => c.amount > max.amount ? c : max, coverages[0])
    : null;

  // Annual premium
  const premiumAmt = parseFloat(policy.premiumAmount);
  let annualPremium = premiumAmt;
  switch (policy.premiumFrequency.toLowerCase()) {
    case "monthly":   annualPremium = premiumAmt * 12; break;
    case "quarterly": annualPremium = premiumAmt * 4;  break;
  }

  // Payable term label
  const payableTerm = policy.coverageUntilAge
    ? `To age ${policy.coverageUntilAge}`
    : policy.totalPremiumDuration
    ? `${policy.totalPremiumDuration} yr premium`
    : policy.maturityDate
    ? `Until ${format(new Date(policy.maturityDate), "yyyy")}`
    : null;

  return (
    <>
      <div
        className="bg-white rounded-lg border border-border p-4 hover:shadow-md hover:border-border/80 ring-1 ring-transparent hover:ring-border/40 transition-all cursor-pointer flex flex-col gap-3"
        onClick={() => setIsModalOpen(true)}
      >
        {/* Header: type + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              {policy.policyType}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{policy.provider}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge variant="outline" className="text-xs font-medium uppercase text-[#007A68] border-[rgba(0,196,170,0.25)] bg-[rgba(0,196,170,0.12)]">
              {policy.status || "Active"}
            </Badge>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Primary sum assured */}
        {primaryCoverage && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{primaryCoverage.label}</p>
            <p className="text-xl font-bold text-foreground">
              ${primaryCoverage.amount >= 1000
                ? `${(primaryCoverage.amount / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}k`
                : primaryCoverage.amount.toLocaleString()}
            </p>
          </div>
        )}

        {/* Footer: premium + term */}
        <div className="flex items-end justify-between mt-auto pt-1 border-t border-border/50">
          <div>
            <p className="text-xs text-muted-foreground">Premium</p>
            <p className="text-sm font-medium text-[#007A68]">
              ${premiumAmt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              <span className="text-xs text-muted-foreground font-normal"> /{policy.premiumFrequency.toLowerCase()}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              ${annualPremium.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} /yr
            </p>
          </div>
          {payableTerm && (
            <p className="text-xs text-muted-foreground text-right">{payableTerm}</p>
          )}
        </div>

        {/* In expenses indicator */}
        {isInExpenses && (
          <div className="flex items-center gap-1 text-xs text-[#007A68] -mt-1">
            <Check className="h-3 w-3" />
            <span>In Expenses</span>
          </div>
        )}
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
              <Badge variant="outline" className="text-xs font-medium text-[#7A3A0A] border-[rgba(184,98,42,0.25)]">
                {policy.provider}
              </Badge>
              <Badge variant="outline" className="text-xs font-medium uppercase text-[#007A68] border-[rgba(0,196,170,0.25)] bg-[rgba(0,196,170,0.12)]">
                {policy.status || "Active"}
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
