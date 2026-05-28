import { Platform, Text, View, type ViewStyle } from "react-native";

// Premium tag — feels like a physical label clipped onto the card edge.
// Soft tinted bg + warm shadow + more padding + tighter type than the
// previous flat badge.

type Variant = "success" | "warning" | "danger" | "brand" | "neutral";

const BG: Record<Variant, string> = {
  success: "rgba(0, 196, 170, 0.14)",
  warning: "rgba(212, 168, 67, 0.18)",
  danger: "rgba(224, 85, 85, 0.14)",
  brand: "rgba(184, 98, 42, 0.14)",
  neutral: "rgba(28, 43, 42, 0.06)",
};

const FG: Record<Variant, string> = {
  success: "#007A68",
  warning: "#7A5A00",
  danger: "#8B0000",
  brand: "#7A3A0A",
  neutral: "rgba(28, 43, 42, 0.55)",
};

const tagShadow: ViewStyle =
  Platform.OS === "ios"
    ? {
        shadowColor: "#1C2B2A",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      }
    : { elevation: 1 };

export function StatusPill({
  label,
  variant = "neutral",
}: {
  label: string;
  variant?: Variant;
}) {
  return (
    <View
      style={[
        {
          alignSelf: "flex-start",
          backgroundColor: BG[variant],
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
        },
        tagShadow,
      ]}
    >
      <Text
        className="font-display"
        style={{
          fontSize: 10,
          color: FG[variant],
          letterSpacing: 1.6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
