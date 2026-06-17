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
import { isDevelopment } from "@/configs/deployment-env"

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  // Only filter in local dev — deployed servers never sleep, so the warning
  // would only ever fire from a real bug we'd want to see.
  if (!isDevelopment) return

  // NOTE: a `process.on("warning", …)` listener does NOT suppress Node's default
  // stderr printer — verified on Node 24, both fire — so the older listener
  // approach silently stopped working. Intercept `process.emitWarning` itself and
  // drop ONLY this one warning name; every other warning (deprecation,
  // experimental, genuine bugs) still surfaces through the untouched original.
  const originalEmitWarning = process.emitWarning.bind(process)
  process.emitWarning = ((warning: unknown, ...args: unknown[]) => {
    const opt = args[0]
    const type =
      typeof opt === "string"
        ? opt
        : (opt as { type?: string } | undefined)?.type
    const name =
      typeof warning === "object" && warning !== null
        ? (warning as { name?: string }).name
        : undefined
    if (type === "TimeoutNegativeWarning" || name === "TimeoutNegativeWarning")
      return
    return (originalEmitWarning as (...a: unknown[]) => void)(warning, ...args)
  }) as typeof process.emitWarning
}
