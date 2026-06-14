"use client";

import { useEffect } from "react";
import { useGlassRefraction } from "@/lib/use-glass-refraction";

/**
 * Renders the hidden #glass-refraction SVG filter and, on engines that paint
 * url() backdrop-filters (Chromium), flips `data-glass-refract="true"` on the
 * document root so the landing .glass-panel/.glass-strong surfaces refract the
 * mesh behind them. WebKit/Firefox + reduced-transparency keep clean frost
 * (see useGlassRefraction + globals.css). Additive only — never breaks layout.
 *
 * The filter is a low-frequency fractal-noise displacement: a calm, liquid
 * warp of the backdrop (tuned subtle to suit a finance brand, not watery).
 */
export function GlassDefs() {
  const refract = useGlassRefraction();

  useEffect(() => {
    if (!refract) return;
    const root = document.documentElement;
    root.setAttribute("data-glass-refract", "true");
    return () => root.removeAttribute("data-glass-refract");
  }, [refract]);

  return (
    <svg
      aria-hidden
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
    >
      <defs>
        <filter
          id="glass-refraction"
          x="-15%"
          y="-15%"
          width="130%"
          height="130%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.014"
            numOctaves={2}
            seed={7}
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="0.7" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale={12}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
