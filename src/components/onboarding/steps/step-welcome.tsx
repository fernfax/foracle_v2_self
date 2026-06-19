"use client"

import {
  ArrowRight,
  BarChart3,
  PiggyBank,
  Target,
  TrendingUp
} from "lucide-react"

import { Button } from "@/components/ui/button"

interface WelcomeStepProps {
  onNext: () => void
}

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Track your income",
    description: "Monitor all your income sources in one place.",
    tint: "rgba(58,107,82,0.10)",
    color: "#3A6B52"
  },
  {
    icon: PiggyBank,
    title: "Manage CPF",
    description: "Keep track of your CPF contributions and allocations.",
    tint: "rgba(184,98,42,0.10)",
    color: "#B8622A"
  },
  {
    icon: BarChart3,
    title: "Monitor holdings",
    description: "See your savings and investments at a glance.",
    tint: "rgba(0,196,170,0.10)",
    color: "#007A68"
  },
  {
    icon: Target,
    title: "Set financial goals",
    description: "Plan and track your financial milestones.",
    tint: "rgba(212,168,67,0.12)",
    color: "#7A5A00"
  }
]

export function StepWelcome({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-10 text-center">
      {/* Status pill — mirrors the landing hero badge */}
      <div className="border-brand-terracotta/[0.18] bg-brand-terracotta/[0.07] mb-7 inline-flex items-center gap-2 rounded-full border px-4 py-1.5">
        <span className="relative flex h-2 w-2">
          <span className="bg-brand-teal absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
          <span className="bg-brand-teal relative inline-flex h-2 w-2 rounded-full" />
        </span>
        <span className="font-display text-on-brand text-[11px] font-semibold tracking-[0.16em] uppercase">
          Welcome to Foracle
        </span>
      </div>

      {/* Hero headline — Space Grotesk with a single Lora-italic accent */}
      <h1 className="font-display text-foreground mx-auto max-w-2xl text-[2.4rem] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-5xl">
        Your whole financial life, with{" "}
        <span className="font-editorial text-brand-terracotta font-normal">
          clarity
        </span>
        .
      </h1>

      <p className="text-foreground/65 mx-auto mt-6 max-w-xl text-base text-balance sm:text-lg sm:leading-relaxed">
        Foracle brings your income, expenses, assets, and goals into one calm
        view. Let&apos;s set yours up — it takes about three minutes.
      </p>

      {/* Features — landing-style hairline grid */}
      <div className="border-brand-deep-forest/[0.08] bg-brand-deep-forest/[0.08] mt-12 grid w-full max-w-2xl gap-px overflow-hidden rounded-2xl border sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, description, tint, color }) => (
          <div
            key={title}
            className="bg-card flex items-start gap-4 p-6 text-left">
            <div
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: tint, color }}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-foreground text-[15px] font-semibold tracking-tight">
                {title}
              </h3>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
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

      <p className="font-display text-muted-foreground mt-5 text-[12px] font-medium tracking-[0.12em] uppercase">
        About 3 minutes · You can edit anything later
      </p>
    </div>
  )
}
