"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react";
import {
  Briefcase,
  KeyRound,
  Heart,
  Baby,
  Car,
  TrendingUp,
  GraduationCap,
  Palmtree,
} from "lucide-react";
import { useMediaQuery } from "@/lib/use-media-query";
import { Reveal } from "@/components/landing/reveal";
import { NetWorthCanvas } from "@/components/landing/net-worth-canvas";

/**
 * LifeStages — a scroll-pinned life timeline (first job → retirement).
 *
 * Desktop + motion-safe: a glass card pins to the viewport while the section
 * scrolls; scroll progress scrubs through the 8 milestones (~one viewport each)
 * — the detail panel crossfades, a side rail tracks position, and a net-worth
 * curve "grows" alongside. Mobile / reduced-motion fall back to a static
 * stacked list (one glass card per milestone), avoiding sticky/address-bar jank.
 * Reuses the same milestone data across both paths.
 */

type Stage = {
  icon: typeof Briefcase;
  age: string;
  title: string;
  desc: string;
  income: string;
  holdings: string;
  holdingsValue: number;
  color: string;
  tint: string;
};

const STAGES: Stage[] = [
  { icon: Briefcase, age: "23", title: "First job", desc: "Start tracking income and build the saving habit.", income: "S$3,800/mo", holdings: "S$8K", holdingsValue: 8000, color: "#B8622A", tint: "rgba(184,98,42,0.10)" },
  { icon: Heart, age: "28", title: "Getting married", desc: "Merge finances and set shared goals.", income: "S$5,500/mo", holdings: "S$45K", holdingsValue: 45000, color: "#D4845A", tint: "rgba(212,132,90,0.12)" },
  { icon: KeyRound, age: "29", title: "First home (BTO)", desc: "Plan the down payment, CPF and renovation.", income: "S$6,200/mo", holdings: "S$72K", holdingsValue: 72000, color: "#3A6B52", tint: "rgba(58,107,82,0.10)" },
  { icon: Baby, age: "31", title: "A new baby", desc: "Adjust the budget and open an education fund.", income: "S$7,000/mo", holdings: "S$118K", holdingsValue: 118000, color: "#D4A843", tint: "rgba(212,168,67,0.12)" },
  { icon: Car, age: "33", title: "Buying a car", desc: "Weigh the COE, loan and running costs.", income: "S$8,000/mo", holdings: "S$185K", holdingsValue: 185000, color: "#5A9470", tint: "rgba(90,148,112,0.12)" },
  { icon: TrendingUp, age: "36", title: "A big promotion", desc: "Rebalance savings as your income grows.", income: "S$11,000/mo", holdings: "S$340K", holdingsValue: 340000, color: "#B8622A", tint: "rgba(184,98,42,0.10)" },
  { icon: GraduationCap, age: "46", title: "Kids' education", desc: "Fund university without derailing retirement.", income: "S$14,000/mo", holdings: "S$720K", holdingsValue: 720000, color: "#3A6B52", tint: "rgba(58,107,82,0.10)" },
  { icon: Palmtree, age: "63", title: "Retirement", desc: "See if your CPF and nest egg are enough.", income: "S$6,000/mo", holdings: "S$1.45M", holdingsValue: 1450000, color: "#D4A843", tint: "rgba(212,168,67,0.12)" },
];

const N = STAGES.length;
const VALUES = STAGES.map((s) => s.holdingsValue);
const COLORS = STAGES.map((s) => s.color);

function StageDetails({ s }: { s: Stage }) {
  const Icon = s.icon;
  return (
    <div className="text-left">
      <div
        className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: s.tint, color: s.color }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Age {s.age}
      </p>
      <h3 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {s.title}
      </h3>
      <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
        {s.desc}
      </p>
      <div className="mt-6 flex w-fit items-stretch gap-5 rounded-xl border border-border/40 bg-card/60 px-5 py-3">
        <div>
          <p className="font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Income
          </p>
          <p className="font-display text-[15px] font-semibold tabular-nums text-foreground">
            {s.income}
          </p>
        </div>
        <div className="w-px self-stretch bg-border/50" />
        <div>
          <p className="font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Holdings
          </p>
          <p className="font-display text-[15px] font-semibold tabular-nums text-foreground">
            {s.holdings}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LifeStages() {
  const reduced = useReducedMotion();
  // Pinned scrollytelling when there's room: either a tall viewport (portrait
  // phones, desktop) OR a wide one (landscape phones lay the card out in two
  // short columns via the `desktop:` height tweaks below). Only reduced-motion
  // or a genuinely tiny screen (narrow AND short) falls back to the static list.
  const roomy = useMediaQuery("(min-height: 600px), (min-width: 768px)");
  const pinned = roomy && !reduced;

  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });
  // Calm-forward smoothing — absorbs Lenis sub-frame lag without feeling springy.
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.4 });

  const [active, setActive] = useState(0);
  useMotionValueEvent(smooth, "change", (v) => {
    const i = Math.min(N - 1, Math.max(0, Math.floor(v * N)));
    setActive((prev) => (prev === i ? prev : i));
  });

  const scrollToStage = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const travel = track.offsetHeight - window.innerHeight;
    const y = trackTop + ((i + 0.5) / N) * travel;
    if (typeof window !== "undefined" && window.__lenis) window.__lenis.scrollTo(y);
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  const introInner = (
    <>
      <p className="sec-num mb-3">Every chapter</p>
      <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
        A companion for every stage of life
      </h2>
      <p className="mt-4 text-base text-muted-foreground sm:text-lg">
        Life keeps changing — a first job, a new home, a growing family.
        {pinned ? " Keep scrolling to watch Foracle grow with you, all the way to retirement." : " See how Foracle grows with you, all the way to retirement."}
      </p>
    </>
  );

  return (
    <section
      aria-label="A companion for every stage of life"
      className="relative z-10 border-y border-border/30 bg-muted/30"
    >
      {/* Intro (standalone only for the stacked fallback; pinned mode pins it with the card) */}
      {!pinned && (
        <div className="mx-auto max-w-2xl px-5 pt-20 text-center sm:px-6 sm:pt-28 lg:px-8">
          {introInner}
        </div>
      )}

      {pinned ? (
        // ── Scroll-pinned scrollytelling: heading + card pin together ──────
        // ~0.5 viewport of scroll per milestone (was 1.0) — roughly doubles the
        // scrub speed so it doesn't take so long to walk through all stages.
        <div ref={trackRef} style={{ height: `${(N + 1) * 50}svh` }} className="relative">
          <div className="sticky top-0 flex h-svh flex-col items-center justify-center gap-5 overflow-hidden px-4 py-8 sm:px-6 desktop:gap-7 desktop:py-16 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">{introInner}</div>
            <div className="mx-auto w-full max-w-5xl">
              <div className="glass-strong relative overflow-hidden rounded-3xl">
                {/* Mobile progress bar (the side rail is desktop-only). */}
                <motion.div
                  aria-hidden
                  style={{ scaleX: smooth }}
                  className="absolute left-0 top-0 z-20 h-0.5 w-full origin-left bg-[#B8622A] lg:hidden"
                />
                {/* Soft inset column divider — doesn't touch the rounded corners. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-10 left-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-border/40 to-transparent md:block"
                />
                <div className="grid md:grid-cols-2">
                  {/* Left: net-worth line-art */}
                  <div className="relative min-h-[200px] border-b border-border/40 md:border-b-0 desktop:min-h-[460px]">
                    <NetWorthCanvas values={VALUES} colors={COLORS} progress={smooth} />
                    <div className="absolute left-6 top-6 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
                      {String(active + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}
                    </div>
                    {/* Bottom scrim — keeps the "Net worth" readout legible where
                        the curve and its early (low) nodes sit in the same corner. */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card via-card/75 to-transparent"
                    />
                    <div className="absolute bottom-6 left-6 right-6">
                      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Net worth
                      </p>
                      <p className="font-display text-2xl font-semibold tabular-nums text-foreground">
                        {STAGES[active].holdings}
                      </p>
                    </div>
                  </div>

                  {/* Right: crossfading milestone details */}
                  <div className="relative min-h-[280px] desktop:min-h-[460px]">
                    {STAGES.map((s, i) => {
                      const isActive = i === active;
                      const off = i < active ? "-translate-y-3" : "translate-y-3";
                      return (
                        <div
                          key={s.title}
                          className={`absolute inset-0 flex flex-col justify-center p-6 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:p-10 ${
                            isActive ? "translate-y-0 opacity-100" : `pointer-events-none opacity-0 ${off}`
                          }`}
                        >
                          <StageDetails s={s} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress rail — pulled in to sit just outside the card's right edge */}
            <div className="absolute left-[calc(50%_+_528px)] top-1/2 z-10 hidden h-64 -translate-y-1/2 flex-col items-center justify-between xl:flex">
              <div aria-hidden className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border/40" />
              <motion.div
                aria-hidden
                style={{ scaleY: smooth }}
                className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 origin-top bg-[#B8622A]"
              />
              {STAGES.map((s, i) => {
                const isActive = i === active;
                return (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => scrollToStage(i)}
                    aria-label={`${s.title}, age ${s.age}`}
                    aria-current={isActive ? "true" : undefined}
                    className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full"
                  >
                    <span
                      className="rounded-full transition-all duration-300"
                      style={
                        isActive
                          ? { width: 11, height: 11, backgroundColor: s.color, boxShadow: `0 0 0 4px ${s.tint}` }
                          : { width: 7, height: 7, backgroundColor: "hsl(var(--muted-foreground) / 0.4)" }
                      }
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        // ── Static stacked fallback (mobile / reduced-motion) ─────────────
        <div className="mx-auto max-w-2xl space-y-4 px-5 py-14 sm:px-6">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.title} delay={(i % 4) * 60} className="glass-panel rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 flex-none items-center justify-center rounded-xl"
                    style={{ backgroundColor: s.tint, color: s.color }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Age {s.age}
                    </p>
                    <h3 className="mt-0.5 font-display text-lg font-semibold tracking-tight text-foreground">
                      {s.title}
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                      {s.desc}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-display text-[13px] tabular-nums text-muted-foreground">
                        {s.income}
                      </span>
                      <span className="font-display text-[13px] font-semibold tabular-nums text-foreground">
                        {s.holdings}
                      </span>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}

      <p className="mx-auto max-w-2xl px-5 pb-20 pt-2 text-center font-display text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80 sm:pb-28">
        From your first paycheck to your last working day
      </p>
    </section>
  );
}
