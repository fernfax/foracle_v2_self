"use client";

import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickAdjustPadProps {
  initialAmount: number;
  label?: string;
  onConfirm: (next: number) => void;
  onCancel?: () => void;
}

const STEPS = [-1000, -100, 100, 1000] as const;
const SLIDER_STEP = 50;

export function QuickAdjustPad({
  initialAmount,
  label = "Adjust Amount",
  onConfirm,
  onCancel,
}: QuickAdjustPadProps) {
  const [value, setValue] = useState<number>(initialAmount);

  useEffect(() => {
    setValue(initialAmount);
  }, [initialAmount]);

  const min = 0;
  const max = Math.max(initialAmount * 2, initialAmount + 5000, 1000);

  const adjust = (delta: number) => {
    setValue((v) => Math.max(min, Math.round((v + delta) / SLIDER_STEP) * SLIDER_STEP));
  };

  const handleConfirm = () => {
    onConfirm(Math.max(0, Math.round(value / SLIDER_STEP) * SLIDER_STEP));
  };

  const dirty = value !== initialAmount;

  return (
    <div className="w-72 rounded-2xl border border-border/40 bg-popover text-popover-foreground p-5 shadow-xl">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-center font-display text-4xl font-bold tracking-tight">
        ${Math.round(value).toLocaleString()}
      </p>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {STEPS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => adjust(step)}
            className={cn(
              "rounded-lg border border-border/40 bg-card px-2 py-2 text-xs font-semibold transition-colors",
              "hover:border-brand-jungle/50 hover:bg-brand-jungle/5"
            )}
          >
            {step > 0 ? `+${step}` : step}
          </button>
        ))}
      </div>

      <div className="mt-5 px-1">
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={SLIDER_STEP}
          onValueChange={(vals) => setValue(vals[0] ?? value)}
          aria-label="Amount slider"
        />
        <div className="mt-1 flex justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>${min.toLocaleString()}</span>
          <span>${max.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          className={cn(
            "flex-1 bg-brand-jungle hover:bg-brand-jungle/90 text-white font-semibold",
            !dirty && "opacity-60 cursor-not-allowed"
          )}
          disabled={!dirty}
          onClick={handleConfirm}
        >
          Confirm Changes
        </Button>
      </div>
    </div>
  );
}
