"use server";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { families, users } from "@/db/schema";
import { assertSuperAdmin } from "@/lib/admin/superadmin";
import {
  getFamilyFlagOverrides,
  getResolvedFlagsForFamily,
  setFamilyFlagOverride,
} from "@/lib/services/feature-flags";
import { flagKeySchema } from "@/lib/api-schemas/feature-flags";
import type { FlagKey } from "@/lib/feature-flags/registry";
import type { ResolvedFlags } from "@/lib/feature-flags/resolve";

/**
 * Cross-tenant platform-admin actions for the feature-flag portal.
 * Every action authorizes via assertSuperAdmin() before touching data; the
 * underlying service is family-id-explicit and NOT auth-scoped.
 */

// One household row in the admin family picker. The master's email is resolved
// from the linked `users` row and is null when the family has no master / no
// email on file. Exported so the admin panel can type its props off the
// single source of truth.
export type FamilyRow = {
  id: string;
  name: string | null;
  masterEmail: string | null;
};

export async function adminListFamilies(): Promise<FamilyRow[]> {
  await assertSuperAdmin();

  const rows = await db
    .select({
      id: families.id,
      name: families.name,
      createdAt: families.createdAt,
      masterEmail: users.email,
    })
    .from(families)
    .leftJoin(users, eq(users.id, families.masterUserId))
    .orderBy(asc(families.name), asc(families.createdAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    masterEmail: row.masterEmail ?? null,
  }));
}

export async function adminGetFamilyResolvedFlags(
  familyId: string,
): Promise<ResolvedFlags> {
  await assertSuperAdmin();
  if (!familyId.trim()) {
    throw new Error("familyId is required");
  }
  return getResolvedFlagsForFamily(familyId);
}

export async function adminGetFamilyOverrides(
  familyId: string,
): Promise<Partial<Record<FlagKey, boolean>>> {
  await assertSuperAdmin();
  if (!familyId.trim()) {
    throw new Error("familyId is required");
  }
  return getFamilyFlagOverrides(familyId);
}

export async function adminSetFamilyFlag(
  familyId: string,
  key: FlagKey,
  enabled: boolean,
): Promise<void> {
  await assertSuperAdmin();
  if (!familyId.trim()) {
    throw new Error("familyId is required");
  }
  const parsedKey = flagKeySchema.parse(key) as FlagKey;
  await setFamilyFlagOverride(familyId, parsedKey, enabled);
  revalidatePath("/admin");
}
