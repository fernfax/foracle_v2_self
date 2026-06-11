import { beforeEach, describe, expect, it } from "vitest";
import { addDays, format, subYears } from "date-fns";
import {
  FutureDateOfBirthError,
  createFamilyMember,
  getOrCreateSelfMember,
  updateFamilyMember,
} from "@/lib/services/family";
import { isFutureIsoDate, todayIso } from "@/lib/date-helpers";
import { seedUser, truncateAll } from "./db-helpers";

const TOMORROW = format(addDays(new Date(), 1), "yyyy-MM-dd");
const PAST = format(subYears(new Date(), 30), "yyyy-MM-dd");

describe("isFutureIsoDate", () => {
  it("today is not future; tomorrow is", () => {
    expect(isFutureIsoDate(todayIso())).toBe(false);
    expect(isFutureIsoDate(TOMORROW)).toBe(true);
    expect(isFutureIsoDate(PAST)).toBe(false);
  });
});

describe("family service rejects future DOB (real DB)", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("createFamilyMember throws on a future DOB", async () => {
    const ctx = await seedUser({ userId: "u1", familyId: "fam1", isMaster: true });
    await expect(
      createFamilyMember(ctx, {
        name: "Future Kid",
        relationship: "Child",
        dateOfBirth: TOMORROW,
      }),
    ).rejects.toBeInstanceOf(FutureDateOfBirthError);
  });

  it("createFamilyMember accepts a past DOB", async () => {
    const ctx = await seedUser({ userId: "u2", familyId: "fam2", isMaster: true });
    const row = await createFamilyMember(ctx, {
      name: "Real Person",
      relationship: "Spouse",
      dateOfBirth: PAST,
    });
    expect(row.dateOfBirth).toBe(PAST);
  });

  it("updateFamilyMember throws when patching to a future DOB", async () => {
    const ctx = await seedUser({ userId: "u3", familyId: "fam3", isMaster: true });
    const row = await createFamilyMember(ctx, {
      name: "Real Person",
      relationship: "Spouse",
      dateOfBirth: PAST,
    });
    await expect(
      updateFamilyMember(ctx, row.id, { dateOfBirth: TOMORROW }),
    ).rejects.toBeInstanceOf(FutureDateOfBirthError);
  });

  it("getOrCreateSelfMember (onboarding path) throws on a future DOB", async () => {
    const ctx = await seedUser({ userId: "u4", familyId: "fam4", isMaster: true });
    await expect(
      getOrCreateSelfMember(ctx, { name: "Me", dateOfBirth: TOMORROW }),
    ).rejects.toBeInstanceOf(FutureDateOfBirthError);
  });
});
