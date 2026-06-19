/**
 * Peranakan-style tile backdrop for the app shell background.
 *
 * Alternative to RadialDecor — gives the canvas a richer, "Singapore
 * shophouse floor" feel via a repeating SVG pattern with four distinct
 * geometric motifs (8-petal floral, quatrefoil rosette, star-octagon,
 * diamond cross). Each tile carries a thin terracotta border so the
 * pattern reads as a tiled floor, not a wash.
 *
 * Dark-tuned: the brand colours (terracotta, sage, cream) read fine on the
 * nightfall canvas, so the tile keeps its multicolour identity in dark mode;
 * only the two deep-forest elements (the cell-3 octagon, the cell-4 hub) were
 * invisible on dark, so they switch to `hsl(var(--foreground))` — forest in
 * light, cream in dark. (Originally dark-hidden per design guide §11; now
 * carried through to dark mode.)
 *
 * Sized at 200×200 per tile in a 400×400 repeating block (4 motifs),
 * then scaled to 0.5 via patternTransform so tiles render tighter
 * (≈100×100 each) without rewriting every coordinate.
 * Opacity tuned low (~0.18) so it never competes with content.
 */
export function LayoutPeranakanTilesDecor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 opacity-[0.22] dark:opacity-[0.20]">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* One repeating tile = 4 motifs in a 2×2 grid = 400×400 box */}
          <pattern
            id="peranakan-pattern"
            x="0"
            y="0"
            width="400"
            height="400"
            patternUnits="userSpaceOnUse"
            patternTransform="scale(0.5)">
            {/* ──── Cell 1 (0,0): 8-petal floral, terracotta ──── */}
            <g transform="translate(0 0)">
              <rect
                x="2"
                y="2"
                width="196"
                height="196"
                fill="none"
                stroke="#B8622A"
                strokeWidth="0.9"
              />
              <rect
                x="14"
                y="14"
                width="172"
                height="172"
                fill="none"
                stroke="#B8622A"
                strokeWidth="0.6"
                opacity="0.7"
              />
              {/* 8 petals around center */}
              <g transform="translate(100 100)">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                  <ellipse
                    key={angle}
                    cx="0"
                    cy="-42"
                    rx="14"
                    ry="28"
                    fill="#B8622A"
                    transform={`rotate(${angle})`}
                  />
                ))}
                {/* Inner core */}
                <circle r="14" fill="#F0EBE0" />
                <circle r="14" fill="none" stroke="#3A6B52" strokeWidth="1.2" />
                <circle r="5" fill="#3A6B52" />
              </g>
              {/* Corner accents */}
              {[
                [22, 22],
                [178, 22],
                [22, 178],
                [178, 178]
              ].map(([x, y]) => (
                <circle
                  key={`f-${x}-${y}`}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="#5A9470"
                />
              ))}
            </g>

            {/* ──── Cell 2 (200,0): Quatrefoil rosette, sage ──── */}
            <g transform="translate(200 0)">
              <rect
                x="2"
                y="2"
                width="196"
                height="196"
                fill="none"
                stroke="#B8622A"
                strokeWidth="0.9"
              />
              <rect
                x="14"
                y="14"
                width="172"
                height="172"
                fill="none"
                stroke="#B8622A"
                strokeWidth="0.6"
                opacity="0.7"
              />
              {/* Quatrefoil = 4 overlapping circles */}
              <g transform="translate(100 100)">
                {[0, 90, 180, 270].map((angle) => (
                  <circle
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
                {/* Inner star — 8 short rays */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                  <line
                    key={`ray-${angle}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="-18"
                    stroke="#B8622A"
                    strokeWidth="1.6"
                    transform={`rotate(${angle})`}
                  />
                ))}
                <circle r="8" fill="#B8622A" />
                <circle r="3" fill="#F0EBE0" />
              </g>
            </g>

            {/* ──── Cell 3 (0,200): Star inside octagon, deep forest ──── */}
            <g transform="translate(0 200)">
              <rect
                x="2"
                y="2"
                width="196"
                height="196"
                fill="none"
                stroke="#B8622A"
                strokeWidth="0.9"
              />
              <rect
                x="14"
                y="14"
                width="172"
                height="172"
                fill="none"
                stroke="#B8622A"
                strokeWidth="0.6"
                opacity="0.7"
              />
              {/* Octagon */}
              <polygon
                points="100,30 142,46 158,88 158,112 142,154 100,170 58,154 42,112 42,88 58,46"
                fill="none"
                stroke="hsl(var(--foreground))"
                strokeWidth="1.4"
              />
              {/* 8-pointed star (two overlapping squares rotated 45°) */}
              <g transform="translate(100 100)">
                <rect
                  x="-40"
                  y="-40"
                  width="80"
                  height="80"
                  fill="none"
                  stroke="#B8622A"
                  strokeWidth="1.3"
                  transform="rotate(0)"
                />
                <rect
                  x="-40"
                  y="-40"
                  width="80"
                  height="80"
                  fill="none"
                  stroke="#B8622A"
                  strokeWidth="1.3"
                  transform="rotate(45)"
                />
                <circle r="10" fill="#3A6B52" />
                <circle r="4" fill="#F0EBE0" />
              </g>
            </g>

            {/* ──── Cell 4 (200,200): Diamond cross with petal corners, rust ──── */}
            <g transform="translate(200 200)">
              <rect
                x="2"
                y="2"
                width="196"
                height="196"
                fill="none"
                stroke="#B8622A"
                strokeWidth="0.9"
              />
              <rect
                x="14"
                y="14"
                width="172"
                height="172"
                fill="none"
                stroke="#B8622A"
                strokeWidth="0.6"
                opacity="0.7"
              />
              {/* Large diamond */}
              <polygon
                points="100,28 172,100 100,172 28,100"
                fill="none"
                stroke="#B8622A"
                strokeWidth="1.4"
              />
              {/* Inner cross */}
              <g transform="translate(100 100)">
                {[0, 90, 180, 270].map((angle) => (
                  <path
                    key={`pet-${angle}`}
                    d="M 0 -50 Q 12 -25 0 0 Q -12 -25 0 -50 Z"
                    fill="#3A6B52"
                    transform={`rotate(${angle})`}
                  />
                ))}
                <circle r="10" fill="hsl(var(--foreground))" />
                <circle r="4" fill="#F0EBE0" />
              </g>
              {/* Corner triangles */}
              {[
                [22, 22, 0],
                [178, 22, 90],
                [178, 178, 180],
                [22, 178, 270]
              ].map(([x, y, rot]) => (
                <polygon
                  key={`tri-${x}-${y}`}
                  points="-8,0 0,-8 8,0"
                  fill="#5A9470"
                  transform={`translate(${x} ${y}) rotate(${rot})`}
                />
              ))}
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#peranakan-pattern)" />
      </svg>
    </div>
  )
}
