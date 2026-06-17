import { useSyncExternalStore } from "react"

/**
 * Gate for the Liquid Glass nav's Chromium-only edge refraction.
 *
 * The refraction is an SVG `feDisplacementMap` referenced via
 * `backdrop-filter: url(#…)`. Chromium paints it; WebKit (Safari/iOS) parses the
 * value but ignores `url()` filter references in `backdrop-filter` at paint —
 * so `CSS.supports('backdrop-filter','url(#x)')` returns `true` on Safari and
 * CANNOT distinguish "renders" from "accepts-and-drops". The capability is not
 * cleanly feature-detectable, so the honest signal is the engine: a narrow
 * WebKit UA backstop (paired with a real `CSS.supports` check for backdrop-filter
 * itself). UA is used only because `@supports` genuinely can't gate this.
 *
 * Safe either way: the displacement is purely additive. Wrongly ON for WebKit →
 * Safari ignores the url() → baseline glass. Wrongly OFF for Chromium → baseline
 * glass. Neither direction breaks — worst case is "no refraction".
 *
 * Returns `false` on SSR and first client paint, so the server-rendered baseline
 * glass shows immediately with no flash or hydration mismatch; the enhancement
 * is added after mount. Also bails for users with Reduce Transparency on.
 */

// The capability is fixed for the lifetime of the page, so nothing ever calls
// the change callback — the subscription only exists to satisfy the store API.
function subscribe(): () => void {
  return () => {}
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || !window.CSS?.supports) return false

  const hasBackdrop =
    CSS.supports("backdrop-filter", "blur(1px)") ||
    CSS.supports("-webkit-backdrop-filter", "blur(1px)")
  if (!hasBackdrop) return false

  if (window.matchMedia("(prefers-reduced-transparency: reduce)").matches) {
    return false
  }

  const ua = navigator.userAgent
  const isWebKit =
    /AppleWebKit/.test(ua) && !/Chrome|Chromium|CriOS|Edg/.test(ua)
  return !isWebKit
}

function getServerSnapshot(): boolean {
  return false
}

export function useGlassRefraction(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
