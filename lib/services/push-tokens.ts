import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { pushTokens } from "@/db/schema";
import type { AuthContext } from "@/lib/auth-context";
import type { RegisterPushTokenBody } from "@/lib/api-schemas/push-tokens";

export type PushTokenRow = typeof pushTokens.$inferSelect;

export class PushTokenNotFoundError extends Error {
  constructor() {
    super("Push token not found");
  }
}

export type RegisterPushTokenResult =
  | { status: "registered"; row: PushTokenRow }
  | { status: "reactivated"; row: PushTokenRow }
  | { status: "noop"; row: PushTokenRow };

// Idempotent on (userId, token):
//   - First registration → status "registered"
//   - Same token, previously revoked → reactivates (revokedAt = null) → "reactivated"
//   - Same token, still active → no-op, returns existing row → "noop"
// Different users with the same token get separate rows (rare but possible
// when a device hands off accounts).
export async function registerPushToken(
  ctx: AuthContext,
  body: RegisterPushTokenBody
): Promise<RegisterPushTokenResult> {
  const existing = await db.query.pushTokens.findFirst({
    where: and(eq(pushTokens.userId, ctx.userId), eq(pushTokens.token, body.token)),
  });

  if (existing) {
    if (existing.revokedAt) {
      const [row] = await db
        .update(pushTokens)
        .set({ revokedAt: null, platform: body.platform })
        .where(eq(pushTokens.id, existing.id))
        .returning();
      return { status: "reactivated", row };
    }
    return { status: "noop", row: existing };
  }

  const [row] = await db
    .insert(pushTokens)
    .values({
      id: randomUUID(),
      userId: ctx.userId,
      familyId: ctx.familyId,
      token: body.token,
      platform: body.platform,
    })
    .returning();
  return { status: "registered", row };
}

export async function revokePushToken(
  ctx: AuthContext,
  id: string
): Promise<PushTokenRow> {
  const existing = await db.query.pushTokens.findFirst({
    where: and(eq(pushTokens.id, id), eq(pushTokens.userId, ctx.userId)),
  });
  if (!existing) throw new PushTokenNotFoundError();
  if (existing.revokedAt) return existing;
  const [row] = await db
    .update(pushTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(pushTokens.id, id), eq(pushTokens.userId, ctx.userId)))
    .returning();
  return row;
}

export async function listActivePushTokens(
  ctx: AuthContext
): Promise<PushTokenRow[]> {
  return db
    .select()
    .from(pushTokens)
    .where(and(eq(pushTokens.userId, ctx.userId), isNull(pushTokens.revokedAt)));
}
