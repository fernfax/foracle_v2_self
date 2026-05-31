"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import { setFlagOverrideBodySchema } from "@/lib/api-schemas/feature-flags";
import type { FlagKey } from "@/lib/feature-flags/registry";
import { resolveFlags, type ResolvedFlags } from "@/lib/feature-flags/resolve";
import {
  getFlagOverrides as getFlagOverridesService,
  setFlagOverride as setFlagOverrideService,
  getResolvedFlags as getResolvedFlagsService,
} from "@/lib/services/feature-flags";

/**
 * Get the resolved (cascade-applied) flag state for the current user.
 * On unauth / failure, falls back to the registry defaults so the app shell
 * can always render something sensible.
 */
export async function getResolvedFlags(): Promise<ResolvedFlags> {
  try {
    const ctx = await getCurrentUserAndFamily();
    return await getResolvedFlagsService(ctx);
  } catch {
    return resolveFlags({});
  }
}

/**
 * Get the raw sparse override map for the current user (no cascade applied).
 */
export async function getFlagOverrides(): Promise<
  Partial<Record<FlagKey, boolean>>
> {
  try {
    const ctx = await getCurrentUserAndFamily();
    return await getFlagOverridesService(ctx);
  } catch {
    return {};
  }
}

/**
 * Set a single flag override for the current user, then revalidate the app
 * shell so server-rendered consumers pick up the change.
 */
export async function setFlagOverride(
  key: FlagKey,
  enabled: boolean
): Promise<void> {
  const { key: validKey, enabled: validEnabled } =
    setFlagOverrideBodySchema.parse({ key, enabled });
  const ctx = await getCurrentUserAndFamily();
  await setFlagOverrideService(ctx, validKey, validEnabled);
  revalidatePath("/", "layout");
}
