import { notFound } from "next/navigation";
import { getResolvedFlags } from "@/lib/actions/feature-flags";
import type { FlagKey } from "@/lib/feature-flags/registry";

/**
 * Call at the top of a route's server-component page to 404 when its flag is off.
 *
 * This is a plain server helper (NOT a "use server" action) so it can be
 * imported and awaited directly inside async server components.
 */
export async function assertFeatureEnabled(key: FlagKey): Promise<void> {
  const flags = await getResolvedFlags();
  if (!flags[key]) notFound();
}
