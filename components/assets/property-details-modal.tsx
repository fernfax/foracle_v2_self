"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Home, Calendar, TrendingUp, Building2, Wallet, Check, X } from "lucide-react";
import { format } from "date-fns";

interface PropertyAsset {
  id: string;
  propertyName: string;
  purchaseDate: string;
  originalPurchasePrice: string;
  loanAmountTaken: string | null;
  outstandingLoan: string;
  monthlyLoanPayment: string;
  interestRate: string;
  principalCpfWithdrawn: string | null;
  housingGrantTaken: string | null;
  accruedInterestToDate: string | null;
  linkedExpenseId: string | null;
  paidByCpf: boolean | null;
}

interface PropertyDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: PropertyAsset | null;
}

export function PropertyDetailsModal({
  open,
  onOpenChange,
  property,
}: PropertyDetailsModalProps) {
  if (!property) return null;

  const loanTaken = parseFloat(property.loanAmountTaken || "0");
  const outstanding = parseFloat(property.outstandingLoan);
  const loanRepaid = loanTaken - outstanding;
  const progress = loanTaken > 0 ? (loanRepaid / loanTaken) * 100 : 100;

  const interestRepayment = (outstanding * (parseFloat(property.interestRate) / 100)) / 12;
  const principalRepayment = parseFloat(property.monthlyLoanPayment) - interestRepayment;

  const cpfWithdrawn = parseFloat(property.principalCpfWithdrawn || "0");
  const housingGrant = parseFloat(property.housingGrantTaken || "0");
  const accruedInterest = parseFloat(property.accruedInterestToDate || "0");
  const cpfReturn = cpfWithdrawn + housingGrant + accruedInterest;

  // Calculate estimated payoff
  const monthsRemaining = principalRepayment > 0 ? Math.ceil(outstanding / principalRepayment) : 0;
  const yearsRemaining = Math.floor(monthsRemaining / 12);
  const monthsRemainingAfterYears = monthsRemaining % 12;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[80vh] overflow-y-auto"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.82), rgba(255,255,255,0.82)), url(/whitescape-property.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[rgba(184,98,42,0.10)]">
              <Home className="h-6 w-6 text-[#7A3A0A]" />
            </div>
            <div>
              <DialogTitle className="text-xl">{property.propertyName}</DialogTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="h-3 w-3" />
                Purchased {format(new Date(property.purchaseDate), "MMMM d, yyyy")}
              </p>
              <Badge
                variant="outline"
                className={`text-xs font-medium mt-2 ${property.linkedExpenseId ? 'text-[#007A68] border-[rgba(0,196,170,0.25)]' : 'text-muted-foreground border-border'}`}
              >
                {property.linkedExpenseId ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                {property.linkedExpenseId ? 'In Expenses' : 'Not in Expenses'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-border rounded-lg p-4" style={{ backgroundColor: '#F0EBE0' }}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Building2 className="h-4 w-4" />
                <span className="text-sm">Purchase Price</span>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                ${parseFloat(property.originalPurchasePrice).toLocaleString()}
              </p>
            </div>
            <div className="border border-border rounded-lg p-4" style={{ backgroundColor: '#F0EBE0' }}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Wallet className="h-4 w-4" />
                <span className="text-sm">Loan Amount</span>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                ${loanTaken.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Progress Section */}
          {loanTaken > 0 && (
            <div className="border border-border rounded-xl p-5" style={{ backgroundColor: '#ffffff' }}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold" style={{ color: '#111827' }}>Loan Progress</h3>
                <Badge variant="secondary" className="bg-[rgba(0,196,170,0.12)] text-[#007A68] dark:bg-[#00C4AA] dark:text-[#00C4AA]">
                  {progress.toFixed(1)}% Complete
                </Badge>
              </div>
              <div className="h-4 bg-muted dark:bg-foreground/80 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, #00C4AA 0%, #5A9470 100%)`,
                  }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <span className="text-muted-foreground">Repaid: </span>
                  <span className="font-semibold text-[#007A68]">${loanRepaid.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Remaining: </span>
                  <span className="font-semibold text-[#7A5A00]">${outstanding.toLocaleString()}</span>
                </div>
              </div>
              {monthsRemaining > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Estimated payoff: {yearsRemaining > 0 ? `${yearsRemaining} years ` : ""}{monthsRemainingAfterYears > 0 ? `${monthsRemainingAfterYears} months` : ""}
                </p>
              )}
            </div>
          )}

          {/* Monthly Payment Breakdown */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: '#111827' }}>
              <TrendingUp className="h-4 w-4" />
              Monthly Payment Breakdown
            </h3>
            <div className="border border-border rounded-lg p-4 space-y-3" style={{ backgroundColor: '#ffffff' }}>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">Total Monthly Payment</span>
                <span className="text-xl font-semibold text-foreground">${parseFloat(property.monthlyLoanPayment).toLocaleString()}</span>
              </div>
              <div className="h-px bg-muted" />
              <div className="flex justify-between items-center">
                <span className="text-foreground">Principal Repayment</span>
                <span className="font-medium text-[#007A68]">${principalRepayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground">Interest Payment</span>
                <span className="font-medium text-[#7A5A00]">${interestRepayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground">Interest Rate</span>
                <span className="font-medium text-foreground">{parseFloat(property.interestRate).toFixed(2)}% p.a.</span>
              </div>
            </div>
          </div>

          {/* CPF Details */}
          {(cpfWithdrawn > 0 || housingGrant > 0 || accruedInterest > 0) && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">CPF & Grants</h3>
              <div className="border border-border rounded-lg p-4 space-y-3" style={{ backgroundColor: '#ffffff' }}>
                {cpfWithdrawn > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Principal CPF Withdrawn</span>
                    <span className="font-medium text-foreground">${cpfWithdrawn.toLocaleString()}</span>
                  </div>
                )}
                {housingGrant > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Housing Grant Taken</span>
                    <span className="font-medium text-foreground">${housingGrant.toLocaleString()}</span>
                  </div>
                )}
                {accruedInterest > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Accrued Interest to Date</span>
                    <span className="font-medium text-foreground">${accruedInterest.toLocaleString()}</span>
                  </div>
                )}
                <div className="h-px bg-muted" />
                <div className="flex justify-between items-center">
                  <span className="font-medium text-[#7A3A0A]">Amount to Return to CPF</span>
                  <span className="font-semibold text-[#7A3A0A]">${cpfReturn.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
