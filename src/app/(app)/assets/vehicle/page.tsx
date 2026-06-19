import { getVehicleAssets } from "@/actions/vehicle-assets"

import { AssetVehicleList } from "@/components/assets/asset-vehicle-list"

export default async function VehicleTab() {
  const vehicles = await getVehicleAssets()
  return <AssetVehicleList initialVehicles={vehicles} />
}
