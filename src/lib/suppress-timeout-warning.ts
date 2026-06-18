/**
 * Node-only: intercept `process.emitWarning` to drop the benign
 * `TimeoutNegativeWarning` that `postgres-js` timers emit after the laptop
 * sleeps (see src/instrumentation.ts for the full rationale).
 *
 * This lives in its own module — and is loaded via a dynamic import inside the
 * Node-runtime branch of the instrumentation hook — so the Edge build of
 * `instrumentation.ts` contains no Node-only APIs (Turbopack otherwise flags
 * `process.emitWarning` even though it's runtime-guarded).
 */
export function suppressTimeoutWarning() {
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
