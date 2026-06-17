/**
 * Brand-aligned data palette + deterministic color helpers, scoped to the five
 * portfolio pages (Assets, Insurance, Investments, Goals, Budget).
 *
 * Why this exists separately from lib/budget-utils.ts CATEGORY_COLORS: that map
 * uses non-brand Tailwind classes (bg-blue-100 …) and is consumed by the
 * untouched Budget internals — we must NOT edit it. These are raw brand hexes
 * for the new color-dots / progress fills, derived in the UI only (no schema).
 */

/** Brand data colors from the design tokens (terracotta, jungle, teal, gold …). */
export const BRAND_DATA_COLORS = [
  "#B8622A", // terracotta
  "#3A6B52", // jungle
  "#00C4AA", // teal
  "#D4A843", // kaya gold
  "#5A9470", // sage
  "#D4845A", // coral
  "#2C3E3D", // deep pine
  "#A9551F", // burnt terracotta
  "#7A9B86" // muted sage
] as const

/** Known category → brand color (mirrors the prototype's CAT_COLORS intent). */
const CATEGORY_COLOR_MAP: Record<string, string> = {
  Food: "#B8622A",
  Groceries: "#B8622A",
  Dining: "#A9551F",
  Housing: "#3A6B52",
  Transportation: "#D4A843",
  Vehicle: "#D4A843",
  Children: "#00C4AA",
  Education: "#00C4AA",
  Utilities: "#5A9470",
  "Bills & Subscriptions": "#5A9470",
  Subscriptions: "#5A9470",
  Insurance: "#D4845A",
  Investments: "#2C3E3D",
  Savings: "#2C3E3D",
  Healthcare: "#1C2B2A",
  "Healthcare & Fitness": "#1C2B2A",
  Fitness: "#1C2B2A",
  Entertainment: "#A9551F",
  Hobbies: "#A9551F",
  Allowances: "#7A9B86",
  Shopping: "#7A9B86"
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Stable brand color for an expense category (Budget dots). */
export function categoryColor(name: string): string {
  if (CATEGORY_COLOR_MAP[name]) return CATEGORY_COLOR_MAP[name]
  const ci = Object.keys(CATEGORY_COLOR_MAP).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  )
  if (ci) return CATEGORY_COLOR_MAP[ci]
  return BRAND_DATA_COLORS[hashString(name) % BRAND_DATA_COLORS.length]
}

/** Stable brand color from any seed string (e.g. a goal name or holding type). */
export function brandColor(seed: string): string {
  return BRAND_DATA_COLORS[hashString(seed) % BRAND_DATA_COLORS.length]
}
