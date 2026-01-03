"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Car, Calendar, Wallet, Clock, Check, X } from "lucide-react";
import { format, differenceInDays, differenceInMonths, differenceInYears } from "date-fns";

interface VehicleAsset {
  id: string;
  vehicleName: string;
  purchaseDate: string;
  coeExpiryDate: string | null;
  originalPurchasePrice: string;
  loanAmountTaken: string | null;
  loanAmountRepaid: string | null;
  monthlyLoanPayment: string | null;
  linkedExpenseId: string | null;
}

interface VehicleDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: VehicleAsset | null;
}

export function VehicleDetailsModal({
  open,
  onOpenChange,
  vehicle,
}: VehicleDetailsModalProps) {
  if (!vehicle) return null;

  const loanTaken = parseFloat(vehicle.loanAmountTaken || "0");
  const loanRepaid = parseFloat(vehicle.loanAmountRepaid || "0");
  const outstandingLoan = Math.max(0, loanTaken - loanRepaid);
  const progress = loanTaken > 0 ? (loanRepaid / loanTaken) * 100 : 100;
  const monthlyPayment = parseFloat(vehicle.monthlyLoanPayment || "0");

  // Calculate estimated payoff
  const monthsRemaining = monthlyPayment > 0 ? Math.ceil(outstandingLoan / monthlyPayment) : 0;
  const yearsRemaining = Math.floor(monthsRemaining / 12);
  const monthsRemainingAfterYears = monthsRemaining % 12;

  // Calculate COE countdown
  const getCoeCountdown = () => {
    if (!vehicle.coeExpiryDate) return null;

    const expiryDate = new Date(vehicle.coeExpiryDate);
    const today = new Date();

    if (expiryDate <= today) {
      return { expired: true, text: "COE Expired" };
    }

    const days = differenceInDays(expiryDate, today);
    const months = differenceInMonths(expiryDate, today);
    const years = differenceInYears(expiryDate, today);

    if (years > 0) {
      const remainingMonths = months - (years * 12);
      return {
        expired: false,
        text: `${years} year${years > 1 ? 's' : ''} ${remainingMonths > 0 ? `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`,
        days
      };
    } else if (months > 0) {
      return { expired: false, text: `${months} month${months > 1 ? 's' : ''}`, days };
    } else {
      return { expired: false, text: `${days} day${days > 1 ? 's' : ''}`, days };
    }
  };

  const coeCountdown = getCoeCountdown();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100">
              <Car className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">{vehicle.vehicleName}</DialogTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="h-3 w-3" />
                Purchased {format(new Date(vehicle.purchaseDate), "MMMM d, yyyy")}
              </p>
              <Badge
                variant="outline"
                className={`text-xs font-medium mt-2 ${vehicle.linkedExpenseId ? 'text-green-600 border-green-200' : 'text-gray-400 border-gray-200'}`}
              >
                {vehicle.linkedExpenseId ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                {vehicle.linkedExpenseId ? 'In Expenses' : 'Not in Expenses'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4" style={{ backgroundColor: '#f9fafb' }}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Car className="h-4 w-4" />
                <span className="text-sm">Purchase Price</span>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-gray-900">
                ${parseFloat(vehicle.originalPurchasePrice).toLocaleString()}
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

          {/* COE Expiry Section */}
          {vehicle.coeExpiryDate && coeCountdown && (
            <div className="border border-gray-200 rounded-xl p-5" style={{ backgroundColor: '#ffffff' }}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold flex items-center gap-2" style={{ color: '#111827' }}>
                  <Clock className="h-4 w-4" />
                  COE Expiry
                </h3>
                <Badge
                  variant="secondary"
                  className={coeCountdown.expired
                    ? "bg-red-100 text-red-700"
                    : coeCountdown.days && coeCountdown.days < 365
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }
                >
                  {coeCountdown.expired ? "Expired" : `${coeCountdown.text} remaining`}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <span className="text-muted-foreground">Expiry Date: </span>
                  <span className="font-medium text-gray-900">
                    {format(new Date(vehicle.coeExpiryDate), "MMMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>
          )}

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
                    background: `linear-gradient(90deg, #a855f7 0%, #c084fc 100%)`,
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
                  <span className="font-semibold text-amber-600">${outstandingLoan.toLocaleString()}</span>
                </div>
              </div>
              {monthsRemaining > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Estimated payoff: {yearsRemaining > 0 ? `${yearsRemaining} years ` : ""}{monthsRemainingAfterYears > 0 ? `${monthsRemainingAfterYears} months` : ""}
                </p>
              )}
            </div>
          )}

          {/* Monthly Payment Details */}
          {monthlyPayment > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2" style={{ color: '#111827' }}>
                Monthly Payment
              </h3>
              <div className="border border-gray-200 rounded-lg p-4 space-y-3" style={{ backgroundColor: '#ffffff' }}>
                <div className="flex justify-between items-center">
                  <span className="text-gray-800 font-medium">Monthly Loan Payment</span>
                  <span className="text-xl font-semibold text-gray-900">${monthlyPayment.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
