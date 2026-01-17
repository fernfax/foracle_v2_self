"use client";

import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";

interface ExpenseNumpadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  submitDisabled?: boolean;
}

export function ExpenseNumpad({
  value,
  onChange,
  onSubmit,
  disabled = false,
  submitDisabled = false,
}: ExpenseNumpadProps) {
  const handleNumberPress = (num: string) => {

    // Prevent multiple decimal points
    if (num === "." && value.includes(".")) return;

    // Limit decimal places to 2
    if (value.includes(".")) {
      const [, decimals] = value.split(".");
      if (decimals && decimals.length >= 2) return;
    }

    // Prevent leading zeros (except for decimals)
    if (value === "0" && num !== ".") {
      onChange(num);
      return;
    }

    onChange(value + num);
  };

  const handleDelete = () => {
    if (value.length <= 1) {
      onChange("0");
    } else {
      onChange(value.slice(0, -1));
    }
  };

  const handleAdd = () => {
    // This could be used for a calculator-style "add another" feature
    // For now, it just submits
    onSubmit();
  };

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
                className="h-14 text-lg font-medium bg-muted/50"
                onClick={handleDelete}
              >
                <Delete className="h-5 w-5" />
              </Button>
            );
          }

          if (btn === "submit") {
            return (
              <Button
                key={btn}
                className="h-14 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={onSubmit}
                disabled={submitDisabled || value === "0" || value === ""}
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
            return (
              <Button
                key={btn}
                variant="outline"
                className="h-14 text-lg font-medium bg-muted/50"
                onClick={handleAdd}
                disabled={submitDisabled || value === "0" || value === ""}
              >
                +
              </Button>
            );
          }

          return (
            <Button
              key={btn}
              variant="outline"
              className="h-14 text-xl font-medium"
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
