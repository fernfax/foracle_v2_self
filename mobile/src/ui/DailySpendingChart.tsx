import { Text, View } from "react-native";

import { SectionLabel } from "@/src/ui/SectionLabel";

// Hand-rolled bar chart — one vertical bar per day. Daily spend is mapped
// to bar height as a fraction of the busiest day. Today's bar gets a
// terracotta highlight; zero-spend days render a 1px stub so the day grid
// still reads.
//
// Hand-rolled instead of Victory Native because we don't want to add a
// react-native-svg / skia dep yet — that's its own scope.

type Datum = { day: number; amount: number };

export function DailySpendingChart({
  data,
  daysInMonth,
  currentDay,
}: {
  data: Datum[]; // sparse — only days with spend
  daysInMonth: number;
  currentDay: number;
}) {
  const maxAmount = Math.max(0, ...data.map((d) => d.amount));
  const byDay = new Map(data.map((d) => [d.day, d.amount]));

  const bars = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const amount = byDay.get(day) ?? 0;
    const ratio = maxAmount > 0 ? amount / maxAmount : 0;
    return { day, amount, ratio, isToday: day === currentDay };
  });

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <SectionLabel>Daily spending</SectionLabel>
        <Text className="font-display text-[11px] text-foreground/40">
          PEAK ${maxAmount.toFixed(0)}
        </Text>
      </View>
      <View
        className="flex-row items-end gap-px"
        style={{ height: 84 }}
        accessibilityLabel={`Daily spending bar chart, ${data.length} of ${daysInMonth} days have spend`}
      >
        {bars.map((b) => {
          const height = Math.max(2, b.ratio * 80);
          const color = b.amount === 0
            ? "rgba(28,43,42,0.06)"
            : b.isToday
              ? "#B8622A"
              : b.ratio > 0.7
                ? "#D4845A"
                : "#3A6B52";
          return (
            <View
              key={b.day}
              style={{
                flex: 1,
                height,
                backgroundColor: color,
                borderRadius: 2,
              }}
            />
          );
        })}
      </View>
      <View className="flex-row justify-between pt-1">
        <Text className="font-display text-[10px] text-foreground/40">1</Text>
        <Text className="font-display text-[10px] text-foreground/40">
          {Math.ceil(daysInMonth / 2)}
        </Text>
        <Text className="font-display text-[10px] text-foreground/40">
          {daysInMonth}
        </Text>
      </View>
    </View>
  );
}
