"use client";

import React, { useState, useEffect, useMemo } from "react";
import { TrendingUp, Home, Car } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AssetBreakdownModal } from "./asset-breakdown-modal";
import { getUserPropertyAssets, getUserVehicleAssets } from "@/lib/actions/user";

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

interface TotalAssetsCardProps {
  totalAssets: number;
}

export function TotalAssetsCard({ totalAssets }: TotalAssetsCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [propertyAssets, setPropertyAssets] = useState<PropertyAsset[]>([]);
  const [vehicleAssets, setVehicleAssets] = useState<VehicleAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch assets on mount
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const [properties, vehicles] = await Promise.all([
          getUserPropertyAssets(),
          getUserVehicleAssets(),
        ]);
        setPropertyAssets(properties as PropertyAsset[]);
        setVehicleAssets(vehicles as VehicleAsset[]);
      } catch (error) {
        console.error("Failed to fetch assets:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssets();
  }, []);

  // Calculate totals from fetched data
  const calculatedData = useMemo(() => {
    const activeProperties = propertyAssets.filter(p => p.isActive !== false);
    const activeVehicles = vehicleAssets.filter(v => v.isActive !== false);

    const propertyEquity = activeProperties.reduce((sum, p) => {
      const purchasePrice = parseFloat(p.originalPurchasePrice);
      const outstandingLoan = parseFloat(p.outstandingLoan);
      return sum + (purchasePrice - outstandingLoan);
    }, 0);

    const vehicleEquity = activeVehicles.reduce((sum, v) => {
      const purchasePrice = parseFloat(v.originalPurchasePrice);
      const loanTaken = parseFloat(v.loanAmountTaken || "0");
      const loanRepaid = parseFloat(v.loanAmountRepaid || "0");
      const remainingLoan = loanTaken - loanRepaid;
      return sum + (purchasePrice - remainingLoan);
    }, 0);

    return {
      totalEquity: propertyEquity + vehicleEquity,
      propertyCount: activeProperties.length,
      vehicleCount: activeVehicles.length,
      propertyEquity,
      vehicleEquity,
    };
  }, [propertyAssets, vehicleAssets]);

  // Use calculated amount if assets loaded, otherwise use prop
  const displayAmount = !isLoading ? calculatedData.totalEquity : totalAssets;

  return (
    <>
      <Card
        className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsModalOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Assets
          </CardTitle>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950">
            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tabular-nums">
            ${displayAmount.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Net equity in property & vehicles
          </p>

          {/* Asset counts */}
          {!isLoading && (calculatedData.propertyCount > 0 || calculatedData.vehicleCount > 0) && (
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {calculatedData.propertyCount > 0 && (
                <div className="flex items-center gap-1">
                  <Home className="h-3 w-3 text-emerald-600" />
                  <span>{calculatedData.propertyCount} property</span>
                </div>
              )}
              {calculatedData.vehicleCount > 0 && (
                <div className="flex items-center gap-1">
                  <Car className="h-3 w-3 text-amber-600" />
                  <span>{calculatedData.vehicleCount} vehicle</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AssetBreakdownModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        propertyAssets={propertyAssets}
        vehicleAssets={vehicleAssets}
      />
    </>
  );
}
