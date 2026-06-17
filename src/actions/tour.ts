"use server"

import {
  emptyTourStatus,
  type TourName,
  type TourStatus
} from "@/lib/api-schemas/user-prefs"
import { getCurrentUserAndFamily } from "@/lib/auth-context"
import {
  getTourStatus as getTourStatusService,
  isTourCompleted as isTourCompletedService,
  markTourCompleted as markTourCompletedService,
  resetTourStatus as resetTourStatusService
} from "@/lib/services/user-prefs"

// NOTE: this is a "use server" module — it must export only async server
// actions. Don't re-export types here (Turbopack mis-compiles a type re-export
// into a runtime reference); import TourName/TourStatus from
// "@/lib/api-schemas/user-prefs" directly.

const EMPTY: TourStatus = emptyTourStatus()

/**
 * Get the tour completion status for the current user
 */
export async function getTourStatus(): Promise<TourStatus> {
  try {
    const ctx = await getCurrentUserAndFamily()
    return await getTourStatusService(ctx)
  } catch {
    return { ...EMPTY }
  }
}

/**
 * Mark a specific tour as completed
 */
export async function markTourCompleted(tourName: TourName): Promise<void> {
  try {
    const ctx = await getCurrentUserAndFamily()
    await markTourCompletedService(ctx, tourName)
  } catch {
    // Swallow unauth — preserves original action behavior.
  }
}

/**
 * Reset a tour so it can be replayed
 */
export async function resetTourStatus(tourName: TourName): Promise<void> {
  try {
    const ctx = await getCurrentUserAndFamily()
    await resetTourStatusService(ctx, tourName)
  } catch {
    // Swallow unauth.
  }
}

/**
 * Check if a specific tour has been completed
 */
export async function isTourCompleted(tourName: TourName): Promise<boolean> {
  try {
    const ctx = await getCurrentUserAndFamily()
    return await isTourCompletedService(ctx, tourName)
  } catch {
    return false
  }
}
