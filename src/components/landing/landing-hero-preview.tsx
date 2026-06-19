import { ArrowUpRight, TrendingUp } from "lucide-react"

import { TileMotif } from "@/components/layout/layout-tile-motif"

/**
 * HeroPreview — a static, on-brand dashboard mockup for the landing hero.
 *
 * Borrows the Polaris "structured analyzing card" idea but renders a real
 * Foracle-flavoured net-worth / cashflow snapshot using brand tokens only.
 *
 * Entrance motion is pure CSS (see the `.hp-*` classes / @keyframes in
 * app/globals.css), so this stays a server component: the net-worth line
 * draws itself in, and the "this month" bars grow from zero on load. All
 * base states are the final/visible state, so reduced-motion just renders
 * everything fully drawn.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]

// Smooth net-worth curve (Catmull-Rom → cubic) in a 300×100 viewBox, trending up.
const NET_WORTH_LINE =
  "M12 68 C21.2 66.8 48.8 61.5 67.2 60.8 C85.6 60.1 104 66.8 122.4 64 " +
  "C140.8 61.2 159.2 48.5 177.6 44 C196 39.5 214.4 41.7 232.8 36.8 " +
  "C251.2 31.9 278.8 18.1 288 14.4"
const NET_WORTH_AREA = `${NET_WORTH_LINE} L288 100 L12 100 Z`
// End point as a fraction of the chart box, for the live dot overlay.
const END = { left: "96%", top: "14.4%" }

const CATEGORIES = [
  {
    name: "Income",
    value: "S$8,400",
    pct: 100,
    color: "#3A6B52",
    delay: "0.5s"
  },
  {
    name: "Expenses",
    value: "S$5,120",
    pct: 61,
    color: "#B8622A",
    delay: "0.65s"
  },
  { name: "Saved", value: "S$3,280", pct: 39, color: "#00C4AA", delay: "0.8s" }
]

export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      {/* Ambient glow behind the card */}
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-[2rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(184,98,42,0.16),transparent_70%)] blur-2xl"
      />

      {/* Main dashboard card */}
      <div className="glass-strong relative overflow-hidden rounded-[1.75rem]">
        <TileMotif size="standard" />

        <div className="grid gap-0 sm:grid-cols-5">
          {/* Left: net worth + animated line chart */}
          <div className="border-brand-deep-forest/[0.07] border-b p-6 sm:col-span-3 sm:border-r sm:border-b-0 sm:p-8">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="bg-brand-teal absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
                <span className="bg-brand-teal relative inline-flex h-2 w-2 rounded-full" />
              </span>
              <span className="font-display text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">
                Net worth · Live
              </span>
            </div>

            <div className="mt-3 flex items-end gap-3">
              <span className="font-display text-foreground text-3xl font-semibold tracking-[-0.02em] tabular-nums sm:text-4xl">
                S$248,500
              </span>
              <span className="font-display text-on-success bg-brand-teal/[0.12] mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                <TrendingUp className="h-3 w-3" />
                4.2%
              </span>
            </div>

            {/* Animated net-worth line chart */}
            <div className="relative mt-6 h-28 w-full">
              <svg
                viewBox="0 0 300 100"
                preserveAspectRatio="none"
                className="h-full w-full overflow-visible"
                aria-hidden>
                <defs>
                  <linearGradient id="hpAreaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B8622A" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#B8622A" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  className="hp-area"
                  d={NET_WORTH_AREA}
                  fill="url(#hpAreaFill)"
                />
                <path
                  className="hp-line"
                  d={NET_WORTH_LINE}
                  fill="none"
                  stroke="#B8622A"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                />
              </svg>

              {/* Live end-point dot + pulsing halo */}
              <div
                className="hp-dot absolute"
                style={{
                  left: END.left,
                  top: END.top,
                  transform: "translate(-50%, -50%)"
                }}>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="hp-halo bg-brand-terracotta absolute inline-flex h-full w-full rounded-full" />
                  <span className="border-card bg-brand-terracotta relative inline-flex h-2.5 w-2.5 rounded-full border-2" />
                </span>
              </div>
            </div>

            <div className="mt-3 flex justify-between">
              {MONTHS.map((m) => (
                <span
                  key={m}
                  className="font-display text-muted-foreground text-[9px] font-medium tracking-wider uppercase">
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Right: this month breakdown */}
          <div className="p-6 sm:col-span-2 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="font-display text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">
                This month
              </span>
              <ArrowUpRight className="text-muted-foreground h-3.5 w-3.5" />
            </div>

            <div className="mt-5 space-y-5">
              {CATEGORIES.map((c) => (
                <div key={c.name}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-muted-foreground text-[13px]">
                      {c.name}
                    </span>
                    <span className="font-display text-foreground text-[13px] font-semibold tabular-nums">
                      {c.value}
                    </span>
                  </div>
                  <div className="bg-brand-deep-forest/[0.07] mt-2 h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="hp-bar h-full rounded-full"
                      style={{
                        width: `${c.pct}%`,
                        backgroundColor: c.color,
                        animationDelay: c.delay
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Goal chip */}
            <div className="bg-muted/50 border-brand-deep-forest/[0.08] mt-6 rounded-xl border p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-display text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
                  Emergency fund
                </span>
                <span className="font-display text-on-success text-[11px] font-semibold tabular-nums">
                  82%
                </span>
              </div>
              <div className="bg-brand-deep-forest/[0.07] mt-2 h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="hp-bar bg-brand-teal h-full w-[82%] rounded-full"
                  style={{ animationDelay: "0.95s" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating insight chip — overlaps bottom-left */}
      <div className="glass-panel absolute -bottom-5 left-4 hidden items-center gap-2.5 rounded-2xl px-4 py-3 sm:flex">
        <div className="bg-brand-terracotta/[0.1] flex h-8 w-8 items-center justify-center rounded-lg">
          <TrendingUp className="text-brand-terracotta h-4 w-4" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-foreground text-[12px] font-semibold">
            On track for 2027
          </p>
          <p className="text-muted-foreground text-[11px]">
            Projected savings goal met
          </p>
        </div>
      </div>
    </div>
  )
}
