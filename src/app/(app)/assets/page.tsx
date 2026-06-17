import { getPropertyAssets } from "@/actions/property-assets"
import { getVehicleAssets } from "@/actions/vehicle-assets"

import { AssetsClient } from "@/app/(app)/assets/client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Assets | Foracle",
  description: "Manage your property, vehicle, and other assets"
}

export default async function AssetsPage() {
  const [propertyAssets, vehicleAssets] = await Promise.all([
    getPropertyAssets(),
    getVehicleAssets()
  ])

  return (
    <AssetsClient
      initialPropertyAssets={propertyAssets}
      initialVehicleAssets={vehicleAssets}
    />
  )
}
