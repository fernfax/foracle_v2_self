"use client"

import { useEffect, useState } from "react"

/**
 * SSR-safe media-query hook. Returns `false` on the server and first client
 * paint (so components can SSR their safe/default branch), then updates after
 * mount and on viewport changes. Used by the landing to pick the scroll-pinned
 * vs. stacked LifeStages layout without a hydration mismatch.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [query])

  return matches
}
