import { format, startOfToday } from "date-fns"

/**
 * Midnight today (local time). Reuse this for "no future dates" calendar
 * matchers — e.g. `disabled={{ after: today() }}` on a date-of-birth picker —
 * so every call site agrees on the same reference point instead of sprinkling
 * `new Date()` around.
 */
export function today(): Date {
  return startOfToday()
}

/** Today as a `yyyy-MM-dd` string, matching the ISO dates we persist. */
export function todayIso(): string {
  return format(startOfToday(), "yyyy-MM-dd")
}

/**
 * True when an ISO `yyyy-MM-dd` date is strictly after today (local). Used to
 * reject future dates of birth. Lexicographic comparison is valid because the
 * format is zero-padded and fixed-width.
 */
export function isFutureIsoDate(iso: string): boolean {
  return iso > todayIso()
}
