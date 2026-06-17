"use client"

import { useCallback, useSyncExternalStore } from "react"

/**
 * SSR-safe media-query hook. Returns `false` on the server and first client
 * paint (so components can SSR their safe/default branch), then updates after
 * mount and on viewport changes. Used by the landing to pick the scroll-pinned
 * vs. stacked LifeStages layout without a hydration mismatch.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onStoreChange)
      return () => mql.removeEventListener("change", onStoreChange)
    },
    [query]
  )

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query]
  )

  // Server snapshot is always `false` so the SSR/first-paint branch is stable.
  const getServerSnapshot = () => false

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
