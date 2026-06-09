"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Home, Car, Package } from "lucide-react";
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
  paidByCpf: boolean | null;
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
  loanInterestRate: string | null;
  loanTenureYears: number | null;
  loanTenureMonths: number | null;
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
    router.push(`/assets?tab=${value}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Assets"
        tabs={
          mounted ? (
            <SlidingTabs
              tabs={[
                { value: "property", label: "Property", icon: Home },
                { value: "vehicle", label: "Vehicle", icon: Car },
                { value: "others", label: "Others", icon: Package },
              ]}
              value={activeTab}
              onValueChange={handleTabChange}
            />
          ) : null
        }
      />

      {!mounted ? (
        <div className="h-[500px] animate-pulse bg-muted rounded-lg" />
      ) : (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsContent value="property" className="mt-4">
            <PropertyList initialProperties={initialPropertyAssets} />
          </TabsContent>

          <TabsContent value="vehicle" className="mt-4">
            <VehicleList initialVehicles={initialVehicleAssets} />
          </TabsContent>

          <TabsContent value="others" className="mt-4">
            <EmptyState
              icon={Package}
              title="Other assets — coming soon"
              description="Track jewellery, collectibles, renovation value and more. Coming soon."
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
