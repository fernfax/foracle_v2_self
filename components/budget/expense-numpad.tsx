"use client";

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

  const numpadButtons = [
    ["7", "8", "9", "delete"],
    ["4", "5", "6", ""],
    ["1", "2", "3", "+"],
    ["00", "0", ".", "submit"],
  ];

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
                className="h-14 text-lg font-medium bg-muted/50 touch-manipulation"
                onClick={handleDelete}
              >
                <Delete className="h-5 w-5" />
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
                  "h-14 touch-manipulation",
                  isEnabled
                    ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                    : "bg-gray-200 text-gray-400 border-gray-200"
                )}
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
                className="h-14 text-lg font-medium bg-muted/50 touch-manipulation"
                onClick={handleAdd}
                disabled={plusDisabled}
              >
                +
              </Button>
            );
          }

          return (
            <Button
              key={btn}
              variant="outline"
              className="h-14 text-xl font-medium touch-manipulation"
              onClick={() => handleNumberPress(btn)}
            >
              {btn}
            </Button>
          );
        })
      )}
    </div>
  );
}
