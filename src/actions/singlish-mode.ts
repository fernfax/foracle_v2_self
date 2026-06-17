"use server"

import { revalidatePath } from "next/cache"

import { getCurrentUserAndFamily } from "@/lib/auth-context"
import {
  getBackgroundDecor as getBackgroundDecorService,
  getSinglishMode as getSinglishModeService,
  setBackgroundDecor as setBackgroundDecorService,
  setSinglishMode as setSinglishModeService,
  type BackgroundDecor
} from "@/lib/services/user-prefs"

/**
 * Get the Singlish mode preference for the current user
 */
export async function getSinglishMode(): Promise<boolean> {
  try {
    const ctx = await getCurrentUserAndFamily()
    return await getSinglishModeService(ctx)
  } catch {
    return false
  }
}

/**
 * Set the Singlish mode preference for the current user
 */
export async function setSinglishMode(enabled: boolean): Promise<void> {
  try {
    const ctx = await getCurrentUserAndFamily()
    await setSinglishModeService(ctx, enabled)
  } catch {
    // Preserve original swallow-on-unauth behavior so callers aren't forced
    // to handle UnauthorizedError on a preference setter.
  }
}

export async function getBackgroundDecor(): Promise<BackgroundDecor> {
  try {
    const ctx = await getCurrentUserAndFamily()
    return await getBackgroundDecorService(ctx)
  } catch {
    return "radial"
  }
}

export async function setBackgroundDecor(
  decor: BackgroundDecor
): Promise<void> {
  const ctx = await getCurrentUserAndFamily()
  await setBackgroundDecorService(ctx, decor)
  revalidatePath("/", "layout")
}
