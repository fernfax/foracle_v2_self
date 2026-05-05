"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpenseNumpadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  submitDisabled?: boolean;
}

// Helper to get the last number segment in the expression
function getLastSegment(value: string): string {
  const parts = value.split("+");
  return parts[parts.length - 1] || "";
}

// Helper to calculate total from expression
export function calculateExpressionTotal(value: string): number {
  if (!value || value === "0") return 0;
  const parts = value.split("+").filter(p => p.trim() !== "");
  return parts.reduce((sum, part) => sum + (parseFloat(part) || 0), 0);
}

export function ExpenseNumpad({
  value,
  onChange,
  onSubmit,
  disabled = false,
  submitDisabled = false,
}: ExpenseNumpadProps) {
  const handleNumberPress = (num: string) => {
    const lastSegment = getLastSegment(value);

    // Prevent multiple decimal points in current segment
    if (num === "." && lastSegment.includes(".")) return;

    // Limit decimal places to 2 in current segment
    if (lastSegment.includes(".")) {
      const [, decimals] = lastSegment.split(".");
      if (decimals && decimals.length >= 2) return;
    }

    // Handle leading zeros in current segment
    if (lastSegment === "0" && num !== ".") {
      // Replace the trailing 0 with the new number
      if (value === "0") {
        onChange(num);
      } else {
        // Value is like "5+0", replace the 0
        onChange(value.slice(0, -1) + num);
      }
      return;
    }

    onChange(value + num);
  };

  const handleDelete = () => {
    // Smart delete: if last char is +, remove it; otherwise remove last digit
    if (value.length <= 1) {
      onChange("0");
      return;
    }

    const lastChar = value[value.length - 1];
    if (lastChar === "+") {
      // Remove the + sign
      onChange(value.slice(0, -1));
    } else {
      // Remove last digit
      const newValue = value.slice(0, -1);
      // If we end up with just a + at the end, keep it
      // If we end up empty or with trailing +, handle gracefully
      if (newValue === "" || newValue === "+") {
        onChange("0");
      } else {
        onChange(newValue);
      }
    }
  };

  const handleAdd = () => {
    // Ignore if value is 0 or empty
    if (value === "0" || value === "") return;

    // Ignore if already ends with +
    if (value.endsWith("+")) return;

    // Append + to allow adding another number
    onChange(value + "+");
  };

  // Check if the expression has any valid numbers to submit
  const total = calculateExpressionTotal(value);
  const canSubmit = total > 0;

  // Drives a brief tap-flash overlay so each numpad press has visible feedback.
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const flash = (key: string) => {
    setFlashKey(key);
    window.setTimeout(() => {
      setFlashKey((current) => (current === key ? null : current));
    }, 140);
  };

  const numpadButtons = [
    ["7", "8", "9", "delete"],
    ["4", "5", "6", ""],
    ["1", "2", "3", "+"],
    ["00", "0", ".", "submit"],
  ];

  const flashOverlayClass = "pointer-events-none absolute inset-0 rounded-md bg-[#B8622A]/35 opacity-0 transition-opacity duration-150 data-[flashing=true]:opacity-100 data-[flashing=true]:duration-0";

  return (
    <div className="grid grid-cols-4 gap-2">
      {numpadButtons.map((row, rowIndex) =>
        row.map((btn, colIndex) => {
          if (btn === "") {
            return <div key={`${rowIndex}-${colIndex}`} />;
          }

          if (btn === "delete") {
            return (
              <Button
                key={btn}
                variant="outline"
                className="relative h-14 text-lg font-medium bg-muted/50 touch-manipulation overflow-hidden active:scale-[0.97] transition-transform"
                onPointerDown={() => flash(btn)}
                onClick={handleDelete}
              >
                <Delete className="h-5 w-5" />
                <span aria-hidden className={flashOverlayClass} data-flashing={flashKey === btn} />
              </Button>
            );
          }

          if (btn === "submit") {
            const isEnabled = !submitDisabled && canSubmit;
            return (
              <Button
                key={btn}
                variant="outline"
                className={cn(
                  "relative h-14 touch-manipulation overflow-hidden active:scale-[0.97] transition-transform",
                  isEnabled
                    ? "bg-[#B8622A] hover:bg-[#B8622A] text-white border-[rgba(184,98,42,0.25)]"
                    : "bg-muted text-muted-foreground border-border"
                )}
                onPointerDown={() => isEnabled && flash(btn)}
                onClick={onSubmit}
                disabled={!isEnabled}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-md bg-white/40 opacity-0 transition-opacity duration-150 data-[flashing=true]:opacity-100 data-[flashing=true]:duration-0"
                  data-flashing={flashKey === btn}
                />
              </Button>
            );
          }

          if (btn === "+") {
            // Disable + if value is 0, empty, or already ends with +
            const plusDisabled = value === "0" || value === "" || value.endsWith("+");
            return (
              <Button
                key={btn}
                variant="outline"
                className="relative h-14 text-lg font-medium bg-muted/50 touch-manipulation overflow-hidden active:scale-[0.97] transition-transform"
                onPointerDown={() => !plusDisabled && flash(btn)}
                onClick={handleAdd}
                disabled={plusDisabled}
              >
                +
                <span aria-hidden className={flashOverlayClass} data-flashing={flashKey === btn} />
              </Button>
            );
          }

          return (
            <Button
              key={btn}
              variant="outline"
              className="relative h-14 text-xl font-medium touch-manipulation overflow-hidden active:scale-[0.97] transition-transform"
              onPointerDown={() => flash(btn)}
              onClick={() => handleNumberPress(btn)}
            >
              {btn}
              <span aria-hidden className={flashOverlayClass} data-flashing={flashKey === btn} />
            </Button>
          );
        })
      )}
    </div>
  );
}
