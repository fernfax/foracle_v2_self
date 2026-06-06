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

/**
 * LifeStages — an auto-scrolling horizontal timeline of life milestones,
 * communicating that Foracle is a companion through every stage of life.
 *
 * Curated, lightly Singapore-flavoured stages (BTO, CPF, COE); each node
 * pairs the life event with the money moment Foracle helps with. The
 * marquee is pure CSS (see `.ls-*` in app/globals.css), so this stays a
 * server component: the track renders the list twice and translates -50%
 * for a seamless loop, pauses on hover, and falls back to a manual scroll
 * under prefers-reduced-motion.
 */

const STAGES = [
  {
    icon: Briefcase,
    age: "Age 23",
    title: "First job",
    moment: "Start tracking income and build the saving habit.",
    color: "#B8622A",
    tint: "rgba(184,98,42,0.10)",
  },
  {
    icon: KeyRound,
    age: "Age 27",
    title: "First home (BTO)",
    moment: "Plan the down payment, CPF and renovation.",
    color: "#3A6B52",
    tint: "rgba(58,107,82,0.10)",
  },
  {
    icon: Heart,
    age: "Age 28",
    title: "Getting married",
    moment: "Merge finances and set shared goals.",
    color: "#D4845A",
    tint: "rgba(212,132,90,0.12)",
  },
  {
    icon: Baby,
    age: "Age 30",
    title: "A new baby",
    moment: "Adjust the budget and open an education fund.",
    color: "#D4A843",
    tint: "rgba(212,168,67,0.12)",
  },
  {
    icon: Car,
    age: "Age 32",
    title: "Buying a car",
    moment: "Weigh the COE, loan and running costs.",
    color: "#5A9470",
    tint: "rgba(90,148,112,0.12)",
  },
  {
    icon: TrendingUp,
    age: "Age 35",
    title: "A big promotion",
    moment: "Rebalance savings as your income grows.",
    color: "#B8622A",
    tint: "rgba(184,98,42,0.10)",
  },
  {
    icon: GraduationCap,
    age: "Age 45",
    title: "Kids' education",
    moment: "Fund university without derailing retirement.",
    color: "#3A6B52",
    tint: "rgba(58,107,82,0.10)",
  },
  {
    icon: Palmtree,
    age: "Age 63",
    title: "Retirement",
    moment: "See if your CPF and nest egg are enough.",
    color: "#D4A843",
    tint: "rgba(212,168,67,0.12)",
  },
] as const;

function StageCard({ stage }: { stage: (typeof STAGES)[number] }) {
  const { icon: Icon, age, title, moment, color, tint } = stage;
  return (
    <div className="relative w-[240px] flex-none px-3 sm:w-[260px]">
      {/* Icon node — sits on the rail; the card-coloured ring masks the line behind it */}
      <div className="flex justify-center">
        <div className="rounded-full bg-card p-1.5">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: tint, color }}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {age}
        </p>
        <h3 className="mt-1 font-display text-base font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mx-auto mt-1.5 max-w-[200px] text-[13px] leading-relaxed text-muted-foreground">
          {moment}
        </p>
      </div>
    </div>
  );
}

export function LifeStages() {
  return (
    <section className="relative z-10 overflow-hidden border-y border-border/30 bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="sec-num mb-3">Every chapter</p>
          <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
            A companion for every stage of life
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Life keeps changing — a first job, a new home, a growing family. Foracle moves
            with you, turning each milestone into a plan, all the way to retirement.
          </p>
        </div>
      </div>

      {/* Marquee timeline */}
      <div className="relative mt-16">
        {/* Continuous rail behind the nodes (aligned to the icon centre) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[30px] h-px bg-[rgba(28,43,42,0.12)]"
        />

        <div className="ls-marquee">
          <ul className="ls-track">
            {STAGES.map((s) => (
              <li key={s.title}>
                <StageCard stage={s} />
              </li>
            ))}
            {/* Duplicate set for the seamless loop */}
            {STAGES.map((s) => (
              <li key={`dup-${s.title}`} aria-hidden>
                <StageCard stage={s} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-14 text-center font-display text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
        From your first paycheck to your last working day
      </p>
    </section>
  );
}
