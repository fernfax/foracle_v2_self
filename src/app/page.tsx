import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import {
  ArrowRight,
  BarChart3,
  Check,
  Plus,
  Shield,
  Target,
  TrendingUp,
  Users,
  Wallet,
  X
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { TileMotif } from "@/components/ui/tile-motif"
import { Cursor } from "@/components/landing/cursor"
import { GlassDefs } from "@/components/landing/glass-defs"
import { HeroPreview } from "@/components/landing/hero-preview"
import { LandingShader } from "@/components/landing/landing-shader"
import { LifeStages } from "@/components/landing/life-stages"
import { Reveal } from "@/components/landing/reveal"
import { SmoothScroll } from "@/components/landing/smooth-scroll"

const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#compare", label: "Why Foracle" },
  { href: "#faq", label: "FAQ" }
] as const

const STEPS = [
  {
    n: "01",
    title: "Bring it together",
    body: "Add your income, expenses, assets, and policies once. Foracle holds the whole picture so nothing lives in a forgotten spreadsheet."
  },
  {
    n: "02",
    title: "See it clearly",
    body: "Calm dashboards turn the numbers into a story you can read at a glance — cashflow, net worth, and where every dollar goes."
  },
  {
    n: "03",
    title: "Plan ahead",
    body: "Project your future, set goals, and watch Foracle tell you whether you're on track — months and years before it matters."
  }
] as const

const FEATURES = [
  {
    n: "01",
    icon: Wallet,
    title: "Income & expense tracking",
    description:
      "Monitor cashflow with ease. Track multiple income sources and categorise spending to see exactly where your money goes.",
    color: "#3A6B52",
    tint: "rgba(58,107,82,0.10)"
  },
  {
    n: "02",
    icon: Target,
    title: "Goal setting",
    description:
      "Set financial goals and track progress. A house, retirement, or emergency fund — Foracle helps you get there.",
    color: "#B8622A",
    tint: "rgba(184,98,42,0.10)"
  },
  {
    n: "03",
    icon: TrendingUp,
    title: "Asset management",
    description:
      "Keep every asset in one place. Monitor investments, property, and vehicles, and watch your net worth grow.",
    color: "#D4A843",
    tint: "rgba(212,168,67,0.12)"
  },
  {
    n: "04",
    icon: Shield,
    title: "Policy management",
    description:
      "Manage insurance policies and subscriptions. Never miss a renewal date or overpay for coverage again.",
    color: "#00C4AA",
    tint: "rgba(0,196,170,0.10)"
  },
  {
    n: "05",
    icon: Users,
    title: "Family planning",
    description:
      "Add family members and plan for their future. Track expenses and goals for your entire household.",
    color: "#D4845A",
    tint: "rgba(212,132,90,0.12)"
  },
  {
    n: "06",
    icon: BarChart3,
    title: "Insightful analytics",
    description:
      "Get personalised insights and recommendations. Make smarter decisions with data-driven, calm guidance.",
    color: "#3A6B52",
    tint: "rgba(58,107,82,0.10)"
  }
] as const

const COMPARE = [
  [
    "A spreadsheet that breaks every month",
    "One calm picture, always up to date"
  ],
  [
    "Guessing whether you can afford it",
    "Projections that tell you, before you commit"
  ],
  [
    "Renewals and goals slip through cracks",
    "Gentle nudges for what needs attention"
  ],
  [
    "Numbers scattered across ten apps",
    "Income, assets, and policies in one place"
  ],
  ["Generic advice built for elsewhere", "Rooted in Singaporean rhythms"]
] as const

const FAQS = [
  {
    q: "Is Foracle built for Singapore?",
    a: "Yes. Foracle is made for Singaporean households — from CPF and local insurance rhythms to the way we think about HDB, savings, and family planning. The defaults feel familiar, not borrowed from elsewhere."
  },
  {
    q: "Do I need to connect my bank?",
    a: "No. You can start by adding your income, expenses, and assets manually — it takes minutes, and you stay fully in control of what Foracle sees."
  },
  {
    q: "Is my financial data private?",
    a: "Your data is yours. Foracle is designed around a calm, private experience — we don't sell your information, and you decide what to track."
  },
  {
    q: "How much does it cost to start?",
    a: "Getting started is free. Create an account, bring your picture together, and see your whole financial life in one place — no card required."
  }
] as const

export default async function Home() {
  const { userId } = await auth()
  if (userId) {
    redirect("/user")
  }

  return (
    <main className="min-h-screen bg-transparent">
      <LandingShader />
      <GlassDefs />
      <SmoothScroll />
      <Cursor />

      {/* Navigation */}
      <nav className="glass-bar sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/wordmark-168.png"
              alt="Foracle"
              width={97}
              height={28}
              className="object-contain"
              priority
            />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="font-display text-foreground/70 hover:text-foreground text-[13px] font-medium transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/sign-in" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              {/* 44px touch target on phones (WCAG 2.5.5); compact on desktop. */}
              <Button size="sm" className="h-11 sm:h-8">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-7xl px-5 pt-16 pb-24 text-center sm:px-6 sm:pt-24 lg:px-8 lg:pt-28 lg:pb-32">
          <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-[rgba(184,98,42,0.18)] bg-[rgba(184,98,42,0.07)] px-4 py-1.5 dark:border-[rgba(212,132,90,0.3)] dark:bg-[rgba(212,132,90,0.12)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00C4AA] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00C4AA]" />
            </span>
            <span className="font-display text-on-brand text-[11px] font-semibold tracking-[0.16em] uppercase dark:text-[#E8A06A]">
              Made for Singapore, by Singaporeans
            </span>
          </div>

          <h1 className="font-display text-foreground mx-auto max-w-4xl text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-6xl lg:text-7xl">
            Take control of your money with{" "}
            <span className="font-editorial font-normal text-[#B8622A]">
              clarity
            </span>
            .
          </h1>

          <p className="text-foreground/65 mx-auto mt-6 max-w-2xl text-base text-balance sm:text-lg sm:leading-relaxed">
            Foracle brings your income, expenses, assets, and goals into one
            calm view — then shows you the road ahead, rooted in Singaporean
            rhythms.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button size="lg" className="w-full px-9 sm:w-auto">
                Start your journey
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#how" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full px-9 sm:w-auto">
                See how it works
              </Button>
            </a>
          </div>

          <p className="font-display text-muted-foreground mt-5 text-[12px] font-medium tracking-[0.12em] uppercase">
            Free to start · No card required
          </p>

          {/* Product preview */}
          <div className="mt-16 sm:mt-20">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="relative z-10 mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <Reveal className="mb-14 max-w-2xl">
          <p className="sec-num mb-3">How it works</p>
          <h2 className="font-display text-foreground text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
            From scattered to settled, in three steps
          </h2>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
          {STEPS.map((s, i) => (
            <Reveal
              key={s.n}
              delay={i * 80}
              className="glass-panel rounded-2xl p-7 sm:p-8">
              <span className="font-display text-4xl font-semibold tracking-tight text-[#B8622A]/85 tabular-nums">
                {s.n}
              </span>
              <h3 className="font-display text-foreground mt-5 text-lg font-semibold tracking-tight">
                {s.title}
              </h3>
              <p className="text-muted-foreground mt-2.5 text-[15px] leading-relaxed">
                {s.body}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Life stages — companion through life */}
      <LifeStages />

      {/* Features */}
      <section
        id="features"
        className="relative z-10 mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <Reveal className="mb-14 max-w-2xl">
          <p className="sec-num mb-3">Features</p>
          <h2 className="font-display text-foreground text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-muted-foreground mt-4 text-base sm:text-lg">
            A complete set of calm, considered tools for the whole household.
          </p>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {FEATURES.map(
            ({ n, icon: Icon, title, description, color, tint }, i) => (
              <Reveal key={n} delay={(i % 3) * 80} className="h-full">
                <div className="group glass-panel h-full rounded-2xl p-7 transition-transform duration-300 hover:-translate-y-1 sm:p-8">
                  <div className="flex items-center justify-between">
                    <div
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                      style={{ backgroundColor: tint, color }}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-display text-muted-foreground/60 text-[12px] font-semibold tracking-[0.1em] tabular-nums">
                      {n}
                    </span>
                  </div>
                  <h3 className="font-display text-foreground mt-5 text-[17px] font-semibold tracking-tight">
                    {title}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-[14px] leading-relaxed">
                    {description}
                  </p>
                </div>
              </Reveal>
            )
          )}
        </div>
      </section>

      {/* Comparison */}
      <section
        id="compare"
        className="relative z-10 scroll-mt-20 bg-[#1C2B2A] py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <Reveal className="mb-12 max-w-2xl">
            <p className="font-display mb-3 text-[11px] font-semibold tracking-[0.2em] text-[#D4845A] uppercase">
              Why Foracle
            </p>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[#F0EBE0] sm:text-4xl">
              There&apos;s a calmer way to hold your money
            </h2>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            {/* Old way */}
            <div className="rounded-2xl border border-[rgba(240,235,224,0.10)] bg-[rgba(240,235,224,0.03)] p-6 sm:p-8">
              <p className="font-display mb-6 text-[11px] font-semibold tracking-[0.18em] text-[rgba(240,235,224,0.72)] uppercase">
                The old way
              </p>
              <ul className="space-y-4">
                {COMPARE.map(([old]) => (
                  <li key={old} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[rgba(224,85,85,0.15)]">
                      <X className="h-3 w-3 text-[#E07070]" />
                    </span>
                    <span className="text-[14px] leading-relaxed text-[rgba(240,235,224,0.6)]">
                      {old}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Foracle way */}
            <div className="rounded-2xl border border-[rgba(0,196,170,0.25)] bg-[rgba(0,196,170,0.06)] p-6 sm:p-8">
              <p className="font-display mb-6 text-[11px] font-semibold tracking-[0.18em] text-[#33D4BC] uppercase">
                With Foracle
              </p>
              <ul className="space-y-4">
                {COMPARE.map(([, neu]) => (
                  <li key={neu} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[rgba(0,196,170,0.18)]">
                      <Check className="h-3 w-3 text-[#00C4AA]" />
                    </span>
                    <span className="text-[14px] leading-relaxed text-[#F0EBE0]">
                      {neu}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="relative z-10 mx-auto max-w-3xl scroll-mt-20 px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <Reveal className="mb-12 text-center">
          <p className="sec-num mb-3">FAQ</p>
          <h2 className="font-display text-foreground text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
            Questions, answered
          </h2>
        </Reveal>

        <Reveal className="glass-panel divide-y divide-[rgba(28,43,42,0.08)] overflow-hidden rounded-2xl dark:divide-[rgba(240,235,224,0.08)]">
          {FAQS.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
                <span className="font-display text-foreground text-[15px] font-semibold tracking-tight sm:text-base">
                  {f.q}
                </span>
                <Plus className="text-muted-foreground h-4 w-4 flex-none transition-transform duration-200 group-open:rotate-45" />
              </summary>
              <p className="text-muted-foreground px-5 pb-6 text-[14px] leading-relaxed sm:px-6 sm:text-[15px]">
                {f.a}
              </p>
            </details>
          ))}
        </Reveal>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-5xl px-5 pb-24 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-[#1C2B2A] px-6 py-14 text-center sm:px-12 sm:py-20">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(212,132,90,0.5)] to-transparent"
          />
          <p className="font-display mb-4 text-[11px] font-semibold tracking-[0.2em] text-[#D4845A] uppercase">
            Get started
          </p>
          <h2 className="font-display mx-auto max-w-xl text-3xl font-semibold tracking-[-0.02em] text-[#F0EBE0] sm:text-4xl">
            Ready to see your whole financial life?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[rgba(240,235,224,0.6)] sm:text-base">
            Bring your money into one calm view today. Free to start — no card
            required.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button size="lg" className="w-full px-10 sm:w-auto">
                Get started free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full border-[rgba(240,235,224,0.2)] bg-transparent px-10 text-[#F0EBE0] hover:bg-[rgba(240,235,224,0.08)] hover:text-[#F0EBE0] sm:w-auto">
                Sign in
              </Button>
            </Link>
          </div>
          <div className="mx-auto mt-12 max-w-xs">
            <TileMotif size="standard" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-border/30 relative z-10 border-t">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <Image
              src="/wordmark-168.png"
              alt="Foracle"
              width={90}
              height={26}
              className="object-contain"
            />
            <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-muted-foreground hover:text-foreground inline-block py-2 text-[13px] transition-colors">
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
          <TileMotif size="thin" className="my-7" />
          <p className="text-muted-foreground text-center text-[13px]">
            &copy; 2026 Foracle. Made in Singapore.
          </p>
        </div>
      </footer>
    </main>
  )
}
