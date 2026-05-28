// Brand tokens transcribed from the web's app/globals.css (design guide §2.1).
// Keep this in sync when the web design tokens change. When the Phase A
// monorepo migration lands, move the hex source-of-truth into
// packages/shared so web + mobile pull from the same export.

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // === Brand palette (verbatim from design_guide.md §2.1) ===
        "warm-white": "#FBF7F1",
        cream: "#F0EBE0",
        "deep-forest": "#1C2B2A",
        "dark-surface": "#243332",
        "forest-mid": "#2C3E3D",
        nightfall: "#141E1D",
        terracotta: "#B8622A",
        coral: "#D4845A",
        jungle: "#3A6B52",
        sage: "#5A9470",
        gold: "#D4A843",
        teal: "#00C4AA",
        "teal-light": "#33D4BC",
        "alert-red": "#E05555",
        "alert-red-dark": "#E07070",

        // === Semantic — light mode (primary; mobile is light-mode for v1) ===
        primary: "#B8622A",
        "primary-foreground": "#FBF7F1",
        background: "#FBF7F1",
        surface: "#FFFFFF",
        foreground: "#1C2B2A",
        muted: "#F0EBE0",
        "muted-foreground": "#2C3E3D",
        border: "rgba(28, 43, 42, 0.10)",
        "border-strong": "rgba(28, 43, 42, 0.20)",
        accent: "#3A6B52",
        destructive: "#E05555",

        // === Status-tinted backgrounds + foregrounds (badges, cards) ===
        // Locked on-text colors are inline-only in the source; we hoist them
        // to tokens so they're easy to discover and consistent everywhere.
        "tint-success-bg": "rgba(0, 196, 170, 0.12)",
        "tint-success-fg": "#007A68",
        "tint-warning-bg": "rgba(212, 168, 67, 0.18)",
        "tint-warning-fg": "#7A5A00",
        "tint-danger-bg": "rgba(224, 85, 85, 0.15)",
        "tint-danger-fg": "#8B0000",
        "tint-brand-bg": "rgba(184, 98, 42, 0.15)",
        "tint-brand-fg": "#7A3A0A",
      },
      fontFamily: {
        // Loaded via @expo-google-fonts in app/_layout.tsx.
        display: ["SpaceGrotesk_600SemiBold", "System"],
        "display-medium": ["SpaceGrotesk_500Medium", "System"],
        body: ["DMSans_400Regular", "System"],
        "body-medium": ["DMSans_500Medium", "System"],
        editorial: ["Lora_400Regular_Italic", "System"],
      },
      letterSpacing: {
        // Per design guide §3.2: negative letter-spacing on large display type
        // (-0.5px at 24px+; -1.5px at 80px). Tailwind's `em` units approximate.
        display: "-0.02em",
        wordmark: "-0.04em",
        caps: "0.14em",
      },
    },
  },
  plugins: [],
};
