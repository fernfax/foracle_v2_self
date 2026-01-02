"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Home, Car, Package, Plus } from "lucide-react";
import { PropertyList } from "@/components/assets/property-list";
import { VehicleList } from "@/components/assets/vehicle-list";

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
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

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
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AssetsClientProps {
  initialPropertyAssets: PropertyAsset[];
  initialVehicleAssets: VehicleAsset[];
}

export function AssetsClient({ initialPropertyAssets, initialVehicleAssets }: AssetsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "property");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync activeTab with URL search params when they change
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") || "property";
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/dashboard/user/assets?tab=${value}`, { scroll: false });
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">
          Profile
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Assets</h1>
        <p className="text-muted-foreground mt-1">
          Manage your property, vehicle, and other assets
        </p>
      </div>

      {!mounted ? (
        <div className="h-[500px] animate-pulse bg-muted rounded-lg" />
      ) : (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="h-auto p-0 bg-transparent border-b border-border rounded-none flex gap-0 justify-start">
            <TabsTrigger
              value="property"
              className="relative flex items-center gap-2 py-2.5 px-4 rounded-t-lg border border-border transition-colors data-[state=active]:z-10 data-[state=active]:-mb-px data-[state=active]:border-t-2 data-[state=active]:border-t-[#5C98FF] data-[state=active]:border-b-white data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=inactive]:border-b-0 data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground"
            >
              <Home className="h-4 w-4" />
              <span>Property</span>
            </TabsTrigger>
            <TabsTrigger
              value="vehicle"
              className="relative flex items-center gap-2 py-2.5 px-4 rounded-t-lg border border-border transition-colors data-[state=active]:z-10 data-[state=active]:-mb-px data-[state=active]:border-t-2 data-[state=active]:border-t-[#5C98FF] data-[state=active]:border-b-white data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=inactive]:border-b-0 data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground"
            >
              <Car className="h-4 w-4" />
              <span>Vehicle</span>
            </TabsTrigger>
            <TabsTrigger
              value="others"
              className="relative flex items-center gap-2 py-2.5 px-4 rounded-t-lg border border-border transition-colors data-[state=active]:z-10 data-[state=active]:-mb-px data-[state=active]:border-t-2 data-[state=active]:border-t-[#5C98FF] data-[state=active]:border-b-white data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=inactive]:border-b-0 data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground"
            >
              <Package className="h-4 w-4" />
              <span>Others</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="property" className="mt-6">
            <PropertyList initialProperties={initialPropertyAssets} />
          </TabsContent>

          <TabsContent value="vehicle" className="mt-6">
            <VehicleList initialVehicles={initialVehicleAssets} />
          </TabsContent>

          <TabsContent value="others" className="mt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No other assets yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Other asset tracking coming soon.
              </p>
              <Button disabled>
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
