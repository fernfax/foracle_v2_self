/**
 * Atmospheric concentric-circle decor for the app shell background.
 *
 * Sits fixed behind content (`fixed inset-0 -z-10`) and renders as a
 * faint radar-style backdrop anchored toward the top-right. The user
 * shouldn't consciously notice it — it just adds subtle dimensionality
 * to the warm-cream canvas so pages don't feel like a blank wash.
 *
 * Spec from the polish brief:
 *   - 3–5% opacity
 *   - large concentric circles
 *   - off-white stroke (we use Deep Forest tinted to match the brand)
 *   - 1px stroke
 *   - partial crop off-screen
 *
 * The SVG uses `preserveAspectRatio="xMaxYMin slice"` so the circles
 * stay anchored to the top-right regardless of viewport width.
 *
 * Theme-aware: the stroke is `hsl(var(--foreground))`, so the rings render
 * deep-forest on the light canvas and cream on the dark canvas — both faint.
 * (Originally dark-hidden per design guide §11; now dark-tuned so the chosen
 * wallpaper carries through to dark mode at a slightly higher opacity, since
 * cream-on-nightfall needs a touch more presence than forest-on-cream.)
 */
export function RadialDecor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 opacity-[0.10] dark:opacity-[0.14]">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1200 900"
        preserveAspectRatio="xMaxYMin slice"
        xmlns="http://www.w3.org/2000/svg">
        {[
          60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840,
          900, 960, 1020, 1080
        ].map((r) => (
          <circle
            key={r}
            cx={1080}
            cy={140}
            r={r}
            stroke="hsl(var(--foreground))"
            strokeWidth={1.25}
            fill="none"
          />
        ))}
      </svg>
    </div>
  )
}
