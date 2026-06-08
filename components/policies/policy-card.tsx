"use client";

import { useState } from "react";
import { Check, X, Pencil, Trash2, ChevronRight, AlertTriangle } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
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

function getExpiryAlert(maturityDate: string | null, status: string | null): {
  label: string;
  days: number;
  level: "warning" | "critical";
} | null {
  if (!maturityDate) return null;
  const st = (status ?? "active").toLowerCase();
  if (st !== "active") return null;
  const days = differenceInDays(parseISO(maturityDate), new Date());
  if (days < 0 || days > 365) return null;
  const months = Math.ceil(days / 30);
  return {
    days,
    level: days < 90 ? "critical" : "warning",
    label: days < 30
      ? `Expires in ${days}d`
      : days < 90
      ? `Expires in ${months}mo`
      : `Expires in ${months} months`,
  };
}

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
    planName: string | null;
    premiumAmountCPF: string | null;
    cashValue: string | null;
    cashValueDate: string | null;
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
  const expiryAlert = getExpiryAlert(policy.maturityDate, policy.status);

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
    ? `Until ${format(parseISO(policy.maturityDate), "yyyy")}`
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
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {policy.provider}{policy.planName ? ` · ${policy.planName}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {expiryAlert ? (
              <Badge
                variant="outline"
                className={`text-xs font-medium flex items-center gap-1 ${
                  expiryAlert.level === "critical"
                    ? "text-[#8B0000] border-[rgba(139,0,0,0.25)] bg-[rgba(224,85,85,0.08)]"
                    : "text-[#7A5C00] border-[rgba(212,168,67,0.35)] bg-[rgba(212,168,67,0.10)]"
                }`}
              >
                <AlertTriangle className="h-3 w-3" />
                {expiryAlert.label}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs font-medium uppercase text-[#007A68] border-[rgba(0,196,170,0.25)] bg-[rgba(0,196,170,0.12)]">
                {policy.status || "Active"}
              </Badge>
            )}
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
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-muted-foreground">
                ${annualPremium.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} /yr
              </p>
              {policy.premiumAmountCPF && parseFloat(policy.premiumAmountCPF) > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
                  +${parseFloat(policy.premiumAmountCPF).toLocaleString(undefined, { maximumFractionDigits: 0 })} CPF
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            {payableTerm && (
              <p className="text-xs text-muted-foreground">{payableTerm}</p>
            )}
            {policy.cashValue && parseFloat(policy.cashValue) > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                CV ${parseFloat(policy.cashValue) >= 1000
                  ? `${(parseFloat(policy.cashValue) / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`
                  : parseFloat(policy.cashValue).toLocaleString()}
              </p>
            )}
          </div>
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
            {/* Expiry alert banner */}
            {expiryAlert && (
              <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-sm ${
                expiryAlert.level === "critical"
                  ? "bg-[rgba(224,85,85,0.08)] border border-[rgba(139,0,0,0.2)] text-[#8B0000]"
                  : "bg-[rgba(212,168,67,0.10)] border border-[rgba(212,168,67,0.3)] text-[#7A5C00]"
              }`}>
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{expiryAlert.label}</p>
                  <p className="text-xs mt-0.5 opacity-80">
                    {expiryAlert.level === "critical"
                      ? "Review your coverage and arrange renewal before the policy lapses."
                      : "This policy matures within the year — plan ahead for renewal or replacement coverage."}
                  </p>
                </div>
              </div>
            )}

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
                {policy.planName && (
                  <div className="col-span-2">
                    <p className="text-sm text-foreground">Plan Name</p>
                    <p className="font-medium">{policy.planName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-foreground">Policy Number</p>
                  <p className="font-medium">{policy.policyNumber || "TBC"}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground">Start Date</p>
                  <p className="font-medium">{format(parseISO(policy.startDate), "MMMM d, yyyy")}</p>
                </div>
                {policy.maturityDate && (
                  <div>
                    <p className="text-sm text-foreground">End Date</p>
                    <p className="font-medium">{format(parseISO(policy.maturityDate), "MMMM d, yyyy")}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-foreground">Premium (Cash)</p>
                  <p className="font-medium text-[#007A68]">
                    ${parseFloat(policy.premiumAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /{policy.premiumFrequency.toLowerCase()}
                  </p>
                </div>
                {policy.premiumAmountCPF && parseFloat(policy.premiumAmountCPF) > 0 && (
                  <div>
                    <p className="text-sm text-foreground">Premium (CPF)</p>
                    <p className="font-medium">
                      ${parseFloat(policy.premiumAmountCPF).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /{policy.premiumFrequency.toLowerCase()}
                    </p>
                  </div>
                )}
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

            {/* Cash Value */}
            {policy.cashValue && parseFloat(policy.cashValue) > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Cash / Surrender Value</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-foreground">Cash Value</p>
                    <p className="font-medium">
                      ${parseFloat(policy.cashValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  {policy.cashValueDate && (
                    <div>
                      <p className="text-sm text-foreground">As At</p>
                      <p className="font-medium">{format(parseISO(policy.cashValueDate), "MMMM d, yyyy")}</p>
                    </div>
                  )}
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
