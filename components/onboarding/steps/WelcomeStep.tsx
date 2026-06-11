"use client";

import { Button } from "@/components/ui/button";
import { TrendingUp, PiggyBank, Target, BarChart3, ArrowRight } from "lucide-react";

interface WelcomeStepProps {
  onNext: () => void;
}

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Track your income",
    description: "Monitor all your income sources in one place.",
    tint: "rgba(58,107,82,0.10)",
    color: "#3A6B52",
  },
  {
    icon: PiggyBank,
    title: "Manage CPF",
    description: "Keep track of your CPF contributions and allocations.",
    tint: "rgba(184,98,42,0.10)",
    color: "#B8622A",
  },
  {
    icon: BarChart3,
    title: "Monitor holdings",
    description: "See your savings and investments at a glance.",
    tint: "rgba(0,196,170,0.10)",
    color: "#007A68",
  },
  {
    icon: Target,
    title: "Set financial goals",
    description: "Plan and track your financial milestones.",
    tint: "rgba(212,168,67,0.12)",
    color: "#7A5A00",
  },
];

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-10 text-center">
      {/* Status pill — mirrors the landing hero badge */}
      <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[rgba(184,98,42,0.18)] bg-[rgba(184,98,42,0.07)] px-4 py-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00C4AA] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00C4AA]" />
        </span>
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7A3A0A]">
          Welcome to Foracle
        </span>
      </div>

      {/* Hero headline — Space Grotesk with a single Lora-italic accent */}
      <h1 className="mx-auto max-w-2xl font-display text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
        Your whole financial life, with{" "}
        <span className="font-editorial font-normal text-[#B8622A]">clarity</span>.
      </h1>

      <p className="mx-auto mt-6 max-w-xl text-balance text-base text-foreground/65 sm:text-lg sm:leading-relaxed">
        Foracle brings your income, expenses, assets, and goals into one calm view.
        Let&apos;s set yours up — it takes about three minutes.
      </p>

      {/* Features — landing-style hairline grid */}
      <div className="mt-12 grid w-full max-w-2xl gap-px overflow-hidden rounded-2xl border border-[rgba(28,43,42,0.08)] bg-[rgba(28,43,42,0.08)] sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, description, tint, color }) => (
          <div key={title} className="flex items-start gap-4 bg-card p-6 text-left">
            <div
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: tint, color }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
                {title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-10">
        <Button size="lg" onClick={onNext} className="px-10">
          Start your journey
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <p className="mt-5 font-display text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        About 3 minutes · You can edit anything later
      </p>
    </div>
  );
}
