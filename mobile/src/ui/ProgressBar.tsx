import { View } from "react-native";

// Premium-paper progress bar. 8-10px track, fully rounded pill ends,
// recessed track via a subtle warm-gray fill, brighter fill stripe with
// a top highlight overlay so it reads as a slightly raised tag.
//
// Status color follows budget usage convention from the web:
//   < 75% → terracotta
//   75–90% → kaya gold
//   ≥ 90% → alert red

type ProgressBarProps = {
  /** 0–100; the visual fills clamp to 100% but you can pass the real value. */
  percent: number;
  /** Override the auto status color. */
  color?: string;
  /** Track height in pixels. Default 10. */
  height?: number;
};

function statusColor(percent: number): string {
  if (percent >= 90) return "#E05555";
  if (percent >= 75) return "#D4A843";
  return "#B8622A";
}

export function ProgressBar({ percent, color, height = 10 }: ProgressBarProps) {
  const fillPercent = Math.max(0, Math.min(100, percent));
  const fill = color ?? statusColor(percent);
  const radius = height / 2;

  return (
    <View
      style={{
        height,
        backgroundColor: "rgba(28, 43, 42, 0.06)",
        borderRadius: radius,
        overflow: "hidden",
      }}
    >
      {/* Recessed track: a tiny inner darker stripe at the top edge fakes an
          inset feel. Subtle enough that it just reads as "this is a track,
          not a button". */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: "rgba(28, 43, 42, 0.05)",
        }}
      />
      <View
        style={{
          width: `${fillPercent}%`,
          height: "100%",
          backgroundColor: fill,
          borderRadius: radius,
        }}
      >
        {/* Top highlight on the fill — gives the bar that "lit" tag feel. */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: radius,
            right: radius,
            height: 1,
            backgroundColor: "rgba(255, 255, 255, 0.25)",
          }}
        />
      </View>
    </View>
  );
}
