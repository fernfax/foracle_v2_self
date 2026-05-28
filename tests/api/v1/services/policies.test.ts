import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { expenses, policies } from "@/db/schema";
import {
  PolicyNotFoundError,
  createPolicy,
  deletePolicy,
  getPolicyById,
  listPolicies,
  updatePolicy,
} from "@/lib/services/policies";
import { seedUser, truncateAll } from "../../../db-helpers";

const baseInput = {
  provider: "AIA",
  policyType: "life",
  startDate: "2026-01-01",
  premiumAmount: "120.00",
  premiumFrequency: "monthly",
};

const UUID_1 = "11111111-1111-4111-8111-111111111111";

beforeEach(async () => {
  await truncateAll();
});

describe("listPolicies (real DB)", () => {
  it("scopes by userId — never returns another user's policies (the CVE fix)", async () => {
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
    await createPolicy(ctxA, baseInput);
    await createPolicy(ctxB, baseInput);
    await createPolicy(ctxB, { ...baseInput, provider: "Manulife" });

    const aRows = await listPolicies(ctxA);
    expect(aRows).toHaveLength(1);
    expect(aRows[0].userId).toBe("user-a");

    const bRows = await listPolicies(ctxB);
    expect(bRows).toHaveLength(2);
  });

  it("filters narrow correctly", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    await createPolicy(ctx, { ...baseInput, policyType: "life" });
    await createPolicy(ctx, {
      ...baseInput,
      policyType: "health",
      status: "lapsed",
    });

    const life = await listPolicies(ctx, { policyType: "life" });
    expect(life).toHaveLength(1);
    expect(life[0].policyType).toBe("life");

    const lapsed = await listPolicies(ctx, { status: "lapsed" });
    expect(lapsed).toHaveLength(1);
    expect(lapsed[0].policyType).toBe("health");
  });
});

describe("createPolicy idempotency (real DB)", () => {
  it("same UUID + same user returns conflict, not duplicate", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const first = await createPolicy(ctx, { ...baseInput, id: UUID_1 });
    expect(first.status).toBe("created");

    const replay = await createPolicy(ctx, {
      ...baseInput,
      id: UUID_1,
      provider: "DIFFERENT",
    });
    expect(replay.status).toBe("conflict");
    expect(replay.row.provider).toBe("AIA");

    const all = await db.select().from(policies).where(eq(policies.id, UUID_1));
    expect(all).toHaveLength(1);
  });

  it("throws on cross-user id collision", async () => {
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
    await createPolicy(ctxA, { ...baseInput, id: UUID_1 });
    await expect(
      createPolicy(ctxB, { ...baseInput, id: UUID_1 })
    ).rejects.toThrow(/collision/);
  });

  it("backfills familyId from AuthContext", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const result = await createPolicy(ctx, baseInput);
    expect(result.row.familyId).toBe("fam-a");
  });
});

describe("updatePolicy + deletePolicy (real DB)", () => {
  it("update refuses to touch another user's policy — the CVE fix", async () => {
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
    const created = await createPolicy(ctxA, { ...baseInput, id: UUID_1 });
    expect(created.status).toBe("created");

    await expect(
      updatePolicy(ctxB, UUID_1, { provider: "STOLEN" })
    ).rejects.toBeInstanceOf(PolicyNotFoundError);

    const intact = await getPolicyById(ctxA, UUID_1);
    expect(intact?.provider).toBe("AIA");
  });

  it("delete cascades the linked expense", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    // Seed an expense first to act as the linked one.
    const linkedExpenseId = randomUUID();
    await db.insert(expenses).values({
      id: linkedExpenseId,
      userId: ctx.userId,
      familyId: ctx.familyId,
      name: "AIA premium",
      category: "Insurance",
      amount: "120.00",
      frequency: "monthly",
      isActive: true,
    });
    const created = await createPolicy(ctx, {
      ...baseInput,
      id: UUID_1,
      linkedExpenseId,
    });
    expect(created.row.linkedExpenseId).toBe(linkedExpenseId);

    await deletePolicy(ctx, UUID_1);

    const polRow = await db.select().from(policies).where(eq(policies.id, UUID_1));
    expect(polRow).toHaveLength(0);
    const expRow = await db.select().from(expenses).where(eq(expenses.id, linkedExpenseId));
    expect(expRow).toHaveLength(0);
  });

  it("delete refuses another user's policy", async () => {
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
    const created = await createPolicy(ctxA, { ...baseInput, id: UUID_1 });
    expect(created.status).toBe("created");

    await expect(deletePolicy(ctxB, UUID_1)).rejects.toBeInstanceOf(
      PolicyNotFoundError
    );
    expect(await getPolicyById(ctxA, UUID_1)).not.toBeNull();
  });
});
