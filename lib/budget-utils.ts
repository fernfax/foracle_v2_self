/**
 * Budget Tracker Utility Functions
 */

// Category color mappings
export const CATEGORY_COLORS: Record<string, { bg: string; icon: string }> = {
  Housing: { bg: "bg-blue-100", icon: "text-blue-600" },
  Food: { bg: "bg-amber-100", icon: "text-amber-600" },
  Transportation: { bg: "bg-cyan-100", icon: "text-cyan-600" },
  Utilities: { bg: "bg-yellow-100", icon: "text-yellow-600" },
  Healthcare: { bg: "bg-pink-100", icon: "text-pink-600" },
  Insurance: { bg: "bg-emerald-100", icon: "text-emerald-600" },
  Children: { bg: "bg-purple-100", icon: "text-purple-600" },
  Entertainment: { bg: "bg-indigo-100", icon: "text-indigo-600" },
  Allowances: { bg: "bg-orange-100", icon: "text-orange-600" },
  Vehicle: { bg: "bg-red-100", icon: "text-red-600" },
  Shopping: { bg: "bg-teal-100", icon: "text-teal-600" },
  Groceries: { bg: "bg-lime-100", icon: "text-lime-600" },
  Beauty: { bg: "bg-rose-100", icon: "text-rose-600" },
  Hobbies: { bg: "bg-violet-100", icon: "text-violet-600" },
  "Healthcare & Fitness": { bg: "bg-pink-100", icon: "text-pink-600" },
  "Bills & Subscriptions": { bg: "bg-slate-100", icon: "text-slate-600" },
  Savings: { bg: "bg-green-100", icon: "text-green-600" },
  Education: { bg: "bg-blue-100", icon: "text-blue-600" },
  Travel: { bg: "bg-sky-100", icon: "text-sky-600" },
  Dining: { bg: "bg-amber-100", icon: "text-amber-600" },
  Fitness: { bg: "bg-pink-100", icon: "text-pink-600" },
  Gifts: { bg: "bg-fuchsia-100", icon: "text-fuchsia-600" },
  Pets: { bg: "bg-amber-100", icon: "text-amber-600" },
  Subscriptions: { bg: "bg-slate-100", icon: "text-slate-600" },
  Helper: { bg: "bg-orange-100", icon: "text-orange-600" },
};

/**
 * Get background color for a category
 */
export function getCategoryBgColor(categoryName: string): string {
  return CATEGORY_COLORS[categoryName]?.bg || "bg-gray-100";
}

/**
 * Get icon color for a category
 */
export function getCategoryIconColor(categoryName: string): string {
  return CATEGORY_COLORS[categoryName]?.icon || "text-gray-600";
}

// Default icons for expense categories (lucide icon names)
export const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  Housing: "home",
  Food: "utensils",
  Transportation: "train-front",
  Utilities: "zap",
  Healthcare: "heart-pulse",
  Insurance: "shield-check",
  Children: "baby",
  Entertainment: "film",
  Allowances: "wallet",
  Vehicle: "car",
  Shopping: "shopping-bag",
  Savings: "piggy-bank",
  Education: "graduation-cap",
  Travel: "plane",
  Groceries: "shopping-cart",
  Dining: "utensils-crossed",
  Fitness: "dumbbell",
  Beauty: "sparkles",
  Hobbies: "gamepad-2",
  Gifts: "gift",
  Pets: "paw-print",
  Subscriptions: "repeat",
  "Bills & Subscriptions": "file-text",
  "Healthcare & Fitness": "activity",
  Helper: "hand-helping",
};

/**
 * Get default icon for a category name
 */
export function getDefaultCategoryIcon(categoryName: string): string {
  // Try exact match first
  if (DEFAULT_CATEGORY_ICONS[categoryName]) {
    return DEFAULT_CATEGORY_ICONS[categoryName];
  }

  // Try case-insensitive match
  const lowerName = categoryName.toLowerCase();
  for (const [key, icon] of Object.entries(DEFAULT_CATEGORY_ICONS)) {
    if (key.toLowerCase() === lowerName) {
      return icon;
    }
  }

  // Try partial match
  for (const [key, icon] of Object.entries(DEFAULT_CATEGORY_ICONS)) {
    if (
      lowerName.includes(key.toLowerCase()) ||
      key.toLowerCase().includes(lowerName)
    ) {
      return icon;
    }
  }

  // Default fallback
  return "circle-dollar-sign";
}

/**
 * Get days in a specific month
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculate daily budget from monthly budget
 */
export function calculateDailyBudget(
  monthlyBudget: number,
  daysInMonth: number
): number {
  return monthlyBudget / daysInMonth;
}

/**
 * Calculate expected spending by a specific day (linear pacing)
 */
export function calculateExpectedSpendingByDay(
  monthlyBudget: number,
  dayOfMonth: number,
  daysInMonth: number
): number {
  return (monthlyBudget / daysInMonth) * dayOfMonth;
}

/**
 * Get spending pace status
 */
export function getSpendingPaceStatus(
  actualSpent: number,
  expectedSpent: number
): "under" | "on-track" | "over" {
  if (expectedSpent === 0) return "on-track";

  const ratio = actualSpent / expectedSpent;
  if (ratio < 0.9) return "under";
  if (ratio <= 1.1) return "on-track";
  return "over";
}

/**
 * Get budget usage status based on percentage
 */
export function getBudgetUsageStatus(
  percentUsed: number
): "safe" | "warning" | "danger" {
  if (percentUsed < 75) return "safe";
  if (percentUsed < 90) return "warning";
  return "danger";
}

/**
 * Format currency for display
 */
export function formatBudgetCurrency(
  amount: number,
  currency: string = "SGD"
): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format compact currency (e.g., $1.2K)
 */
export function formatCompactCurrency(
  amount: number,
  currency: string = "SGD"
): string {
  if (amount >= 1000) {
    return new Intl.NumberFormat("en-SG", {
      style: "currency",
      currency,
      notation: "compact",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return formatBudgetCurrency(amount, currency);
}

/**
 * Get month name from month number (1-12)
 */
export function getMonthName(month: number, format: "long" | "short" = "long"): string {
  const date = new Date(2000, month - 1, 1);
  return date.toLocaleString("en-US", { month: format });
}

/**
 * Format date range for display
 */
export function formatDateRange(year: number, month: number): string {
  const daysInMonth = getDaysInMonth(year, month);
  const monthName = getMonthName(month, "short");
  const shortYear = String(year).slice(-2);
  return `1st ${monthName} ${shortYear} - ${daysInMonth}${getOrdinalSuffix(daysInMonth)} ${monthName} ${shortYear}`;
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Check if a month/year is in the past
 */
export function isPastMonth(year: number, month: number): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) return true;
  if (year === currentYear && month < currentMonth) return true;
  return false;
}

/**
 * Check if a month/year is the current month
 */
export function isCurrentMonth(year: number, month: number): boolean {
  const now = new Date();
  return year === now.getFullYear() && month === now.getMonth() + 1;
}

/**
 * Get previous month
 */
export function getPreviousMonth(
  year: number,
  month: number
): { year: number; month: number } {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

/**
 * Get next month (only if it's current or past)
 */
export function getNextMonth(
  year: number,
  month: number
): { year: number; month: number } | null {
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Don't allow navigating to future months
  if (next.year > currentYear) return null;
  if (next.year === currentYear && next.month > currentMonth) return null;

  return next;
}

/**
 * Format frequency for display
 */
export function formatFrequency(frequency: string): string {
  const frequencyMap: Record<string, string> = {
    monthly: "Monthly",
    yearly: "Yearly",
    weekly: "Weekly",
    "bi-weekly": "Bi-weekly",
    "one-time": "One-time",
    custom: "Custom",
  };
  return frequencyMap[frequency] || frequency.charAt(0).toUpperCase() + frequency.slice(1);
}
