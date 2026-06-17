"use client"

import { useEffect, useState } from "react"
import { MeshGradient } from "@paper-design/shaders-react"
import { useTheme } from "next-themes"

const LIGHT_COLORS = [
  "#FBF7F1",
  "#F0EBE0",
  "#E8D9C4",
  "#B8622A",
  "#3A6B52",
  "#D4A843"
]

const DARK_COLORS = [
  "#1C2B2A",
  "#243534",
  "#3A6B52",
  "#7A3A0A",
  "#B8622A",
  "#1C2B2A"
]

export function LandingShader() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === "dark"
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <MeshGradient
        colors={colors}
        speed={0.18}
        distortion={0.6}
        swirl={0.08}
        grainMixer={0}
        grainOverlay={0}
        style={{
          width: "100%",
          height: "100%",
          opacity: isDark ? 0.7 : 0.55
        }}
      />
    </div>
  )
}
