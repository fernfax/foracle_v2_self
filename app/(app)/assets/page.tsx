import { getPropertyAssets } from "@/lib/actions/property-assets";
import { getVehicleAssets } from "@/lib/actions/vehicle-assets";
import { AssetsClient } from "./client";
import { assertFeatureEnabled } from "@/lib/feature-flags/guard";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Assets | Foracle",
  description: "Manage your property, vehicle, and other assets",
};

export default async function AssetsPage() {
  await assertFeatureEnabled("assets");
  const [propertyAssets, vehicleAssets] = await Promise.all([
    getPropertyAssets(),
    getVehicleAssets(),
  ]);

  return (
    <AssetsClient
      initialPropertyAssets={propertyAssets}
      initialVehicleAssets={vehicleAssets}
    />
  );
}
