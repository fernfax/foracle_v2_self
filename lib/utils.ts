import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Maps policy premium frequency (Title Case) to expense frequency (lowercase)
 * @param frequency - The policy premium frequency (e.g., "Monthly", "Custom")
 * @returns The expense frequency format (e.g., "monthly", "custom")
 */
export function policyFrequencyToExpenseFrequency(frequency: string): string {
  const mapping: Record<string, string> = {
    "Monthly": "monthly",
    "Custom": "custom",
  };
  return mapping[frequency] || "monthly";
}
