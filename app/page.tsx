import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TileMotif } from "@/components/ui/tile-motif";
import { LandingShader } from "@/components/landing/landing-shader";
import {
  ArrowRight,
  Waves,
  LineChart,
  Wallet2,
  TrendingUp,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Check,
  Database,
  Download,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Small presentational helpers                                              */
/* -------------------------------------------------------------------------- */

function Eyebrow({
  children,
  tone = "terracotta",
}: {
  children: React.ReactNode;
  tone?: "terracotta" | "coral";
}) {
  return (
    <p
      className={`font-display text-[11px] font-semibold tracking-[0.2em] uppercase ${
        tone === "coral" ? "text-brand-coral" : "text-brand-terracotta"
      }`}
    >
      {children}
    </p>
  );
}

/** Faux app-window chrome around a product screenshot. */
function BrowserFrame({
  src,
  alt,
  width,
  height,
  url,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  url: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-brand-deep-forest/15 ring-1 ring-brand-deep-forest/5 ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-border/60 bg-secondary/50 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-brand-coral/80" />
        <span className="h-3 w-3 rounded-full bg-brand-gold/80" />
        <span className="h-3 w-3 rounded-full bg-brand-jungle/80" />
        <span className="ml-3 hidden truncate font-display text-[11px] tracking-wide text-muted-foreground sm:inline">
          {url}
        </span>
      </div>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes="(max-width: 1024px) 100vw, 640px"
        className="h-auto w-full"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Feature data                                                              */
/* -------------------------------------------------------------------------- */

const FEATURES = [
  {
    id: "sankey",
    icon: Waves,
    eyebrow: "Cashflow Sankey",
    title: "See every dollar flow",
    body: "A living Sankey diagram traces income into CPF, each expense category, and savings — so you see exactly where your money goes the moment it lands. Click any node to break it down.",
    bullets: [
      "Income, CPF, expenses and savings in one flow",
      "Click to drill into any category",
      "Lock past months, plan the next one",
    ],
    shot: {
      src: "/screens/sankey.png",
      width: 2232,
      height: 1772,
      url: "app.foracle.sg/overview",
    },
  },
  {
    id: "projection",
    icon: LineChart,
    eyebrow: "Cashflow Projection",
    title: "Know your balance, months ahead",
    body: "Project your balance forward from recurring income, expenses and one-off plans. See your starting balance, where you land, and the net change — before it happens.",
    bullets: [
      "12-month forward balance projection",
      "Fold in investments and one-off items",
      "Catch a shortfall before it arrives",
    ],
    shot: {
      src: "/screens/projection.png",
      width: 2232,
      height: 1858,
      url: "app.foracle.sg/overview",
    },
  },
  {
    id: "assets",
    icon: Wallet2,
    eyebrow: "Assets",
    title: "Every asset in one view",
    body: "Property, vehicles and the things you own, tracked with loan progress, monthly payments and interest rates — so your real net worth is never a guess.",
    bullets: [
      "Property, vehicles and other holdings",
      "Loan progress and payoff tracking",
      "Real-time net worth, no spreadsheets",
    ],
    shot: {
      src: "/screens/assets.png",
      width: 2232,
      height: 980,
      url: "app.foracle.sg/assets",
    },
  },
  {
    id: "investments",
    icon: TrendingUp,
    eyebrow: "Investments",
    title: "Watch your money compound",
    body: "Track portfolio value, weighted yield and monthly contributions, then project growth over the next 20 years — with and without contributions.",
    bullets: [
      "Portfolio value and weighted yield",
      "Wealth projection up to 20 years",
      "Stocks, bonds, savings and crypto",
    ],
    shot: {
      src: "/screens/investments.png",
      width: 2232,
      height: 1240,
      url: "app.foracle.sg/investments",
    },
  },
  {
    id: "insurances",
    icon: ShieldCheck,
    eyebrow: "Insurances",
    title: "Never miss a policy",
    body: "Keep every policy organised by family member — premiums, providers and coverage at a glance — so renewals and gaps never catch you off guard.",
    bullets: [
      "Policies grouped by family member",
      "Premiums and providers in one place",
      "Coverage gaps surfaced early",
    ],
    shot: {
      src: "/screens/policies.png",
      width: 2232,
      height: 1120,
      url: "app.foracle.sg/policies",
    },
  },
] as const;

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect("/overview");
  }

  return (
    <main className="min-h-screen bg-transparent">
      <LandingShader />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/30 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Image
            src="/wordmark-168.png"
            alt="Foracle"
            width={97}
            height={28}
            className="object-contain"
            priority
          />
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="font-display text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#foracle-ai"
              className="font-display text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Foracle AI
            </a>
            <a
              href="#mobile"
              className="font-display text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Mobile
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-5xl px-6 pt-24 pb-12 text-center lg:px-8 lg:pt-32">
          <Eyebrow>A guided companion for your money</Eyebrow>
          <h1 className="mt-6 font-display text-5xl font-semibold tracking-[-0.03em] text-foreground md:text-6xl lg:text-7xl">
            Your whole financial life,
            <br />
            <span className="text-foreground/55">in one calm place.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl font-editorial text-lg leading-relaxed text-foreground/65 md:text-xl">
            Track your cashflow, assets, investments and insurances — and ask a
            personal AI planner anything, grounded in your real numbers. Built
            for Singaporean rhythms.
          </p>

          <div className="mt-8 inline-flex items-center rounded-full border border-brand-terracotta/20 bg-brand-terracotta/10 px-4 py-1.5">
            <span className="font-display text-[11px] font-semibold uppercase tracking-wide text-[#7A3A0A]">
              Made for Singapore, by Singaporeans
            </span>
          </div>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/sign-up">
              <Button size="lg" className="px-10">
                Start Your Journey
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="px-8">
                Explore the features
              </Button>
            </a>
          </div>
        </div>

        {/* Hero showpiece */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 pb-4 lg:px-8">
          <BrowserFrame
            src="/screens/sankey.png"
            alt="Foracle cashflow Sankey diagram showing income flowing into expense categories and savings"
            width={2232}
            height={1772}
            url="app.foracle.sg/overview"
            priority
          />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-10 pb-12 lg:px-8">
          <TileMotif size="standard" />
        </div>
      </section>

      {/* Solid backdrop for the rest of the page */}
      <div className="relative z-10 bg-background">
        {/* Features */}
        <section id="features" className="scroll-mt-20 py-20 lg:py-28">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <Eyebrow>Features</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.02em] text-foreground md:text-5xl">
              Everything your money does, made visible
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
              Five connected views that turn scattered numbers into one clear
              picture of where you stand and where you&rsquo;re headed.
            </p>
          </div>

          <div className="mx-auto mt-16 flex max-w-7xl flex-col gap-20 px-6 lg:gap-28 lg:px-8">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              const reversed = i % 2 === 1;
              return (
                <div
                  key={f.id}
                  id={f.id}
                  className="scroll-mt-24 grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
                >
                  {/* Copy */}
                  <div className={reversed ? "lg:order-2" : ""}>
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-brand-terracotta/10 text-brand-terracotta">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="mt-5">
                      <Eyebrow>{f.eyebrow}</Eyebrow>
                    </div>
                    <h3 className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-4xl">
                      {f.title}
                    </h3>
                    <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
                      {f.body}
                    </p>
                    <ul className="mt-6 space-y-3">
                      {f.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-jungle/12 text-brand-jungle">
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                          <span className="text-[15px] text-foreground/80">
                            {b}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Screenshot */}
                  <div className={reversed ? "lg:order-1" : ""}>
                    <BrowserFrame
                      src={f.shot.src}
                      alt={`${f.title} — Foracle ${f.eyebrow}`}
                      width={f.shot.width}
                      height={f.shot.height}
                      url={f.shot.url}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Foracle AI — flagship */}
        <section id="foracle-ai" className="scroll-mt-20 px-6 py-12 lg:px-8">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-brand-deep-forest px-6 py-16 sm:px-12 lg:px-16 lg:py-24">
            {/* soft glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-brand-terracotta/20 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-brand-teal/10 blur-3xl"
            />

            <div className="relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-coral">
                    <Sparkles className="h-4 w-4" />
                    Foracle AI
                  </span>
                  <Badge variant="secondaryAccent">Beta</Badge>
                </div>
                <h2 className="mt-5 font-display text-3xl font-semibold tracking-[-0.02em] text-brand-cream md:text-5xl">
                  A financial planner that lives in your app
                </h2>
                <p className="mt-5 font-editorial text-lg leading-relaxed text-brand-cream/75 md:text-xl">
                  Ask anything about your money. &ldquo;Can I afford this
                  trip?&rdquo; &ldquo;Where did my budget go this month?&rdquo;
                  Because Foracle already holds your real numbers, the answers
                  are about <span className="italic">you</span> — not generic
                  advice.
                </p>

                <ul className="mt-8 space-y-4">
                  {[
                    {
                      icon: Database,
                      title: "Grounded in your real data",
                      body: "Every answer is computed from the income, expenses and assets you've entered.",
                    },
                    {
                      icon: ShieldCheck,
                      title: "Calculations by verified tools",
                      body: "It never makes the numbers up — figures come from auditable tools, with sources shown.",
                    },
                    {
                      icon: Sparkles,
                      title: "Ask in plain English (or Singlish)",
                      body: "Plan trips, stress-test budgets, understand spending — just type a question.",
                    },
                  ].map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <li key={item.title} className="flex items-start gap-4">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-cream/10 text-brand-coral">
                          <ItemIcon className="h-[18px] w-[18px]" />
                        </span>
                        <div>
                          <p className="font-display text-[15px] font-semibold text-brand-cream">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-sm leading-relaxed text-brand-cream/65">
                            {item.body}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-9">
                  <Link href="/sign-up">
                    <Button size="lg" className="px-9">
                      Try Foracle AI
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Conversation screenshot */}
              <div className="overflow-hidden rounded-2xl border border-brand-cream/10 bg-brand-warm-white shadow-2xl shadow-black/30 ring-1 ring-black/20">
                <Image
                  src="/screens/assistant.png"
                  alt="Foracle AI answering whether the user can afford a $1,200 weekend trip to Japan, with a full affordability analysis grounded in their real balances"
                  width={2232}
                  height={910}
                  sizes="(max-width: 1024px) 100vw, 560px"
                  className="h-auto w-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Mobile / PWA */}
        <section id="mobile" className="scroll-mt-20 py-20 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
            {/* Phone */}
            <div className="order-2 flex justify-center lg:order-1">
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 mx-auto h-full w-3/4 rounded-full bg-brand-jungle/10 blur-3xl"
                />
                <div className="w-[270px] rounded-[2.75rem] border-[11px] border-brand-deep-forest bg-brand-deep-forest shadow-2xl shadow-brand-deep-forest/25">
                  <div className="overflow-hidden rounded-[2rem]">
                    <Image
                      src="/screens/budget-mobile.png"
                      alt="Foracle mobile budget tracker showing monthly spending overview, daily pacing and category budgets"
                      width={780}
                      height={1688}
                      sizes="270px"
                      className="h-auto w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Copy */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-brand-jungle/10 text-brand-jungle">
                <Smartphone className="h-6 w-6" />
              </div>
              <div className="mt-5">
                <Eyebrow>Mobile App · PWA</Eyebrow>
              </div>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em] text-foreground md:text-5xl">
                Budget tracking in your pocket
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
                Foracle installs straight to your home screen as a progressive
                web app — no app store, no download wait. Log spending on the go,
                watch your daily pace, and stay on budget wherever you are.
              </p>

              <ul className="mt-6 space-y-3">
                {[
                  "Add to Home Screen — opens full-screen, just like a native app",
                  "Daily spending and pacing, so you never drift over budget",
                  "Per-category budgets with a glance-able bottom nav",
                  "The same data as desktop, always in sync",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-jungle/12 text-brand-jungle">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-[15px] text-foreground/80">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-2">
                <Download className="h-4 w-4 text-brand-jungle" />
                <span className="font-display text-[13px] font-medium text-foreground/80">
                  Install free after you sign up
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-24">
          <div className="relative overflow-hidden rounded-3xl bg-brand-deep-forest px-8 py-16 text-center lg:px-16 lg:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-terracotta/20 blur-3xl"
            />
            <div className="relative">
              <Eyebrow tone="coral">Get Started</Eyebrow>
              <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-semibold tracking-[-0.02em] text-brand-cream md:text-5xl">
                Take control of your finances, calmly.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-brand-cream/70 md:text-lg">
                Set up your household, connect your numbers, and let Foracle do
                the watching — on desktop and in your pocket.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/sign-up">
                  <Button size="lg" className="px-12">
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-brand-cream/25 bg-transparent px-8 text-brand-cream hover:bg-brand-cream/10 hover:text-brand-cream"
                  >
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/30">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <TileMotif size="thin" className="mb-6" />
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <Image
                src="/wordmark-168.png"
                alt="Foracle"
                width={84}
                height={24}
                className="object-contain opacity-80"
              />
              <p className="text-sm text-muted-foreground">
                &copy; 2026 Foracle. Made in Singapore.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
