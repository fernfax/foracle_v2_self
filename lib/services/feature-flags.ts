import { eq } from "drizzle-orm";
import { db } from "@/db";
import { families } from "@/db/schema";
import type { AuthContext } from "@/lib/auth-context";
import { ALL_FLAG_KEYS, type FlagKey } from "@/lib/feature-flags/registry";
import { resolveFlags, type ResolvedFlags } from "@/lib/feature-flags/resolve";

const ALL_FLAG_KEY_SET = new Set<string>(ALL_FLAG_KEYS);

// ---------------------------------------------------------------------------
// Per-FAMILY (household) flag overrides.
//
// Feature flags are scoped to the household, not the individual user. Overrides
// are persisted as a JSON-stringified sparse map on families.featureFlags
// ({ "income.beta": true, ... }); an absent key falls back to the registry
// default. Parse defensively — any malformed value resolves to an empty map so
// a single bad write can't lock the household out, and unknown keys are dropped
// so a renamed/removed flag can't leak through into resolution.
//
// The family-id-explicit functions below are NOT auth-scoped: the CALLER is
// responsible for authorizing access to `familyId` (the platform admin portal
// asserts superadmin first; the ctx-based wrappers scope to the caller's own
// household).
// ---------------------------------------------------------------------------

export async function getFamilyFlagOverrides(
  familyId: string
): Promise<Partial<Record<FlagKey, boolean>>> {
  const family = await db.query.families.findFirst({
    where: eq(families.id, familyId),
    columns: { featureFlags: true },
  });
  if (!family?.featureFlags) return {};
  try {
    const parsed = JSON.parse(family.featureFlags) as Record<string, unknown>;
    const result: Partial<Record<FlagKey, boolean>> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (ALL_FLAG_KEY_SET.has(key) && typeof value === "boolean") {
        result[key as FlagKey] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export async function setFamilyFlagOverride(
  familyId: string,
  key: FlagKey,
  enabled: boolean
): Promise<void> {
  const current = await getFamilyFlagOverrides(familyId);
  const next = { ...current, [key]: enabled };
  await db
    .update(families)
    .set({ featureFlags: JSON.stringify(next), updatedAt: new Date() })
    .where(eq(families.id, familyId));
}

export async function getResolvedFlagsForFamily(
  familyId: string
): Promise<ResolvedFlags> {
  return resolveFlags(await getFamilyFlagOverrides(familyId));
}

// ---------------------------------------------------------------------------
// ctx-based API (auth-scoped) — thin delegates to the family-id variants,
// scoping to the caller's own household via ctx.familyId.
// ---------------------------------------------------------------------------

export async function getFlagOverrides(
  ctx: AuthContext
): Promise<Partial<Record<FlagKey, boolean>>> {
  return getFamilyFlagOverrides(ctx.familyId);
}

export async function setFlagOverride(
  ctx: AuthContext,
  key: FlagKey,
  enabled: boolean
): Promise<void> {
  return setFamilyFlagOverride(ctx.familyId, key, enabled);
}

export async function getResolvedFlags(
  ctx: AuthContext
): Promise<ResolvedFlags> {
  return getResolvedFlagsForFamily(ctx.familyId);
}
