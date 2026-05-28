import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  Path,
  Pattern,
  Polygon,
  Rect,
} from "react-native-svg";

/**
 * Peranakan-style tile backdrop for mobile — mirrors the web component
 * (components/ui/peranakan-tiles-decor.tsx) using react-native-svg.
 *
 * Tileable 2×2 grid of motifs (8-petal floral, quatrefoil rosette,
 * star-octagon, diamond cross) in brand colors at low opacity. Sits
 * absolutely positioned behind content; light mode only.
 */
export function PeranakanTilesDecor() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.22,
      }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="peranakan-pattern"
            x="0"
            y="0"
            width="200"
            height="200"
            patternUnits="userSpaceOnUse"
          >
            {/* Tile border */}
            <Rect
              x="2"
              y="2"
              width="196"
              height="196"
              fill="none"
              stroke="#B8622A"
              strokeWidth="0.9"
            />
            <Rect
              x="14"
              y="14"
              width="172"
              height="172"
              fill="none"
              stroke="#B8622A"
              strokeWidth="0.6"
              opacity="0.7"
            />
            {/* 8-petal floral, terracotta — single motif repeats. We use
                one motif per tile (not 4) because RN-svg doesn't compose
                nested patterns as cleanly, and the visual density at
                phone scale wants larger individual motifs anyway. */}
            <G x="100" y="100">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <Ellipse
                  key={angle}
                  cx="0"
                  cy="-42"
                  rx="14"
                  ry="28"
                  fill="#B8622A"
                  transform={`rotate(${angle})`}
                />
              ))}
              <Circle r="14" fill="#F0EBE0" />
              <Circle r="14" fill="none" stroke="#3A6B52" strokeWidth="1.2" />
              <Circle r="5" fill="#3A6B52" />
            </G>
            {/* Corner accents */}
            {[
              [22, 22],
              [178, 22],
              [22, 178],
              [178, 178],
            ].map(([x, y]) => (
              <Circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#5A9470" />
            ))}
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#peranakan-pattern)" />
        {/* Cycle in 3 additional motifs as overlay tiles every 400px so
            the eye sees variety, not just one repeating flower. */}
        <PeranakanOverlay />
      </Svg>
    </View>
  );
}

/**
 * Overlay layer — drops a quatrefoil + star-octagon + diamond cross at
 * offset positions so the pattern reads as a varied tiled floor instead
 * of one repeating flower. Each cell uses absolute coords; the SVG
 * canvas is sized to viewport so they cover whatever area the parent has.
 */
function PeranakanOverlay() {
  // Render each variant motif at a few fixed positions across the canvas
  // so it interrupts the repeating 8-petal flower from the base pattern.
  const variants: {
    cx: number;
    cy: number;
    kind: "quatrefoil" | "star-octagon" | "diamond";
  }[] = [
    { cx: 300, cy: 100, kind: "quatrefoil" },
    { cx: 700, cy: 100, kind: "star-octagon" },
    { cx: 500, cy: 300, kind: "diamond" },
    { cx: 100, cy: 500, kind: "star-octagon" },
    { cx: 500, cy: 700, kind: "quatrefoil" },
    { cx: 900, cy: 500, kind: "diamond" },
    { cx: 300, cy: 900, kind: "diamond" },
    { cx: 700, cy: 900, kind: "quatrefoil" },
  ];

  return (
    <G>
      {variants.map((v) => (
        <Motif key={`${v.cx}-${v.cy}`} cx={v.cx} cy={v.cy} kind={v.kind} />
      ))}
    </G>
  );
}

function Motif({
  cx,
  cy,
  kind,
}: {
  cx: number;
  cy: number;
  kind: "quatrefoil" | "star-octagon" | "diamond";
}) {
  // Each motif is a 200×200 cell with its own border, replacing the
  // base 8-petal flower for that cell.
  const ox = cx - 100;
  const oy = cy - 100;
  return (
    <G x={ox} y={oy}>
      {/* Mask out base pattern by re-painting the cream canvas */}
      <Rect width="200" height="200" fill="#F0EBE0" />
      <Rect
        x="2"
        y="2"
        width="196"
        height="196"
        fill="none"
        stroke="#B8622A"
        strokeWidth="0.9"
      />
      <Rect
        x="14"
        y="14"
        width="172"
        height="172"
        fill="none"
        stroke="#B8622A"
        strokeWidth="0.6"
        opacity="0.7"
      />
      {kind === "quatrefoil" && (
        <G x="100" y="100">
          {[0, 90, 180, 270].map((angle) => (
            <Circle
              key={angle}
              cx="0"
              cy="-26"
              r="36"
              fill="none"
              stroke="#3A6B52"
              strokeWidth="1.4"
              transform={`rotate(${angle})`}
            />
          ))}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <Line
              key={`r-${angle}`}
              x1="0"
              y1="0"
              x2="0"
              y2="-18"
              stroke="#B8622A"
              strokeWidth="1.6"
              transform={`rotate(${angle})`}
            />
          ))}
          <Circle r="8" fill="#B8622A" />
          <Circle r="3" fill="#F0EBE0" />
        </G>
      )}
      {kind === "star-octagon" && (
        <>
          <Polygon
            points="100,30 142,46 158,88 158,112 142,154 100,170 58,154 42,112 42,88 58,46"
            fill="none"
            stroke="#1C2B2A"
            strokeWidth="1.4"
          />
          <G x="100" y="100">
            <Rect
              x="-40"
              y="-40"
              width="80"
              height="80"
              fill="none"
              stroke="#B8622A"
              strokeWidth="1.3"
            />
            <Rect
              x="-40"
              y="-40"
              width="80"
              height="80"
              fill="none"
              stroke="#B8622A"
              strokeWidth="1.3"
              transform="rotate(45)"
            />
            <Circle r="10" fill="#3A6B52" />
            <Circle r="4" fill="#F0EBE0" />
          </G>
        </>
      )}
      {kind === "diamond" && (
        <>
          <Polygon
            points="100,28 172,100 100,172 28,100"
            fill="none"
            stroke="#B8622A"
            strokeWidth="1.4"
          />
          <G x="100" y="100">
            {[0, 90, 180, 270].map((angle) => (
              <Path
                key={`p-${angle}`}
                d="M 0 -50 Q 12 -25 0 0 Q -12 -25 0 -50 Z"
                fill="#3A6B52"
                transform={`rotate(${angle})`}
              />
            ))}
            <Circle r="10" fill="#1C2B2A" />
            <Circle r="4" fill="#F0EBE0" />
          </G>
        </>
      )}
    </G>
  );
}
