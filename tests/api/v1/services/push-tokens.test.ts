import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushTokens } from "@/db/schema";
import {
  PushTokenNotFoundError,
  listActivePushTokens,
  registerPushToken,
  revokePushToken,
} from "@/lib/services/push-tokens";
import { seedUser, truncateAll } from "../../../db-helpers";

beforeEach(async () => {
  await truncateAll();
});

describe("push-tokens (real DB)", () => {
  it("scopes by userId — never returns another user's tokens", async () => {
    const ctxA = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const ctxB = await seedUser({
      userId: "user-b",
      familyId: "fam-b",
      isMaster: true,
    });
    await registerPushToken(ctxA, { token: "tk-a", platform: "ios" });
    await registerPushToken(ctxB, { token: "tk-b", platform: "android" });

    const aRows = await listActivePushTokens(ctxA);
    expect(aRows).toHaveLength(1);
    expect(aRows[0].token).toBe("tk-a");

    const bRows = await listActivePushTokens(ctxB);
    expect(bRows).toHaveLength(1);
    expect(bRows[0].token).toBe("tk-b");
  });

  it("first register returns 'registered'", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const result = await registerPushToken(ctx, { token: "tk", platform: "ios" });
    expect(result.status).toBe("registered");
    expect(result.row.familyId).toBe("fam-a");
    expect(result.row.revokedAt).toBeNull();
  });

  it("same (userId, token) re-registration is a no-op, returns existing row", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const first = await registerPushToken(ctx, { token: "tk", platform: "ios" });
    const second = await registerPushToken(ctx, { token: "tk", platform: "ios" });
    expect(second.status).toBe("noop");
    expect(second.row.id).toBe(first.row.id);

    const all = await db.select().from(pushTokens).where(eq(pushTokens.token, "tk"));
    expect(all).toHaveLength(1);
  });

  it("revoke + re-register reactivates the same row", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const first = await registerPushToken(ctx, { token: "tk", platform: "ios" });
    await revokePushToken(ctx, first.row.id);
    const reactivated = await registerPushToken(ctx, {
      token: "tk",
      platform: "ios",
    });
    expect(reactivated.status).toBe("reactivated");
    expect(reactivated.row.id).toBe(first.row.id);
    expect(reactivated.row.revokedAt).toBeNull();
  });

  it("revoke marks revokedAt and excludes the row from listActivePushTokens", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const first = await registerPushToken(ctx, { token: "tk", platform: "ios" });
    expect((await listActivePushTokens(ctx))).toHaveLength(1);

    await revokePushToken(ctx, first.row.id);
    expect(await listActivePushTokens(ctx)).toHaveLength(0);

    // Row is still in DB, just revoked.
    const all = await db
      .select()
      .from(pushTokens)
      .where(eq(pushTokens.id, first.row.id));
    expect(all).toHaveLength(1);
    expect(all[0].revokedAt).not.toBeNull();
  });

  it("revoke refuses another user's token", async () => {
    const ctxA = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const ctxB = await seedUser({
      userId: "user-b",
      familyId: "fam-b",
      isMaster: true,
    });
    const first = await registerPushToken(ctxA, { token: "tk-a", platform: "ios" });
    await expect(revokePushToken(ctxB, first.row.id)).rejects.toBeInstanceOf(
      PushTokenNotFoundError
    );
    const intact = await listActivePushTokens(ctxA);
    expect(intact).toHaveLength(1);
  });

  it("different users with the same token string get separate rows", async () => {
    const ctxA = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const ctxB = await seedUser({
      userId: "user-b",
      familyId: "fam-b",
      isMaster: true,
    });
    const a = await registerPushToken(ctxA, { token: "shared-tk", platform: "ios" });
    const b = await registerPushToken(ctxB, { token: "shared-tk", platform: "ios" });
    expect(a.row.id).not.toBe(b.row.id);
    expect(a.row.userId).toBe("user-a");
    expect(b.row.userId).toBe("user-b");
  });
});
