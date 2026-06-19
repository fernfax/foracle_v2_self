import { getVehicleAssets } from "@/actions/vehicle-assets"

import { VehicleList } from "@/components/assets/asset-vehicle-list"

export default async function VehicleTab() {
  const vehicles = await getVehicleAssets()
  return <VehicleList initialVehicles={vehicles} />
}
