/**
 * Next.js instrumentation hook — runs once per server process, before any
 * request handling. Used here only to silence a known-benign Node warning
 * that pollutes the dev console after the laptop sleeps.
 *
 * Why this exists
 * ──────────────
 * `postgres-js` (and several other libs) schedule housekeeping callbacks
 * with `setTimeout(fn, delayMs)` — e.g. an idle-connection reaper at
 * T+30s. Node tracks these against the monotonic clock. When macOS
 * suspends and resumes, real wall time has advanced but the scheduled
 * timeout's target timestamp is now in the past. Node clamps the delay
 * to 1ms, runs the callback immediately (which is correct behaviour),
 * and emits a `TimeoutNegativeWarning` to flag it.
 *
 * The warning is purely informational — there is no underlying bug to
 * fix in our code or in `postgres-js`. It just makes the dev terminal
 * noisy. We filter ONLY this specific warning name so any other
 * `process.on('warning')` signal (deprecation, experimental, real bugs)
 * still surfaces normally.
 *
 * Refs:
 *   - https://nodejs.org/api/process.html#event-warning
 *   - https://github.com/porsager/postgres/issues/836 (same root cause)
 */
import { IS_DEV } from "@/configs/env.config"

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  // Only filter in local dev — deployed servers never sleep, so the warning
  // would only ever fire from a real bug we'd want to see.
  if (!IS_DEV) return

  // The actual process.emitWarning override lives in a Node-only module, loaded
  // here via dynamic import so this hook (which Turbopack also builds for the
  // Edge runtime) carries no Node-only APIs.
  const { suppressTimeoutWarning } =
    await import("@/lib/suppress-timeout-warning")
  suppressTimeoutWarning()
}
