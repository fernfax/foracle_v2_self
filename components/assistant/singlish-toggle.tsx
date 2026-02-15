"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SinglishToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => Promise<void>;
  disabled?: boolean;
}

export function SinglishToggle({ enabled, onToggle, disabled }: SinglishToggleProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (disabled || isPending) return;
    startTransition(async () => {
      await onToggle(!enabled);
    });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled || isPending}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md transition-all text-lg",
              enabled
                ? "bg-emerald-100 ring-2 ring-emerald-500"
                : "bg-muted hover:bg-muted/80 opacity-50 grayscale",
              (disabled || isPending) && "cursor-not-allowed opacity-40"
            )}
            aria-label={enabled ? "Disable Singlish mode" : "Enable Singlish mode"}
          >
            🇸🇬
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {enabled ? "Singlish mode: ON" : "Singlish mode: OFF"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
