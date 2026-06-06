import { TileMotif } from "@/components/ui/tile-motif";
import { ArrowUpRight, TrendingUp } from "lucide-react";

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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

// Smooth net-worth curve (Catmull-Rom → cubic) in a 300×100 viewBox, trending up.
const NET_WORTH_LINE =
  "M12 68 C21.2 66.8 48.8 61.5 67.2 60.8 C85.6 60.1 104 66.8 122.4 64 " +
  "C140.8 61.2 159.2 48.5 177.6 44 C196 39.5 214.4 41.7 232.8 36.8 " +
  "C251.2 31.9 278.8 18.1 288 14.4";
const NET_WORTH_AREA = `${NET_WORTH_LINE} L288 100 L12 100 Z`;
// End point as a fraction of the chart box, for the live dot overlay.
const END = { left: "96%", top: "14.4%" };

const CATEGORIES = [
  { name: "Income", value: "S$8,400", pct: 100, color: "#3A6B52", delay: "0.5s" },
  { name: "Expenses", value: "S$5,120", pct: 61, color: "#B8622A", delay: "0.65s" },
  { name: "Saved", value: "S$3,280", pct: 39, color: "#00C4AA", delay: "0.8s" },
];

export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      {/* Ambient glow behind the card */}
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-[2rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(184,98,42,0.16),transparent_70%)] blur-2xl"
      />

      {/* Main dashboard card */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-[rgba(28,43,42,0.08)] bg-card/95 shadow-[0_2px_4px_rgba(28,43,42,0.06),0_24px_60px_rgba(28,43,42,0.16),0_48px_120px_rgba(28,43,42,0.10)] backdrop-blur-sm">
        <TileMotif size="standard" />

        <div className="grid gap-0 sm:grid-cols-5">
          {/* Left: net worth + animated line chart */}
          <div className="sm:col-span-3 p-6 sm:p-8 border-b sm:border-b-0 sm:border-r border-[rgba(28,43,42,0.07)]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00C4AA] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00C4AA]" />
              </span>
              <span className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Net worth · Live
              </span>
            </div>

            <div className="mt-3 flex items-end gap-3">
              <span className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.02em] tabular-nums text-foreground">
                S$248,500
              </span>
              <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-[rgba(0,196,170,0.12)] px-2 py-0.5 font-display text-[11px] font-semibold text-[#007A68]">
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
                aria-hidden
              >
                <defs>
                  <linearGradient id="hpAreaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B8622A" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#B8622A" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path className="hp-area" d={NET_WORTH_AREA} fill="url(#hpAreaFill)" />
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
                style={{ left: END.left, top: END.top, transform: "translate(-50%, -50%)" }}
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="hp-halo absolute inline-flex h-full w-full rounded-full bg-[#B8622A]" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-card bg-[#B8622A]" />
                </span>
              </div>
            </div>

            <div className="mt-3 flex justify-between">
              {MONTHS.map((m) => (
                <span
                  key={m}
                  className="font-display text-[9px] font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Right: this month breakdown */}
          <div className="sm:col-span-2 p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                This month
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>

            <div className="mt-5 space-y-5">
              {CATEGORIES.map((c) => (
                <div key={c.name}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] text-muted-foreground">{c.name}</span>
                    <span className="font-display text-[13px] font-semibold tabular-nums text-foreground">
                      {c.value}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(28,43,42,0.07)]">
                    <div
                      className="hp-bar h-full rounded-full"
                      style={{ width: `${c.pct}%`, backgroundColor: c.color, animationDelay: c.delay }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Goal chip */}
            <div className="mt-6 rounded-xl border border-[rgba(28,43,42,0.08)] bg-muted/50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Emergency fund
                </span>
                <span className="font-display text-[11px] font-semibold tabular-nums text-[#007A68]">
                  82%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(28,43,42,0.07)]">
                <div
                  className="hp-bar h-full w-[82%] rounded-full bg-[#00C4AA]"
                  style={{ animationDelay: "0.95s" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating insight chip — overlaps bottom-left */}
      <div className="absolute -bottom-5 left-4 hidden sm:flex items-center gap-2.5 rounded-2xl border border-[rgba(28,43,42,0.08)] bg-card px-4 py-3 shadow-[0_12px_32px_rgba(28,43,42,0.14)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(184,98,42,0.10)]">
          <TrendingUp className="h-4 w-4 text-[#B8622A]" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-[12px] font-semibold text-foreground">
            On track for 2027
          </p>
          <p className="text-[11px] text-muted-foreground">Projected savings goal met</p>
        </div>
      </div>
    </div>
  );
}
