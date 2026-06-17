"use client"

import { useState, useSyncExternalStore } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Car, Home, Package } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { SlidingTabs } from "@/components/ui/sliding-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { PropertyList } from "@/components/assets/property-list"
import { VehicleList } from "@/components/assets/vehicle-list"

interface PropertyAsset {
  id: string
  propertyName: string
  purchaseDate: string
  originalPurchasePrice: string
  loanAmountTaken: string | null
  outstandingLoan: string
  monthlyLoanPayment: string
  interestRate: string
  principalCpfWithdrawn: string | null
  housingGrantTaken: string | null
  accruedInterestToDate: string | null
  linkedExpenseId: string | null
  paidByCpf: boolean | null
  isActive: boolean | null
  createdAt: Date
  updatedAt: Date
}

interface VehicleAsset {
  id: string
  vehicleName: string
  purchaseDate: string
  coeExpiryDate: string | null
  originalPurchasePrice: string
  loanAmountTaken: string | null
  loanInterestRate: string | null
  loanTenureYears: number | null
  loanTenureMonths: number | null
  loanAmountRepaid: string | null
  monthlyLoanPayment: string | null
  linkedExpenseId: string | null
  isActive: boolean | null
  createdAt: Date
  updatedAt: Date
}

interface AssetsClientProps {
  initialPropertyAssets: PropertyAsset[]
  initialVehicleAssets: VehicleAsset[]
}

// Hydration flag without a set-state effect: server + first client render get
// the server snapshot (false); once hydrated React swaps to the client snapshot
// (true). No extra committed render driven from an effect.
const emptySubscribe = () => () => {}
function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export function AssetsClient({
  initialPropertyAssets,
  initialVehicleAssets
}: AssetsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mounted = useHydrated()
  const tabFromUrl = searchParams.get("tab") || "property"
  // activeTab is optimistic (set on tap so the tab switches instantly), then
  // resynced to the URL when navigation commits or on back/forward. Syncing
  // during render via the previous-value pattern avoids a set-state-in-effect.
  const [activeTab, setActiveTab] = useState(tabFromUrl)
  const [prevTabFromUrl, setPrevTabFromUrl] = useState(tabFromUrl)
  if (prevTabFromUrl !== tabFromUrl) {
    setPrevTabFromUrl(tabFromUrl)
    setActiveTab(tabFromUrl)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`/assets?tab=${value}`, { scroll: false })
  }

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
                { value: "others", label: "Others", icon: Package }
              ]}
              value={activeTab}
              onValueChange={handleTabChange}
            />
          ) : null
        }
      />

      {!mounted ? (
        <div className="bg-muted h-[500px] animate-pulse rounded-lg" />
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full">
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
  )
}
