import { getPropertyAssets } from "@/lib/actions/property-assets";
import { AssetsClient } from "./client";

export const metadata = {
  title: "Assets | Foracle",
  description: "Manage your property, vehicle, and other assets",
};

export default async function AssetsPage() {
  const propertyAssets = await getPropertyAssets();

  return <AssetsClient initialPropertyAssets={propertyAssets} />;
}
