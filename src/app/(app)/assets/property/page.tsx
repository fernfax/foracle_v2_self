import { getPropertyAssets } from "@/actions/property-assets"

import { AssetPropertyList } from "@/components/assets/asset-property-list"

export default async function PropertyTab() {
  const properties = await getPropertyAssets()
  return <AssetPropertyList initialProperties={properties} />
}
