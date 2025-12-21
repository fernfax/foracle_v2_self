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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950">
              <Home className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl">{property.propertyName}</DialogTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="h-3 w-3" />
                Purchased {format(new Date(property.purchaseDate), "MMMM d, yyyy")}
              </p>
              <Badge
                variant="outline"
                className={`text-xs font-medium mt-2 ${property.linkedExpenseId ? 'text-green-600 border-green-200' : 'text-gray-400 border-gray-200'}`}
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
            <div className="border border-gray-200 rounded-lg p-4" style={{ backgroundColor: '#f9fafb' }}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Building2 className="h-4 w-4" />
                <span className="text-sm">Purchase Price</span>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-gray-900">
                ${parseFloat(property.originalPurchasePrice).toLocaleString()}
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4" style={{ backgroundColor: '#f9fafb' }}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Wallet className="h-4 w-4" />
                <span className="text-sm">Loan Amount</span>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-gray-900">
                ${loanTaken.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Progress Section */}
          {loanTaken > 0 && (
            <div className="border border-gray-200 rounded-xl p-5" style={{ backgroundColor: '#ffffff' }}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold" style={{ color: '#111827' }}>Loan Progress</h3>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  {progress.toFixed(1)}% Complete
                </Badge>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, #10b981 0%, #34d399 100%)`,
                  }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <span className="text-muted-foreground">Repaid: </span>
                  <span className="font-semibold text-emerald-600">${loanRepaid.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Remaining: </span>
                  <span className="font-semibold text-amber-600">${outstanding.toLocaleString()}</span>
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
            <div className="border border-gray-200 rounded-lg p-4 space-y-3" style={{ backgroundColor: '#ffffff' }}>
              <div className="flex justify-between items-center">
                <span className="text-gray-800 font-medium">Total Monthly Payment</span>
                <span className="text-xl font-semibold text-gray-900">${parseFloat(property.monthlyLoanPayment).toLocaleString()}</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-gray-800">Principal Repayment</span>
                <span className="font-medium text-emerald-600">${principalRepayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-800">Interest Payment</span>
                <span className="font-medium text-amber-600">${interestRepayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-800">Interest Rate</span>
                <span className="font-medium text-gray-900">{parseFloat(property.interestRate).toFixed(2)}% p.a.</span>
              </div>
            </div>
          </div>

          {/* CPF Details */}
          {(cpfWithdrawn > 0 || housingGrant > 0 || accruedInterest > 0) && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">CPF & Grants</h3>
              <div className="border border-gray-200 rounded-lg p-4 space-y-3" style={{ backgroundColor: '#ffffff' }}>
                {cpfWithdrawn > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-800">Principal CPF Withdrawn</span>
                    <span className="font-medium text-gray-900">${cpfWithdrawn.toLocaleString()}</span>
                  </div>
                )}
                {housingGrant > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-800">Housing Grant Taken</span>
                    <span className="font-medium text-gray-900">${housingGrant.toLocaleString()}</span>
                  </div>
                )}
                {accruedInterest > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-800">Accrued Interest to Date</span>
                    <span className="font-medium text-gray-900">${accruedInterest.toLocaleString()}</span>
                  </div>
                )}
                <div className="h-px bg-gray-200" />
                <div className="flex justify-between items-center">
                  <span className="font-medium text-blue-700">Amount to Return to CPF</span>
                  <span className="font-semibold text-blue-700">${cpfReturn.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
