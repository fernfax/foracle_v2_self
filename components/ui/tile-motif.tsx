import { cn } from "@/lib/utils";

/**
 * TileMotif — Foracle's brand signature divider strip.
 * See /design_guide/design_guide.md §10.9.
 *
 * Sequence (immutable): Deep Forest → Terracotta → Teal Flash →
 * Jungle Green → Kaya Gold → Prawn Coral, repeated for 12 blocks.
 */

const MOTIF_SEQUENCE = [
  "#1C2B2A", // Deep Forest
  "#B8622A", // Terracotta
  "#00C4AA", // Teal Flash
  "#3A6B52", // Jungle Green
  "#D4A843", // Kaya Gold
  "#D4845A", // Prawn Coral
  "#1C2B2A",
  "#B8622A",
  "#00C4AA",
  "#3A6B52",
  "#D4A843",
  "#1C2B2A",
] as const;

interface TileMotifProps {
  /** Strip height. Defaults to "thin" (3px) for inline accents. */
  size?: "thin" | "standard" | "thick";
  className?: string;
}

const SIZE_STYLES = {
  thin: { height: 3, radius: 2 },
  standard: { height: 8, radius: 3 },
  thick: { height: 12, radius: 4 },
} as const;

export function TileMotif({ size = "thin", className }: TileMotifProps) {
  const { height, radius } = SIZE_STYLES[size];

  return (
    <div
      className={cn("flex w-full overflow-hidden", className)}
      style={{ height, borderRadius: radius }}
      role="presentation"
      aria-hidden
    >
      {MOTIF_SEQUENCE.map((color, i) => (
        <div
          key={`${color}-${i}`}
          className="flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
