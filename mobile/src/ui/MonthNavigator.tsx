import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, Text, View, type ViewStyle } from "react-native";

// Floating-button month navigator. Chevrons sit in white circular
// containers with soft shadows so they read as tactile buttons rather
// than naked icons.

const buttonShadow: ViewStyle =
  Platform.OS === "ios"
    ? {
        shadowColor: "#1C2B2A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      }
    : { elevation: 2 };

function ChevronButton({
  direction,
  onPress,
}: {
  direction: "back" | "forward";
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "rgba(28, 43, 42, 0.06)",
          transform: pressed ? [{ scale: 0.96 }] : undefined,
        },
        buttonShadow,
      ]}
    >
      <Ionicons
        name={direction === "back" ? "chevron-back" : "chevron-forward"}
        size={18}
        color="#1C2B2A"
      />
    </Pressable>
  );
}

export function MonthNavigator({
  year,
  month,
  onPrev,
  onNext,
}: {
  year: number;
  month: number; // 1–12
  onPrev: () => void;
  onNext: () => void;
}) {
  const label = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <View className="flex-row items-center justify-between">
      <ChevronButton direction="back" onPress={onPrev} />
      <Text
        className="font-display text-foreground"
        style={{ fontSize: 17, letterSpacing: -0.3 }}
      >
        {label}
      </Text>
      <ChevronButton direction="forward" onPress={onNext} />
    </View>
  );
}
