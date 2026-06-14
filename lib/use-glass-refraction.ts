import { useEffect, useState } from "react";

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
export function useGlassRefraction(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.CSS?.supports) return;

    const hasBackdrop =
      CSS.supports("backdrop-filter", "blur(1px)") ||
      CSS.supports("-webkit-backdrop-filter", "blur(1px)");
    if (!hasBackdrop) return;

    if (window.matchMedia("(prefers-reduced-transparency: reduce)").matches) {
      return;
    }

    const ua = navigator.userAgent;
    const isWebKit =
      /AppleWebKit/.test(ua) && !/Chrome|Chromium|CriOS|Edg/.test(ua);
    if (!isWebKit) setEnabled(true);
  }, []);

  return enabled;
}
