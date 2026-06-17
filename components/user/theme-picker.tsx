"use client"

import { useEffect, useState } from "react"
import { Check, Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"

type ThemeValue = "light" | "dark" | "system"

const OPTIONS: {
  value: ThemeValue
  label: string
  description: string
  icon: typeof Sun
}[] = [
  {
    value: "light",
    label: "Light",
    description: "Warm cream canvas",
    icon: Sun
  },
  {
    value: "dark",
    label: "Dark",
    description: "Nightfall, easy in low light",
    icon: Moon
  },
  {
    value: "system",
    label: "System",
    description: "Match your device setting",
    icon: Monitor
  }
]

export function ThemePicker() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // next-themes can't resolve the active theme until the client mounts, so the
  // selected ring is computed only after mount to avoid a hydration mismatch.
  useEffect(() => setMounted(true), [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Color theme</CardTitle>
        <CardDescription>
          Light, dark, or follow your device. Applies across the whole app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {OPTIONS.map((opt) => {
            const selected = mounted && theme === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                aria-pressed={selected}
                className={cn(
                  "group relative flex flex-col items-stretch rounded-2xl border p-4 text-left transition-all",
                  "hover:shadow-md",
                  selected
                    ? "border-brand-terracotta bg-brand-terracotta/[0.06] shadow-sm"
                    : "border-border/40 bg-background hover:border-border/70"
                )}>
                <ThemeSwatch kind={opt.value} icon={opt.icon} />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-foreground text-sm font-semibold">
                      {opt.label}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-xs leading-snug">
                      {opt.description}
                    </div>
                  </div>
                  {selected ? (
                    <Check className="text-brand-terracotta h-4 w-4 shrink-0" />
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Inline preview swatches ────────────────────────────────────────────
// Theme-independent brand colors (not the semantic bg-* tokens, which flip
// with the active theme) so each swatch always shows what it represents —
// the Light swatch stays cream even while the app is in dark mode.

function ThemeSwatch({
  kind,
  icon: Icon
}: {
  kind: ThemeValue
  icon: typeof Sun
}) {
  if (kind === "system") {
    return (
      <div className="border-border/30 relative aspect-[3/2] w-full overflow-hidden rounded-lg border">
        <div className="absolute inset-0 flex">
          <div className="bg-brand-warm-white w-1/2" />
          <div className="bg-brand-nightfall w-1/2" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="text-brand-terracotta h-5 w-5" />
        </div>
      </div>
    )
  }
  const isDark = kind === "dark"
  return (
    <div
      className={cn(
        "border-border/30 relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-lg border",
        isDark ? "bg-brand-nightfall" : "bg-brand-warm-white"
      )}>
      <Icon
        className={cn(
          "h-5 w-5",
          isDark ? "text-brand-cream" : "text-brand-terracotta"
        )}
      />
    </div>
  )
}
