import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Maps policy premium frequency (Title Case) to expense frequency (lowercase)
 * @param frequency - The policy premium frequency (e.g., "Monthly", "Quarterly", "Semi-Yearly", "Yearly")
 * @returns The expense frequency format (e.g., "monthly", "quarterly", "semi-yearly", "yearly")
 */
export function policyFrequencyToExpenseFrequency(frequency: string): string {
  const mapping: Record<string, string> = {
    "Monthly": "monthly",
    "Quarterly": "quarterly",
    "Semi-Yearly": "semi-yearly",
    "Yearly": "yearly"
  };
  return mapping[frequency] || "monthly";
}
