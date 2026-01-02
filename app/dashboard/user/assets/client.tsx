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
          <TabsList className="h-auto flex gap-2 overflow-x-auto bg-transparent">
            <TabsTrigger
              value="property"
              className="group flex-1 min-w-[120px] flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer data-[state=active]:bg-[#5C98FF] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-white data-[state=inactive]:hover:shadow-md"
            >
              <div className="p-1.5 rounded-md transition-colors bg-slate-100 group-data-[state=active]:bg-white/20 group-hover:bg-indigo-50 group-data-[state=active]:group-hover:bg-white/20">
                <Home className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm">Property</span>
            </TabsTrigger>
            <TabsTrigger
              value="vehicle"
              className="group flex-1 min-w-[120px] flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer data-[state=active]:bg-[#5C98FF] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-white data-[state=inactive]:hover:shadow-md"
            >
              <div className="p-1.5 rounded-md transition-colors bg-slate-100 group-data-[state=active]:bg-white/20 group-hover:bg-indigo-50 group-data-[state=active]:group-hover:bg-white/20">
                <Car className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm">Vehicle</span>
            </TabsTrigger>
            <TabsTrigger
              value="others"
              className="group flex-1 min-w-[120px] flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer data-[state=active]:bg-[#5C98FF] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-white data-[state=inactive]:hover:shadow-md"
            >
              <div className="p-1.5 rounded-md transition-colors bg-slate-100 group-data-[state=active]:bg-white/20 group-hover:bg-indigo-50 group-data-[state=active]:group-hover:bg-white/20">
                <Package className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm">Others</span>
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
