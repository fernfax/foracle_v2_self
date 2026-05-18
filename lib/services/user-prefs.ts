import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { AuthContext } from "@/lib/auth-context";
import { TOUR_NAMES, type TourName, type TourStatus } from "@/lib/api-schemas/user-prefs";

const EMPTY_TOUR_STATUS: TourStatus = {
  overall: null,
  dashboard: null,
  incomes: null,
  expenses: null,
};

export async function getSinglishMode(ctx: AuthContext): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, ctx.userId),
    columns: { singlishMode: true },
  });
  return user?.singlishMode ?? false;
}

export async function setSinglishMode(
  ctx: AuthContext,
  enabled: boolean
): Promise<boolean> {
  await db
    .update(users)
    .set({ singlishMode: enabled, updatedAt: new Date() })
    .where(eq(users.id, ctx.userId));
  return enabled;
}

export type BackgroundDecor = "radial" | "peranakan" | "none";

const VALID_DECORS: BackgroundDecor[] = ["radial", "peranakan", "none"];

export async function getBackgroundDecor(
  ctx: AuthContext
): Promise<BackgroundDecor> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, ctx.userId),
    columns: { backgroundDecor: true },
  });
  const value = user?.backgroundDecor;
  return VALID_DECORS.includes(value as BackgroundDecor)
    ? (value as BackgroundDecor)
    : "radial";
}

export async function setBackgroundDecor(
  ctx: AuthContext,
  decor: BackgroundDecor
): Promise<BackgroundDecor> {
  if (!VALID_DECORS.includes(decor)) {
    throw new Error(`Invalid background decor: ${decor}`);
  }
  await db
    .update(users)
    .set({ backgroundDecor: decor, updatedAt: new Date() })
    .where(eq(users.id, ctx.userId));
  return decor;
}

// Tour status is persisted as a JSON-stringified Record on users.tourCompletedAt.
// Parse defensively — any malformed value resolves to the empty status so a
// single bad write can't lock the user out of tour-related UI.
export async function getTourStatus(ctx: AuthContext): Promise<TourStatus> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, ctx.userId),
    columns: { tourCompletedAt: true },
  });
  if (!user?.tourCompletedAt) return { ...EMPTY_TOUR_STATUS };
  try {
    const parsed = JSON.parse(user.tourCompletedAt) as Partial<TourStatus>;
    return {
      overall: parsed.overall ?? null,
      dashboard: parsed.dashboard ?? null,
      incomes: parsed.incomes ?? null,
      expenses: parsed.expenses ?? null,
    };
  } catch {
    return { ...EMPTY_TOUR_STATUS };
  }
}

async function writeTourStatus(
  ctx: AuthContext,
  status: TourStatus
): Promise<TourStatus> {
  await db
    .update(users)
    .set({
      tourCompletedAt: JSON.stringify(status),
      updatedAt: new Date(),
    })
    .where(eq(users.id, ctx.userId));
  return status;
}

export async function markTourCompleted(
  ctx: AuthContext,
  tour: TourName
): Promise<TourStatus> {
  const current = await getTourStatus(ctx);
  current[tour] = new Date().toISOString();
  return writeTourStatus(ctx, current);
}

export async function resetTourStatus(
  ctx: AuthContext,
  tour: TourName
): Promise<TourStatus> {
  const current = await getTourStatus(ctx);
  current[tour] = null;
  return writeTourStatus(ctx, current);
}

export async function isTourCompleted(
  ctx: AuthContext,
  tour: TourName
): Promise<boolean> {
  const status = await getTourStatus(ctx);
  return status[tour] !== null;
}

export { TOUR_NAMES };
