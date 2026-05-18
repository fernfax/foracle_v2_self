"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getBackgroundDecor,
  setBackgroundDecor,
} from "@/lib/actions/singlish-mode";
import type { BackgroundDecor } from "@/lib/services/user-prefs";
import { cn } from "@/lib/utils";
import { Loader2, Check } from "lucide-react";

interface BackgroundDecorPickerProps {
  // Optional: when omitted, the picker fetches its own initial value on
  // mount. Pass it explicitly when the parent already has the value SSR'd
  // (e.g. server pages) to avoid a flash of the radial default.
  initialValue?: BackgroundDecor;
}

const OPTIONS: {
  value: BackgroundDecor;
  label: string;
  description: string;
}[] = [
  {
    value: "radial",
    label: "Radial circles",
    description: "Faint concentric circles anchored top-right",
  },
  {
    value: "peranakan",
    label: "Peranakan tiles",
    description: "Tiled floral / geometric motifs in brand colors",
  },
  {
    value: "none",
    label: "None",
    description: "Plain warm-cream canvas, no pattern",
  },
];

export function BackgroundDecorPicker({
  initialValue,
}: BackgroundDecorPickerProps) {
  const router = useRouter();
  const [value, setValue] = useState<BackgroundDecor>(initialValue ?? "radial");
  const [isPending, startTransition] = useTransition();

  // Fetch the real value on mount when no SSR'd initial was provided
  // (e.g. when mounted inside Clerk's UserProfile modal, which is fully
  // client-rendered).
  useEffect(() => {
    if (initialValue !== undefined) return;
    let cancelled = false;
    getBackgroundDecor().then((current) => {
      if (!cancelled) setValue(current);
    });
    return () => {
      cancelled = true;
    };
  }, [initialValue]);

  function handleSelect(next: BackgroundDecor) {
    if (next === value || isPending) return;
    const previous = value;
    setValue(next);
    startTransition(async () => {
      try {
        await setBackgroundDecor(next);
        router.refresh();
      } catch {
        setValue(previous);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Background style</CardTitle>
        <CardDescription>
          Choose the decorative pattern behind the app. Light mode only —
          dark mode always uses a plain canvas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {OPTIONS.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                disabled={isPending}
                className={cn(
                  "group relative flex flex-col items-stretch text-left rounded-2xl border p-4 transition-all",
                  "hover:shadow-md disabled:opacity-60 disabled:cursor-wait",
                  selected
                    ? "border-brand-terracotta bg-brand-terracotta/[0.06] shadow-sm"
                    : "border-border/40 bg-background hover:border-border/70"
                )}
              >
                <DecorPreview kind={opt.value} />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-sm font-semibold text-foreground">
                      {opt.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {opt.description}
                    </div>
                  </div>
                  {selected ? (
                    isPending ? (
                      <Loader2 className="h-4 w-4 shrink-0 text-brand-terracotta animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 shrink-0 text-brand-terracotta" />
                    )
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Inline preview thumbnails ──────────────────────────────────────────
// Tiny 1:1.4 SVG previews so the user can see what each option looks like
// without having to flip the setting and navigate around.

function DecorPreview({ kind }: { kind: BackgroundDecor }) {
  if (kind === "radial") {
    return (
      <div className="relative w-full aspect-[3/2] rounded-lg bg-background overflow-hidden border border-border/30">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 300 200"
          preserveAspectRatio="xMaxYMin slice"
          className="opacity-40"
        >
          {[20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240].map((r) => (
            <circle
              key={r}
              cx={280}
              cy={30}
              r={r}
              stroke="#1C2B2A"
              strokeWidth={1}
              fill="none"
            />
          ))}
        </svg>
      </div>
    );
  }
  if (kind === "peranakan") {
    return (
      <div className="relative w-full aspect-[3/2] rounded-lg bg-background overflow-hidden border border-border/30">
        <svg width="100%" height="100%" className="opacity-50">
          <defs>
            <pattern
              id="prev-peranakan"
              x="0"
              y="0"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              <rect
                x="1"
                y="1"
                width="58"
                height="58"
                fill="none"
                stroke="#B8622A"
                strokeWidth="0.7"
              />
              <g transform="translate(30 30)">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                  <ellipse
                    key={a}
                    cx="0"
                    cy="-12"
                    rx="4"
                    ry="8"
                    fill="#B8622A"
                    transform={`rotate(${a})`}
                  />
                ))}
                <circle r="4" fill="#3A6B52" />
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#prev-peranakan)" />
        </svg>
      </div>
    );
  }
  return (
    <div className="relative w-full aspect-[3/2] rounded-lg bg-background overflow-hidden border border-border/30 flex items-center justify-center">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        plain
      </span>
    </div>
  );
}
