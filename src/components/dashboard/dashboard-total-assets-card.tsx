"use client"

import React, { useEffect, useMemo, useState } from "react"
import { getUserPropertyAssets, getUserVehicleAssets } from "@/actions/user"
import { Car, Home, TrendingUp } from "lucide-react"

import type { PropertyAsset, VehicleAsset } from "@/db/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardAssetBreakdownModal } from "@/components/dashboard/dashboard-asset-breakdown-modal"

interface TotalAssetsCardProps {
  totalAssets: number
}

export function DashboardTotalAssetsCard({
  totalAssets
}: TotalAssetsCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [propertyAssets, setPropertyAssets] = useState<PropertyAsset[]>([])
  const [vehicleAssets, setVehicleAssets] = useState<VehicleAsset[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch assets on mount
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const [properties, vehicles] = await Promise.all([
          getUserPropertyAssets(),
          getUserVehicleAssets()
        ])
        setPropertyAssets(properties as PropertyAsset[])
        setVehicleAssets(vehicles as VehicleAsset[])
      } catch (error) {
        console.error("Failed to fetch assets:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAssets()
  }, [])

  // Calculate totals from fetched data
  const calculatedData = useMemo(() => {
    const activeProperties = propertyAssets.filter((p) => p.isActive !== false)
    const activeVehicles = vehicleAssets.filter((v) => v.isActive !== false)

    const propertyEquity = activeProperties.reduce((sum, p) => {
      const purchasePrice = parseFloat(p.originalPurchasePrice)
      const outstandingLoan = parseFloat(p.outstandingLoan)
      return sum + (purchasePrice - outstandingLoan)
    }, 0)

    const vehicleEquity = activeVehicles.reduce((sum, v) => {
      const purchasePrice = parseFloat(v.originalPurchasePrice)
      const loanTaken = parseFloat(v.loanAmountTaken || "0")
      const loanRepaid = parseFloat(v.loanAmountRepaid || "0")
      const remainingLoan = loanTaken - loanRepaid
      return sum + (purchasePrice - remainingLoan)
    }, 0)

    return {
      totalEquity: propertyEquity + vehicleEquity,
      propertyCount: activeProperties.length,
      vehicleCount: activeVehicles.length,
      propertyEquity,
      vehicleEquity
    }
  }, [propertyAssets, vehicleAssets])

  // Use calculated amount if assets loaded, otherwise use prop
  const displayAmount = !isLoading ? calculatedData.totalEquity : totalAssets

  return (
    <>
      <Card
        className="relative cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
        onClick={() => setIsModalOpen(true)}
        data-tour="assets-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Total Assets
          </CardTitle>
          <div className="bg-brand-gold/[0.15] flex h-10 w-10 items-center justify-center rounded-xl">
            <TrendingUp className="text-on-warning h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tabular-nums">
            ${displayAmount.toLocaleString()}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Net equity in property & vehicles
          </p>

          {/* Asset counts */}
          {!isLoading &&
            (calculatedData.propertyCount > 0 ||
              calculatedData.vehicleCount > 0) && (
              <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
                {calculatedData.propertyCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Home className="text-on-success h-3 w-3" />
                    <span>{calculatedData.propertyCount} property</span>
                  </div>
                )}
                {calculatedData.vehicleCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Car className="text-on-warning h-3 w-3" />
                    <span>{calculatedData.vehicleCount} vehicle</span>
                  </div>
                )}
              </div>
            )}
        </CardContent>
      </Card>

      <DashboardAssetBreakdownModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        propertyAssets={propertyAssets}
        vehicleAssets={vehicleAssets}
      />
    </>
  )
}
