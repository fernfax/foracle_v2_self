import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

// Atmospheric concentric-circle decor. Sits behind content as a faint
// radar-style backdrop — gives the page subtle dimensionality without
// reading as a pattern. Anchored top-right and partially cropped off
// the canvas; the user shouldn't consciously notice it, just feel that
// the surface "breathes".
//
// Per the design brief: 3–5% opacity, 1px stroke, large concentric
// circles, partial crop off-screen.

export function RadialDecor() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.10,
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMaxYMin slice">
        {/* Centered roughly at the top-right corner, expanding outward */}
        {[40, 80, 120, 160, 200, 240, 280, 320, 360, 400, 440, 480, 520, 560, 600, 640].map((r) => (
          <Circle
            key={r}
            cx={360}
            cy={120}
            r={r}
            stroke="#1C2B2A"
            strokeWidth={1.25}
            fill="none"
          />
        ))}
      </Svg>
    </View>
  );
}
