import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "DM Sans", "system-ui", "sans-serif"],
        display: [
          "var(--font-space-grotesk)",
          "Space Grotesk",
          "system-ui",
          "sans-serif",
        ],
        editorial: ["var(--font-lora)", "Lora", "Georgia", "serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        // Direct brand utilities for cases where exact hex is needed.
        brand: {
          terracotta: "#B8622A",
          coral: "#D4845A",
          jungle: "#3A6B52",
          sage: "#5A9470",
          gold: "#D4A843",
          teal: "#00C4AA",
          "teal-light": "#33D4BC",
          cream: "#F0EBE0",
          "warm-white": "#FBF7F1",
          "deep-forest": "#1C2B2A",
          "dark-surface": "#243332",
          "forest-mid": "#2C3E3D",
          nightfall: "#141E1D",
          "alert-red": "#E05555",
          "alert-red-dark": "#E07070",
        },
      },
      borderRadius: {
        none: "0",
        xs: "4px",     // inputs
        sm: "6px",     // buttons
        DEFAULT: "8px",// badges
        md: "8px",
        lg: "10px",    // cards (overrides Tailwind default to match brand guide)
        xl: "12px",    // panels / dark-content surfaces
        "2xl": "16px", // modals
        "3xl": "28px", // phone shell
        full: "9999px",
      },
      fontSize: {
        // Brand-guide-aligned sizing helpers
        eyebrow: ["11px", { lineHeight: "1", letterSpacing: "0.18em" }],
        "label-caps": ["11px", { lineHeight: "1.2", letterSpacing: "0.14em" }],
        "data-sm": ["22px", { lineHeight: "1.1", letterSpacing: "-0.3px" }],
        data: ["26px", { lineHeight: "1.1", letterSpacing: "-0.5px" }],
        "data-lg": ["32px", { lineHeight: "1.1", letterSpacing: "-0.5px" }],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
