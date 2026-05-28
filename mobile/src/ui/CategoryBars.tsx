import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { formatMoney } from "@/src/ui/DataNumber";
import { ProgressBar } from "@/src/ui/ProgressBar";

// Per-category row: 44px rounded-square icon container (muted brand tint)
// + name + spent/budget + thick pill progress bar. Modular component
// feel, not a text list.

type Datum = {
  categoryId: string | null;
  categoryName: string;
  spent: number;
  monthlyBudget: number;
};

// Brand-tint background + icon color per category name. Anything not in
// the map falls through to a neutral tint.
const CATEGORY_STYLES: Record<
  string,
  { iconName: keyof typeof Ionicons.glyphMap; bg: string; fg: string }
> = {
  Housing: { iconName: "home-outline", bg: "rgba(184, 98, 42, 0.10)", fg: "#B8622A" },
  Food: { iconName: "restaurant-outline", bg: "rgba(58, 107, 82, 0.10)", fg: "#3A6B52" },
  Transportation: { iconName: "car-outline", bg: "rgba(212, 132, 90, 0.12)", fg: "#B8622A" },
  Utilities: { iconName: "bulb-outline", bg: "rgba(90, 148, 112, 0.12)", fg: "#3A6B52" },
  Healthcare: { iconName: "medkit-outline", bg: "rgba(212, 168, 67, 0.14)", fg: "#7A5A00" },
  Insurance: { iconName: "shield-checkmark-outline", bg: "rgba(0, 196, 170, 0.10)", fg: "#007A68" },
  Children: { iconName: "happy-outline", bg: "rgba(212, 132, 90, 0.14)", fg: "#B8622A" },
  Entertainment: { iconName: "musical-notes-outline", bg: "rgba(184, 98, 42, 0.10)", fg: "#B8622A" },
  Allowances: { iconName: "wallet-outline", bg: "rgba(58, 107, 82, 0.10)", fg: "#3A6B52" },
  Vehicle: { iconName: "car-sport-outline", bg: "rgba(28, 43, 42, 0.08)", fg: "#1C2B2A" },
  Shopping: { iconName: "bag-outline", bg: "rgba(212, 168, 67, 0.14)", fg: "#7A5A00" },
  Savings: { iconName: "leaf-outline", bg: "rgba(0, 196, 170, 0.10)", fg: "#007A68" },
};

const DEFAULT_STYLE = {
  iconName: "ellipse-outline" as keyof typeof Ionicons.glyphMap,
  bg: "rgba(28, 43, 42, 0.06)",
  fg: "rgba(28, 43, 42, 0.55)",
};

function CategoryRow({ d }: { d: Datum }) {
  const style = CATEGORY_STYLES[d.categoryName] ?? DEFAULT_STYLE;
  const percent = d.monthlyBudget > 0 ? (d.spent / d.monthlyBudget) * 100 : 0;

  return (
    <View className="flex-row items-center gap-3 py-3">
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: style.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={style.iconName} size={20} color={style.fg} />
      </View>

      <View className="flex-1 gap-2">
        <View className="flex-row items-baseline justify-between">
          <Text
            className="font-display text-foreground"
            style={{ fontSize: 15, letterSpacing: -0.1 }}
            numberOfLines={1}
          >
            {d.categoryName}
          </Text>
          <Text
            className="font-display-medium"
            style={{ fontSize: 14, color: "rgba(28, 43, 42, 0.7)" }}
          >
            {formatMoney(d.spent, { decimals: 0 })}
            <Text style={{ color: "rgba(28, 43, 42, 0.35)" }}>
              {" / "}
              {formatMoney(d.monthlyBudget, { decimals: 0 })}
            </Text>
          </Text>
        </View>
        <ProgressBar percent={percent} color={style.fg} height={6} />
      </View>
    </View>
  );
}

export function CategoryBars({ data }: { data: Datum[] }) {
  if (data.length === 0) {
    return (
      <Text
        className="font-body text-foreground/55 text-sm py-2"
        style={{ lineHeight: 22 }}
      >
        No categories tracked this month yet.
      </Text>
    );
  }

  return (
    <View className="gap-0">
      {data.map((d, i) => (
        <View
          key={d.categoryId ?? d.categoryName}
          style={
            i > 0
              ? {
                  borderTopWidth: 1,
                  borderTopColor: "rgba(28, 43, 42, 0.05)",
                }
              : undefined
          }
        >
          <CategoryRow d={d} />
        </View>
      ))}
    </View>
  );
}
