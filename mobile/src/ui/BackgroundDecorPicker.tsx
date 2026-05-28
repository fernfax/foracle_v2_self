import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Svg, { Circle, Ellipse, G, Pattern, Rect, Defs } from "react-native-svg";

import { Card } from "@/src/ui/Card";
import { SectionLabel } from "@/src/ui/SectionLabel";
import {
  useBackgroundDecor,
  useSetBackgroundDecor,
} from "@/src/lib/use-background-decor";
import type { BackgroundDecor } from "@/src/api/user-prefs";

const OPTIONS: { value: BackgroundDecor; label: string; hint: string }[] = [
  { value: "radial", label: "Radial circles", hint: "Faint concentric rings" },
  { value: "peranakan", label: "Peranakan tiles", hint: "Floral / geometric motifs" },
  { value: "none", label: "None", hint: "Plain canvas" },
];

export function BackgroundDecorPicker() {
  const current = useBackgroundDecor();
  const { mutate, isPending } = useSetBackgroundDecor();

  return (
    <Card padding="md" className="gap-3">
      <SectionLabel>Background style</SectionLabel>
      <Text className="font-body text-foreground/55 text-sm leading-5">
        Choose the decorative pattern behind the app. Applies to web too.
      </Text>
      <View className="gap-2 mt-1">
        {OPTIONS.map((opt) => {
          const selected = opt.value === current;
          return (
            <Pressable
              key={opt.value}
              onPress={() => {
                if (!selected && !isPending) mutate(opt.value);
              }}
              className="flex-row items-center gap-3 rounded-2xl border p-3 active:opacity-80"
              style={{
                borderColor: selected ? "#B8622A" : "rgba(28,43,42,0.10)",
                backgroundColor: selected ? "rgba(184,98,42,0.06)" : "#FFFFFF",
              }}
            >
              <DecorThumb kind={opt.value} />
              <View className="flex-1">
                <Text className="font-display text-foreground text-sm font-semibold">
                  {opt.label}
                </Text>
                <Text className="font-body text-foreground/55 text-xs mt-0.5">
                  {opt.hint}
                </Text>
              </View>
              {selected ? (
                isPending ? (
                  <ActivityIndicator color="#B8622A" />
                ) : (
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: "#B8622A",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "white", fontSize: 11, fontWeight: "700" }}>
                      ✓
                    </Text>
                  </View>
                )
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function DecorThumb({ kind }: { kind: BackgroundDecor }) {
  const W = 64;
  const H = 44;
  if (kind === "radial") {
    return (
      <View
        style={{
          width: W,
          height: H,
          borderRadius: 8,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(28,43,42,0.10)",
          backgroundColor: "#FFFFFF",
        }}
      >
        <Svg width={W} height={H} viewBox="0 0 64 44">
          <G opacity={0.5}>
            {[8, 16, 24, 32, 40, 48, 56].map((r) => (
              <Circle key={r} cx={56} cy={6} r={r} stroke="#1C2B2A" strokeWidth={0.7} fill="none" />
            ))}
          </G>
        </Svg>
      </View>
    );
  }
  if (kind === "peranakan") {
    return (
      <View
        style={{
          width: W,
          height: H,
          borderRadius: 8,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(28,43,42,0.10)",
          backgroundColor: "#FFFFFF",
        }}
      >
        <Svg width={W} height={H}>
          <Defs>
            <Pattern
              id="thumb-peranakan"
              x="0"
              y="0"
              width="22"
              height="22"
              patternUnits="userSpaceOnUse"
            >
              <Rect x="0.5" y="0.5" width="21" height="21" fill="none" stroke="#B8622A" strokeWidth="0.5" />
              <G x="11" y="11">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                  <Ellipse
                    key={a}
                    cx="0"
                    cy="-5"
                    rx="1.6"
                    ry="3.2"
                    fill="#B8622A"
                    transform={`rotate(${a})`}
                  />
                ))}
                <Circle r="1.5" fill="#3A6B52" />
              </G>
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#thumb-peranakan)" opacity={0.65} />
        </Svg>
      </View>
    );
  }
  return (
    <View
      style={{
        width: W,
        height: H,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(28,43,42,0.10)",
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 8,
          letterSpacing: 1.4,
          color: "rgba(28,43,42,0.45)",
        }}
      >
        PLAIN
      </Text>
    </View>
  );
}
