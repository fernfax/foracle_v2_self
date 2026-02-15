"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the Singlish mode preference for the current user
 */
export async function getSinglishMode(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { singlishMode: true },
  });

  return user?.singlishMode ?? false;
}

/**
 * Set the Singlish mode preference for the current user
 */
export async function setSinglishMode(enabled: boolean): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  await db
    .update(users)
    .set({ singlishMode: enabled, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
