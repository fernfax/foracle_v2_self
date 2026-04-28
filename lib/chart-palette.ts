/**
 * Chart palette — derived from /design_guide/design_guide.md §2 + §10.4.
 *
 * Categorical chart colors are anchored to the brand palette. Order matters:
 * Recharts components consume colors by index, so the first colors should be
 * the most readable on warm-white canvases.
 */

export const CHART_PALETTE = [
  "#3A6B52", // Jungle Green — primary categorical
  "#B8622A", // Terracotta — primary brand accent
  "#D4A843", // Kaya Gold — warning / attention
  "#00C4AA", // Teal Flash — positive / on-track
  "#5A9470", // Sage Green — secondary jungle
  "#D4845A", // Prawn Coral — secondary terracotta
  "#2C3E3D", // Forest Mid — neutral
  "#7A5A00", // Dark gold — high-contrast on light bgs
  "#007A68", // Dark teal — high-contrast on light bgs
  "#8B0000", // Dark red — destructive
] as const;

/** Pick a categorical color by index, wrapping around when out of range. */
export const chartColor = (index: number): string =>
  CHART_PALETTE[index % CHART_PALETTE.length];

/**
 * Status colors map to the design guide's semantic tokens (locked across modes).
 * Use these whenever a chart line / bar represents a meaning, not just a category.
 */
export const STATUS_COLORS = {
  positive: "#00C4AA", // Teal Flash — on-track, gains, surplus
  warning: "#D4A843",  // Kaya Gold — approaching limit
  danger: "#E05555",   // Alert Red — overspent, deficit
  neutral: "#3A6B52",  // Jungle Green — baseline
  brand: "#B8622A",    // Terracotta — primary CTA / highlight
} as const;

/**
 * Recharts axis / grid styling — design guide §10.4 calls for hairlines and
 * Forest 55% body text at Space Grotesk 11px.
 */
export const CHART_AXIS_STYLE = {
  stroke: "rgba(28,43,42,0.15)",
  fontSize: 11,
  fontFamily: '"Space Grotesk", system-ui, sans-serif',
  fill: "rgba(28,43,42,0.55)",
} as const;

export const CHART_GRID_STROKE = "rgba(28,43,42,0.08)";

/**
 * Recharts tooltip styling — uses bg-popover token surface.
 */
export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#FFFFFF",
    border: "0.5px solid rgba(28,43,42,0.15)",
    borderRadius: "10px",
    fontSize: 12,
    fontFamily: '"DM Sans", system-ui, sans-serif',
    boxShadow: "0 4px 12px rgba(28,43,42,0.06)",
  },
  labelStyle: {
    color: "#1C2B2A",
    fontFamily: '"Space Grotesk", system-ui, sans-serif',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
  },
} as const;
