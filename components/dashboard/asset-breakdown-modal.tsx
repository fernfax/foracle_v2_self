"use client";

import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Home, Car, TrendingUp, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface PropertyAsset {
  id: string;
  propertyName: string;
  originalPurchasePrice: string;
  outstandingLoan: string;
  monthlyLoanPayment: string | null;
  isActive: boolean | null;
}

interface VehicleAsset {
  id: string;
  vehicleName: string;
  originalPurchasePrice: string;
  loanAmountTaken: string | null;
  loanAmountRepaid: string | null;
  monthlyLoanPayment: string | null;
  isActive: boolean | null;
}

interface AssetBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyAssets: PropertyAsset[];
  vehicleAssets: VehicleAsset[];
}

export function AssetBreakdownModal({
  open,
  onOpenChange,
  propertyAssets,
  vehicleAssets,
}: AssetBreakdownModalProps) {
  const router = useRouter();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{ type: "property" | "vehicle"; name: string } | null>(null);

  // Calculate property equity
  const calculatePropertyEquity = (property: PropertyAsset) => {
    const purchasePrice = parseFloat(property.originalPurchasePrice);
    const outstandingLoan = parseFloat(property.outstandingLoan);
    return purchasePrice - outstandingLoan;
  };

  // Calculate vehicle equity
  const calculateVehicleEquity = (vehicle: VehicleAsset) => {
    const purchasePrice = parseFloat(vehicle.originalPurchasePrice);
    const loanTaken = parseFloat(vehicle.loanAmountTaken || "0");
    const loanRepaid = parseFloat(vehicle.loanAmountRepaid || "0");
    const remainingLoan = loanTaken - loanRepaid;
    return purchasePrice - remainingLoan;
  };

  // Calculate loan progress percentage
  const calculateLoanProgress = (asset: PropertyAsset | VehicleAsset, type: "property" | "vehicle") => {
    if (type === "property") {
      const property = asset as PropertyAsset;
      const purchasePrice = parseFloat(property.originalPurchasePrice);
      const outstandingLoan = parseFloat(property.outstandingLoan);
      const paidOff = purchasePrice - outstandingLoan;
      return purchasePrice > 0 ? (paidOff / purchasePrice) * 100 : 0;
    } else {
      const vehicle = asset as VehicleAsset;
      const loanTaken = parseFloat(vehicle.loanAmountTaken || "0");
      const loanRepaid = parseFloat(vehicle.loanAmountRepaid || "0");
      if (loanTaken === 0) return 100; // No loan = fully paid
      return (loanRepaid / loanTaken) * 100;
    }
  };

  // Calculate breakdown details
  const breakdownDetails = useMemo(() => {
    const activeProperties = propertyAssets.filter(p => p.isActive !== false);
    const activeVehicles = vehicleAssets.filter(v => v.isActive !== false);

    const propertyEquity = activeProperties.reduce((sum, p) => sum + calculatePropertyEquity(p), 0);
    const vehicleEquity = activeVehicles.reduce((sum, v) => sum + calculateVehicleEquity(v), 0);
    const totalEquity = propertyEquity + vehicleEquity;

    const propertyValue = activeProperties.reduce((sum, p) => sum + parseFloat(p.originalPurchasePrice), 0);
    const vehicleValue = activeVehicles.reduce((sum, v) => sum + parseFloat(v.originalPurchasePrice), 0);
    const totalValue = propertyValue + vehicleValue;

    const propertyLoan = activeProperties.reduce((sum, p) => sum + parseFloat(p.outstandingLoan), 0);
    const vehicleLoan = activeVehicles.reduce((sum, v) => {
      const loanTaken = parseFloat(v.loanAmountTaken || "0");
      const loanRepaid = parseFloat(v.loanAmountRepaid || "0");
      return sum + (loanTaken - loanRepaid);
    }, 0);
    const totalLoan = propertyLoan + vehicleLoan;

    // Build all assets list
    const allAssets = [
      ...activeProperties.map(p => ({
        id: p.id,
        name: p.propertyName,
        type: "property" as const,
        purchasePrice: parseFloat(p.originalPurchasePrice),
        remainingLoan: parseFloat(p.outstandingLoan),
        equity: calculatePropertyEquity(p),
        progress: calculateLoanProgress(p, "property"),
        monthlyPayment: p.monthlyLoanPayment ? parseFloat(p.monthlyLoanPayment) : null,
      })),
      ...activeVehicles.map(v => ({
        id: v.id,
        name: v.vehicleName,
        type: "vehicle" as const,
        purchasePrice: parseFloat(v.originalPurchasePrice),
        remainingLoan: parseFloat(v.loanAmountTaken || "0") - parseFloat(v.loanAmountRepaid || "0"),
        equity: calculateVehicleEquity(v),
        progress: calculateLoanProgress(v, "vehicle"),
        monthlyPayment: v.monthlyLoanPayment ? parseFloat(v.monthlyLoanPayment) : null,
      })),
    ].sort((a, b) => b.equity - a.equity);

    return {
      properties: activeProperties,
      vehicles: activeVehicles,
      propertyEquity,
      vehicleEquity,
      totalEquity,
      propertyValue,
      vehicleValue,
      totalValue,
      propertyLoan,
      vehicleLoan,
      totalLoan,
      allAssets,
    };
  }, [propertyAssets, vehicleAssets]);

  const handleAssetClick = (type: "property" | "vehicle", name: string) => {
    setPendingNavigation({ type, name });
    setConfirmDialogOpen(true);
  };

  const handleConfirmNavigation = () => {
    if (pendingNavigation) {
      onOpenChange(false);
      setConfirmDialogOpen(false);
      router.push(`/dashboard/user/assets?tab=${pendingNavigation.type}`);
      setPendingNavigation(null);
    }
  };

  const handleCancelNavigation = () => {
    setConfirmDialogOpen(false);
    setPendingNavigation(null);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "bg-emerald-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 25) return "bg-amber-500";
    return "bg-gray-400";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Asset Breakdown
          </DialogTitle>
          <DialogDescription>
            Detailed breakdown of your property and vehicle assets
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total Asset Value</p>
              <p className="text-2xl font-semibold">${breakdownDetails.totalValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Outstanding Loans</p>
              <p className="text-2xl font-semibold text-amber-600">${breakdownDetails.totalLoan.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Equity</p>
              <p className="text-2xl font-semibold text-emerald-600">${breakdownDetails.totalEquity.toLocaleString()}</p>
            </div>
          </div>

          {/* Assets By Type */}
          <div className="space-y-6">
            {/* Properties Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50">
                      <Home className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold">Properties</h3>
                    <span className="text-sm text-muted-foreground">({breakdownDetails.properties.length})</span>
                  </div>
                  <p className="text-lg font-semibold text-emerald-600">
                    ${breakdownDetails.propertyEquity.toLocaleString()}
                  </p>
                </div>

                {breakdownDetails.properties.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground border rounded-lg">
                    No property assets found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {breakdownDetails.properties.map((property) => {
                      const equity = calculatePropertyEquity(property);
                      const progress = calculateLoanProgress(property, "property");
                      const purchasePrice = parseFloat(property.originalPurchasePrice);
                      const outstandingLoan = parseFloat(property.outstandingLoan);

                      return (
                        <div
                          key={property.id}
                          className="border rounded-lg p-4 bg-background hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => handleAssetClick("property", property.propertyName)}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Home className="h-5 w-5 text-emerald-600" />
                              <div>
                                <h4 className="font-semibold">{property.propertyName}</h4>
                                <p className="text-xs text-muted-foreground">
                                  Purchase: ${purchasePrice.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="text-lg font-bold text-emerald-600">${equity.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Equity</p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>

                          {/* Loan Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Loan Progress</span>
                              <span className="font-medium">{progress.toFixed(1)}% paid off</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getProgressColor(progress)}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Outstanding: ${outstandingLoan.toLocaleString()}</span>
                              {property.monthlyLoanPayment && (
                                <span>Monthly: ${parseFloat(property.monthlyLoanPayment).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Vehicles Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50">
                      <Car className="h-4 w-4 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-semibold">Vehicles</h3>
                    <span className="text-sm text-muted-foreground">({breakdownDetails.vehicles.length})</span>
                  </div>
                  <p className="text-lg font-semibold text-amber-600">
                    ${breakdownDetails.vehicleEquity.toLocaleString()}
                  </p>
                </div>

                {breakdownDetails.vehicles.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground border rounded-lg">
                    No vehicle assets found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {breakdownDetails.vehicles.map((vehicle) => {
                      const equity = calculateVehicleEquity(vehicle);
                      const progress = calculateLoanProgress(vehicle, "vehicle");
                      const purchasePrice = parseFloat(vehicle.originalPurchasePrice);
                      const loanTaken = parseFloat(vehicle.loanAmountTaken || "0");
                      const loanRepaid = parseFloat(vehicle.loanAmountRepaid || "0");
                      const remainingLoan = loanTaken - loanRepaid;

                      return (
                        <div
                          key={vehicle.id}
                          className="border rounded-lg p-4 bg-background hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => handleAssetClick("vehicle", vehicle.vehicleName)}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Car className="h-5 w-5 text-amber-600" />
                              <div>
                                <h4 className="font-semibold">{vehicle.vehicleName}</h4>
                                <p className="text-xs text-muted-foreground">
                                  Purchase: ${purchasePrice.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="text-lg font-bold text-amber-600">${equity.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Equity</p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>

                          {/* Loan Progress Bar */}
                          {loanTaken > 0 && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Loan Progress</span>
                                <span className="font-medium">{progress.toFixed(1)}% paid off</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${getProgressColor(progress)}`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Remaining: ${remainingLoan.toLocaleString()}</span>
                                {vehicle.monthlyLoanPayment && (
                                  <span>Monthly: ${parseFloat(vehicle.monthlyLoanPayment).toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          )}
                          {loanTaken === 0 && (
                            <p className="text-sm text-emerald-600">Fully paid - No outstanding loan</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
          </div>
        </div>
      </DialogContent>

      {/* Navigation Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Navigate to Assets</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to navigate to the {pendingNavigation?.type === "property" ? "Properties" : "Vehicles"} page
              to view "{pendingNavigation?.name}". Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelNavigation}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNavigation}>
              Go to {pendingNavigation?.type === "property" ? "Properties" : "Vehicles"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
