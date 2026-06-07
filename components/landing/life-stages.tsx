"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Briefcase,
  KeyRound,
  Heart,
  Baby,
  Car,
  TrendingUp,
  GraduationCap,
  Palmtree,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/**
 * LifeStages — a user-scrollable horizontal life timeline.
 *
 * Objective start (First job) → end (Retirement), no loop. As the user scrolls
 * (swipe / trackpad / arrows / keyboard), the milestone nearest the centre
 * becomes "focused": its icon enlarges and a detail panel (title, description,
 * age, income, holdings) fades in. Non-focused milestones show only a dimmed
 * icon. CSS scroll-snap centres the focused item so motion settles smoothly.
 */

type Stage = {
  icon: typeof Briefcase;
  age: string;
  title: string;
  desc: string;
  income: string;
  holdings: string;
  color: string;
  tint: string;
};

const STAGES: Stage[] = [
  {
    icon: Briefcase,
    age: "23",
    title: "First job",
    desc: "Start tracking income and build the saving habit.",
    income: "S$3,800/mo",
    holdings: "S$8K",
    color: "#B8622A",
    tint: "rgba(184,98,42,0.10)",
  },
  {
    icon: Heart,
    age: "28",
    title: "Getting married",
    desc: "Merge finances and set shared goals.",
    income: "S$5,500/mo",
    holdings: "S$45K",
    color: "#D4845A",
    tint: "rgba(212,132,90,0.12)",
  },
  {
    icon: KeyRound,
    age: "29",
    title: "First home (BTO)",
    desc: "Plan the down payment, CPF and renovation.",
    income: "S$6,200/mo",
    holdings: "S$72K",
    color: "#3A6B52",
    tint: "rgba(58,107,82,0.10)",
  },
  {
    icon: Baby,
    age: "31",
    title: "A new baby",
    desc: "Adjust the budget and open an education fund.",
    income: "S$7,000/mo",
    holdings: "S$118K",
    color: "#D4A843",
    tint: "rgba(212,168,67,0.12)",
  },
  {
    icon: Car,
    age: "33",
    title: "Buying a car",
    desc: "Weigh the COE, loan and running costs.",
    income: "S$8,000/mo",
    holdings: "S$185K",
    color: "#5A9470",
    tint: "rgba(90,148,112,0.12)",
  },
  {
    icon: TrendingUp,
    age: "36",
    title: "A big promotion",
    desc: "Rebalance savings as your income grows.",
    income: "S$11,000/mo",
    holdings: "S$340K",
    color: "#B8622A",
    tint: "rgba(184,98,42,0.10)",
  },
  {
    icon: GraduationCap,
    age: "46",
    title: "Kids' education",
    desc: "Fund university without derailing retirement.",
    income: "S$14,000/mo",
    holdings: "S$720K",
    color: "#3A6B52",
    tint: "rgba(58,107,82,0.10)",
  },
  {
    icon: Palmtree,
    age: "63",
    title: "Retirement",
    desc: "See if your CPF and nest egg are enough.",
    income: "S$6,000/mo",
    holdings: "S$1.45M",
    color: "#D4A843",
    tint: "rgba(212,168,67,0.12)",
  },
];

const ITEM = 200; // px, fixed so the centre-padding calc stays consistent

export function LifeStages() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(0);
  // Leading/trailing spacer width so the first and last items can reach centre.
  const [pad, setPad] = useState(0);
  // Auto-advance bookkeeping (kept in refs so the interval closure stays fresh).
  const focusedRef = useRef(0);
  const hoverRef = useRef(false);
  const idleUntilRef = useRef(0); // pause auto-advance until this timestamp after a user gesture

  const update = useCallback(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const rect = sc.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const items = sc.querySelectorAll<HTMLElement>("[data-stage]");
    let best = 0;
    let bestDist = Infinity;
    items.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    focusedRef.current = best;
    setFocused(best);
  }, []);

  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    let raf = 0;
    const measure = () => setPad(Math.max(0, (sc.clientWidth - ITEM) / 2));
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    sc.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    measure();
    update();
    return () => {
      sc.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [update]);

  // Once the spacers lay out (pad applied), recompute which item is centred.
  useEffect(() => {
    const raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [pad, update]);

  const animRef = useRef(0);
  const cancelAnim = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = 0;
    }
  }, []);

  // Distance (in px of scrollLeft) needed to bring item `i` to the centre.
  // Uses getBoundingClientRect so it's robust to the spacer/wrapper nesting, and
  // only ever touches the scroller's own scrollLeft — never scrollIntoView — so
  // the page never jumps vertically while auto-advancing.
  const targetFor = (i: number) => {
    const sc = scrollerRef.current;
    if (!sc) return null;
    const clamped = Math.max(0, Math.min(STAGES.length - 1, i));
    const el = sc.querySelectorAll<HTMLElement>("[data-stage]")[clamped];
    if (!el) return null;
    const scRect = sc.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return sc.scrollLeft + (elRect.left + elRect.width / 2) - (scRect.left + scRect.width / 2);
  };

  const jumpTo = useCallback((i: number) => {
    const sc = scrollerRef.current;
    cancelAnim();
    const target = targetFor(i);
    if (sc && target != null) sc.scrollLeft = target;
  }, [cancelAnim]);

  const animateTo = useCallback(
    (i: number, duration = 700) => {
      const sc = scrollerRef.current;
      cancelAnim();
      const target = targetFor(i);
      if (!sc || target == null) return;
      const start = sc.scrollLeft;
      const dist = target - start;
      if (Math.abs(dist) < 1) return;
      const t0 = performance.now();
      // easeInOutSine — gentle, steady motion so the lateral shift is easy to follow.
      const ease = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        sc.scrollLeft = start + dist * ease(p);
        animRef.current = p < 1 ? requestAnimationFrame(step) : 0;
      };
      animRef.current = requestAnimationFrame(step);
    },
    [cancelAnim]
  );

  const goTo = useCallback((i: number) => animateTo(i, 650), [animateTo]);

  // JS scroll-snap replacement: after the user stops scrolling, gently settle the
  // nearest milestone to centre. (CSS scroll-snap was hijacking the JS glide and
  // snapping it to the target almost instantly.)
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    let settleTimer = 0;
    const onScrollSettle = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        if (!animRef.current) animateTo(focusedRef.current, 360);
      }, 160);
    };
    sc.addEventListener("scroll", onScrollSettle, { passive: true });
    return () => {
      sc.removeEventListener("scroll", onScrollSettle);
      window.clearTimeout(settleTimer);
    };
  }, [animateTo]);

  // Gentle, forward-only auto-advance. Pauses on hover or recent user gesture;
  // loops by jumping straight back to the start (never animates backward in time).
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onEnter = () => {
      hoverRef.current = true;
    };
    const onLeave = () => {
      hoverRef.current = false;
    };
    const onUserGesture = () => {
      idleUntilRef.current = Date.now() + 4500;
      cancelAnim();
    };
    sc.addEventListener("mouseenter", onEnter);
    sc.addEventListener("mouseleave", onLeave);
    sc.addEventListener("wheel", onUserGesture, { passive: true });
    sc.addEventListener("touchstart", onUserGesture, { passive: true });
    sc.addEventListener("pointerdown", onUserGesture);
    sc.addEventListener("keydown", onUserGesture);

    const id = window.setInterval(() => {
      if (hoverRef.current || Date.now() < idleUntilRef.current) return;
      if (focusedRef.current >= STAGES.length - 1) {
        jumpTo(0); // loop forward: instant reset, no backward animation
      } else {
        goTo(focusedRef.current + 1); // same glide speed as the arrow buttons
      }
    }, 5500);

    return () => {
      window.clearInterval(id);
      sc.removeEventListener("mouseenter", onEnter);
      sc.removeEventListener("mouseleave", onLeave);
      sc.removeEventListener("wheel", onUserGesture);
      sc.removeEventListener("touchstart", onUserGesture);
      sc.removeEventListener("pointerdown", onUserGesture);
      sc.removeEventListener("keydown", onUserGesture);
    };
  }, [goTo, jumpTo, cancelAnim]);

  return (
    <section className="relative z-10 overflow-hidden border-y border-border/30 bg-muted py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="sec-num mb-3">Every chapter</p>
          <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
            A companion for every stage of life
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Life keeps changing — a first job, a new home, a growing family. Scroll through the
            journey to see how Foracle grows with you, all the way to retirement.
          </p>
        </div>
      </div>

      <div className="relative mt-14">
        {/* Edge fades hint that there's more to scroll */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-20 w-16 bg-gradient-to-r from-muted to-transparent sm:w-28"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 bg-gradient-to-l from-muted to-transparent sm:w-28"
        />

        {/* Prev / next controls (desktop) */}
        <button
          type="button"
          onClick={() => goTo(focused - 1)}
          disabled={focused === 0}
          aria-label="Previous milestone"
          className="absolute left-3 top-[66px] z-30 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border/40 bg-card p-2 text-foreground/70 shadow-sm transition-all hover:text-foreground disabled:pointer-events-none disabled:opacity-0 sm:flex lg:left-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => goTo(focused + 1)}
          disabled={focused === STAGES.length - 1}
          aria-label="Next milestone"
          className="absolute right-3 top-[66px] z-30 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border/40 bg-card p-2 text-foreground/70 shadow-sm transition-all hover:text-foreground disabled:pointer-events-none disabled:opacity-0 sm:flex lg:right-8"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Scroller */}
        <div
          ref={scrollerRef}
          role="region"
          aria-label="Life stages timeline"
          tabIndex={0}
          className="scrollbar-hide overflow-x-auto py-8 outline-none"
        >
          <div className="relative flex w-max">
            <div aria-hidden className="flex-none" style={{ width: pad }} />
            {/* Items wrapper holds the connecting rail (first node centre → last node centre) */}
            <div className="relative flex min-h-[300px]">
              <div
                aria-hidden
                className="pointer-events-none absolute top-[34px] h-px bg-[rgba(28,43,42,0.14)]"
                style={{ left: ITEM / 2, right: ITEM / 2 }}
              />
              {STAGES.map((s, i) => {
                const Icon = s.icon;
                const isFocused = i === focused;
                // Real 3D depth: side milestones rotate away and recede on the Z
                // axis (coverflow), the focused one pops slightly forward.
                const sd = i - focused; // signed distance
                const ad = Math.abs(sd);
                const rotateY = Math.max(-42, Math.min(42, -sd * 16));
                const tz = isFocused ? 30 : -ad * 150;
                const dim = isFocused ? 1 : ad === 1 ? 0.55 : ad === 2 ? 0.38 : 0.24;
                const blur = isFocused ? 0 : Math.min(ad, 3) * 0.5;
                return (
                  <div
                    key={s.title}
                    data-stage
                    className="relative flex-none"
                    style={{ width: ITEM }}
                  >
                    {/* Icon node — card ring masks the rail behind it */}
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-label={`${s.title}, age ${s.age}`}
                      className="group relative z-10 mx-auto block rounded-full outline-none"
                    >
                      <div
                        className="relative rounded-full bg-card p-1.5 transition-[transform,opacity,filter] duration-300 ease-out motion-reduce:transition-none"
                        style={{
                          transform: `perspective(800px) translateZ(${tz}px) rotateY(${rotateY}deg)`,
                          opacity: dim,
                          filter: blur ? `blur(${blur}px)` : undefined,
                        }}
                      >
                        {isFocused && (
                          <>
                            {/* gentle breathing ring */}
                            <span
                              aria-hidden
                              className="ls-pulse pointer-events-none absolute -inset-0.5 rounded-full"
                              style={{ boxShadow: `0 0 0 1.5px ${s.color}` }}
                            />
                            {/* orbiting accent dot */}
                            <span
                              aria-hidden
                              className="pointer-events-none absolute -inset-1 animate-spin [animation-duration:7s] motion-reduce:hidden"
                            >
                              <span
                                className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
                                style={{ backgroundColor: s.color }}
                              />
                            </span>
                          </>
                        )}
                        <div
                          className={`relative flex h-14 w-14 items-center justify-center rounded-full transition-shadow duration-300 ${
                            isFocused ? "ls-icon-pulse" : ""
                          }`}
                          style={{
                            backgroundColor: s.tint,
                            color: s.color,
                            boxShadow: isFocused ? `0 10px 28px ${s.color}40` : undefined,
                          }}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                      </div>
                    </button>

                    {/* Detail panel — only when focused */}
                    <div
                      aria-hidden={!isFocused}
                      className={`absolute left-1/2 top-[92px] w-[280px] -translate-x-1/2 text-center transition-all duration-300 ease-out motion-reduce:transition-none ${
                        isFocused
                          ? "translate-y-0 opacity-100"
                          : "pointer-events-none translate-y-2 opacity-0"
                      }`}
                    >
                      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Age {s.age}
                      </p>
                      <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-foreground">
                        {s.title}
                      </h3>
                      <p className="mx-auto mt-1.5 max-w-[240px] text-[13px] leading-relaxed text-muted-foreground">
                        {s.desc}
                      </p>
                      <div className="mx-auto mt-4 flex w-fit items-stretch gap-4 rounded-xl border border-border/40 bg-card/70 px-4 py-2.5">
                        <div className="text-left">
                          <p className="font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Income
                          </p>
                          <p className="font-display text-[13px] font-semibold tabular-nums text-foreground">
                            {s.income}
                          </p>
                        </div>
                        <div className="w-px self-stretch bg-border/50" />
                        <div className="text-left">
                          <p className="font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Holdings
                          </p>
                          <p
                            className="font-display text-[13px] font-semibold tabular-nums"
                            style={{ color: s.color }}
                          >
                            {s.holdings}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div aria-hidden className="flex-none" style={{ width: pad }} />
          </div>
        </div>
      </div>

      <p className="mt-10 text-center font-display text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
        From your first paycheck to your last working day
      </p>
    </section>
  );
}
