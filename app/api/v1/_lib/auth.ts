import { getCurrentUserAndFamily, type AuthContext } from "@/lib/auth-context";
import { ApiError } from "./errors";

// Single auth gate for every /api/v1/* route.
//
// Resolves the caller into an AuthContext (userId + familyId + isMaster) using
// the same path the web app uses. Throws ApiError(401) if the caller isn't
// authenticated. The Clerk Expo SDK ships the same JWT/session cookie the web
// uses, so this works for both clients without further branching.
export async function verifyAndScope(): Promise<AuthContext> {
  try {
    return await getCurrentUserAndFamily();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    if (message === "Unauthorized") {
      throw new ApiError("UNAUTHORIZED", "Sign in required");
    }
    throw err;
  }
}

export async function verifyAndScopeMaster(): Promise<AuthContext> {
  const ctx = await verifyAndScope();
  if (!ctx.isMaster) {
    throw new ApiError(
      "FORBIDDEN",
      "Only the family master can perform this action"
    );
  }
  return ctx;
}

export type { AuthContext };
