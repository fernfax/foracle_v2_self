import { Text, type TextProps } from "react-native";

// Currency / large-data display. Per design_guide.md §3.2 Data Display:
//   Space Grotesk, 24–36px, weight 600, negative letter-spacing -0.3 to
//   -0.5px. Never DM Sans.

type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, { fontSize: number; letterSpacing: number }> = {
  sm: { fontSize: 18, letterSpacing: -0.2 },
  md: { fontSize: 24, letterSpacing: -0.3 },
  lg: { fontSize: 32, letterSpacing: -0.4 },
  xl: { fontSize: 40, letterSpacing: -0.5 },
};

export function DataNumber({
  size = "lg",
  className,
  style,
  ...rest
}: TextProps & { size?: Size }) {
  return (
    <Text
      {...rest}
      className={`font-display text-foreground ${className ?? ""}`}
      style={[
        { fontSize: SIZES[size].fontSize, letterSpacing: SIZES[size].letterSpacing },
        style,
      ]}
    />
  );
}

// Format a money string ("12.50") as SGD currency. Returns "$12.50".
export function formatMoney(value: string | number, opts?: { decimals?: 0 | 2 }): string {
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(n)) return typeof value === "string" ? value : "";
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: opts?.decimals ?? 2,
    maximumFractionDigits: opts?.decimals ?? 2,
  }).format(n);
}
