import { View } from "react-native";

// Brand tile motif — horizontal strip of color blocks in the fixed brand
// sequence (design_guide.md §10.9):
//
//   Deep Forest → Terracotta → Teal Flash → Jungle Green → Kaya Gold → Prawn Coral → repeat
//
// The web app's source uses 12 blocks ending on Deep Forest. We replicate
// that here. Three height variants: thick (12px, app splash/hero), standard
// (8px, section dividers), thin (3px, accents).

const SEQUENCE = [
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
];

const HEIGHTS = {
  thick: 12,
  standard: 8,
  thin: 3,
};

const RADII = {
  thick: 6,
  standard: 3,
  thin: 2,
};

export function MotifStrip({
  variant = "standard",
}: {
  variant?: "thick" | "standard" | "thin";
}) {
  const h = HEIGHTS[variant];
  const r = RADII[variant];
  return (
    <View
      style={{ height: h, flexDirection: "row", borderRadius: r, overflow: "hidden" }}
    >
      {SEQUENCE.map((color, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: color }} />
      ))}
    </View>
  );
}
