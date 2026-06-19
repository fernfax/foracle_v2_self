import { getPropertyAssets } from "@/actions/property-assets"

import { PropertyList } from "@/components/assets/property-list"

export default async function PropertyTab() {
  const properties = await getPropertyAssets()
  return <PropertyList initialProperties={properties} />
}
