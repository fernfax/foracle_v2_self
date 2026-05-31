// =============================================================================
// PLATFORM SUPERADMIN — CROSS-TENANT ACCESS GATE
//
// SERVER-ONLY. This module decides whether the current Clerk user is a platform
// superadmin (Foracle staff), which grants CROSS-TENANT access — i.e. the
// ability to read/write data belonging to *any* family, bypassing the normal
// per-household auth boundary. The /admin portal depends on this gate.
//
// Membership is driven entirely by the FORACLE_SUPERADMIN_EMAILS env var
// (comma-separated). It is intentionally NOT a DB column: superadmin is an
// operator/platform role, not tenant data, so it stays out of the multi-tenant
// data model and can't be granted by an ordinary user. If the env var is unset
// or empty, NOBODY is a superadmin.
//
// Never import this into client components.
// =============================================================================

import { currentUser } from "@clerk/nextjs/server";

/**
 * Pure allowlist check. Trims + lowercases both the candidate email and each
 * configured entry. Returns false for null/undefined/empty input and when the
 * env var is unset or contains no usable entries.
 */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const raw = process.env.FORACLE_SUPERADMIN_EMAILS;
  if (!raw) return false;

  const allowlist = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  if (allowlist.length === 0) return false;
  return allowlist.includes(normalized);
}

/**
 * Resolve whether the *currently authenticated* Clerk user is a superadmin.
 * Uses the primary verified email (matched via primaryEmailAddressId, falling
 * back to the first email on the account). Returns false on any error or when
 * unauthenticated — never throws.
 */
export async function getIsSuperAdmin(): Promise<boolean> {
  try {
    const user = await currentUser();
    if (!user) return false;

    const emails = user.emailAddresses ?? [];
    const primary =
      emails.find((e) => e.id === user.primaryEmailAddressId) ?? emails[0];

    return isSuperAdminEmail(primary?.emailAddress);
  } catch {
    return false;
  }
}

/**
 * Throw "Forbidden" unless the current user is a platform superadmin.
 * Use at the top of any cross-tenant server action / route handler. The
 * "Forbidden" message is part of the contract callers may match on.
 */
export async function assertSuperAdmin(): Promise<void> {
  if (!(await getIsSuperAdmin())) {
    throw new Error("Forbidden");
  }
}
