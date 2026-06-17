Source: foracle-brand-guide.html · Generated: 2026-04-26

# Foracle — Design Guide

## 1. Overview

Foracle's voice is the **Guided Companion** — warm, calm, rooted, and intelligent. Visually the system sits at the intersection of Nanyang heritage warmth (terracotta, kaya gold, jungle green, cream backgrounds, Lora serif moments, the Peranakan tile motif) and modern minimal SG product discipline (Space Grotesk for all UI, soft approachable shapes, clean layouts on a precise 8px grid, teal reserved for positive states only). Light mode is the **primary, default** experience; dark mode is a supported toggle. Both modes share accent and semantic rules — only surfaces and text tokens change.

---

## 2. Color tokens

### 2.1 `:root` CSS custom properties (verbatim)

| CSS variable       | Hex / value           | Source label                                          |
| ------------------ | --------------------- | ----------------------------------------------------- |
| `--bg-page`        | `#FBF7F1`             | Light mode page canvas                                |
| `--bg-surface`     | `#FFFFFF`             | Light mode surface                                    |
| `--bg-muted`       | `#F0EBE0`             | Light mode muted fill                                 |
| `--text-primary`   | `#1C2B2A`             | Light mode primary text                               |
| `--text-secondary` | `rgba(28,43,42,0.55)` | Light mode body text                                  |
| `--text-muted`     | `rgba(28,43,42,0.35)` | Light mode metadata                                   |
| `--h`              | `#1C2B2A`             | Deep Forest (brand dark)                              |
| `--h2`             | `#243332`             | Dark surface elevated                                 |
| `--h3`             | `#2C3E3D`             | Forest mid                                            |
| `--dk`             | `#141E1D`             | Nightfall (deepest dark)                              |
| `--p`              | `#B8622A`             | Terracotta — primary CTA (light mode)                 |
| `--p2`             | `#D4845A`             | Prawn Coral — primary CTA (dark mode) / hover (light) |
| `--g`              | `#3A6B52`             | Jungle Green — secondary / charts (light mode)        |
| `--g2`             | `#5A9470`             | Sage Green — charts (dark mode)                       |
| `--go`             | `#D4A843`             | Kaya Gold — warning (both modes)                      |
| `--tl`             | `#00C4AA`             | Teal Flash — positive (both modes)                    |
| `--tl2`            | `#33D4BC`             | Teal light                                            |
| `--cr`             | `#F0EBE0`             | Bak Chang Cream                                       |
| `--cr2`            | `#FBF7F1`             | Warm White                                            |
| `--err`            | `#E05555`             | Alert Red (light)                                     |
| `--err2`           | `#E07070`             | Alert Red (dark)                                      |
| `--warn`           | `#D4A843`             | Warning alias of `--go`                               |

### 2.2 Brand palette (named)

| Token                         | Hex       | Usage context                                                                   |
| ----------------------------- | --------- | ------------------------------------------------------------------------------- |
| Deep Forest (`--h`)           | `#1C2B2A` | Brand dark, headings, key data, light-mode primary text, dark-mode `bg-surface` |
| Dark Surface (`--h2`)         | `#243332` | Dark-mode `bg-elevated` (cards, modals, elevated panels)                        |
| Forest Mid (`--h3`)           | `#2C3E3D` | Dark-mode `bg-muted` (hover, subtle fills)                                      |
| Nightfall (`--dk`)            | `#141E1D` | Dark-mode `bg-page` (deepest canvas)                                            |
| Terracotta (`--p`)            | `#B8622A` | Primary CTA (light), active nav, logo accent, focus rings, links                |
| Prawn Coral (`--p2`)          | `#D4845A` | Primary CTA (dark), Terracotta hover state in light                             |
| Jungle Green (`--g`)          | `#3A6B52` | Chart categories / secondary data points (light)                                |
| Sage Green (`--g2`)           | `#5A9470` | Chart categories (dark) — Jungle Green lightened                                |
| Kaya Gold (`--go` / `--warn`) | `#D4A843` | Warning, attention — locked across both modes                                   |
| Teal Flash (`--tl`)           | `#00C4AA` | Positive financial progress only — locked across both modes                     |
| Teal Light (`--tl2`)          | `#33D4BC` | Teal helper / on-track text in dark mode                                        |
| Bak Chang Cream (`--cr`)      | `#F0EBE0` | Light-mode `bg-muted`, dark-mode `text-primary`                                 |
| Warm White (`--cr2`)          | `#FBF7F1` | Light-mode `bg-page`                                                            |
| Alert Red light (`--err`)     | `#E05555` | Errors, overspent, destructive — light mode                                     |
| Alert Red dark (`--err2`)     | `#E07070` | Errors — dark mode (lightened for legibility)                                   |

### 2.3 Semantic tokens — Light mode (primary)

| Token                  | Color           | Hex / value           | Usage                                             |
| ---------------------- | --------------- | --------------------- | ------------------------------------------------- |
| `bg-page`              | Warm White      | `#FBF7F1`             | Page canvas — base of everything                  |
| `bg-surface`           | Pure White      | `#FFFFFF`             | Cards, panels, sidebar                            |
| `bg-muted`             | Bak Chang Cream | `#F0EBE0`             | Subtle fills, hover, input bg                     |
| `text-primary`         | Deep Forest     | `#1C2B2A`             | Headings, key data, labels                        |
| `text-secondary`       | Forest 55%      | `rgba(28,43,42,0.55)` | Body copy, descriptions                           |
| `text-muted`           | Forest 35%      | `rgba(28,43,42,0.35)` | Metadata, dates, disabled                         |
| `border-default`       | —               | `rgba(28,43,42,0.10)` | Cards, panels, dividers                           |
| `border-strong`        | —               | `rgba(28,43,42,0.20)` | Inputs, active emphasis                           |
| `accent-primary`       | Terracotta      | `#B8622A`             | CTA buttons, active nav, logo, links, focus rings |
| `accent-primary-hover` | Prawn Coral     | `#D4845A`             | Terracotta hover state                            |
| `accent-positive`      | Teal Flash      | `#00C4AA`             | On track, under budget, goal hit — ONLY           |
| `accent-warning`       | Kaya Gold       | `#D4A843`             | Renewals, approaching limit, attention            |
| `accent-secondary`     | Jungle Green    | `#3A6B52`             | Chart categories, secondary data points           |
| `accent-danger`        | Alert Red       | `#E05555`             | Errors, overspent, destructive actions            |

### 2.4 Semantic tokens — Dark mode

| Token                   | Color           | Hex / value              | Usage                                             |
| ----------------------- | --------------- | ------------------------ | ------------------------------------------------- |
| `bg-page`               | Nightfall       | `#141E1D`                | Deepest canvas, page base                         |
| `bg-surface`            | Deep Forest     | `#1C2B2A`                | Sidebar, main panels, top nav                     |
| `bg-elevated`           | Dark Surface    | `#243332`                | Cards, modals, elevated panels                    |
| `bg-muted`              | Forest Mid      | `#2C3E3D`                | Hover states, subtle fills                        |
| `text-primary`          | Bak Chang Cream | `#F0EBE0`                | Headings, key figures, labels                     |
| `text-secondary`        | Cream 55%       | `rgba(240,235,224,0.55)` | Body copy, descriptions                           |
| `text-muted`            | Cream 30%       | `rgba(240,235,224,0.30)` | Metadata, dates, placeholders                     |
| `border-default`        | —               | `rgba(240,235,224,0.08)` | Cards, panels, dividers                           |
| `border-strong`         | —               | `rgba(240,235,224,0.18)` | Inputs, active emphasis                           |
| `accent-primary`        | Prawn Coral     | `#D4845A`                | CTA buttons, active states (lighter for contrast) |
| `accent-primary-border` | Terracotta      | `#B8622A`                | Tinted borders, fills on dark accent elements     |
| `accent-positive`       | Teal Flash      | `#00C4AA`                | Same as light — locked                            |
| `accent-warning`        | Kaya Gold       | `#D4A843`                | Same as light — locked                            |
| `accent-secondary`      | Sage Green      | `#5A9470`                | Chart categories — Jungle Green lightened         |
| `accent-danger`         | Alert Red light | `#E07070`                | Lightened from `#E05555` for legibility           |

### 2.5 Cross-mode locked colors (semantic)

| Token      | Hex                                  | Lock rule                                                             |
| ---------- | ------------------------------------ | --------------------------------------------------------------------- |
| Teal Flash | `#00C4AA`                            | Identical hex in both modes — meaning of "positive" must never differ |
| Kaya Gold  | `#D4A843`                            | Identical hex in both modes — "pay attention" must never differ       |
| Alert Red  | `#E05555` (light) → `#E07070` (dark) | Same family; only lightened for dark-bg legibility                    |

### 2.6 Inline-only text colors (used in source but not declared as `:root` tokens)

| Hex       | Where used                                                  |
| --------- | ----------------------------------------------------------- |
| `#007A68` | "Teal positive" text on success badges, mode-section labels |
| `#7A5A00` | Warning text on gold badges                                 |
| `#8B0000` | Error text on red badges, "Don't" voice card headers        |
| `#7A3A0A` | Light mode badge text on terracotta tint                    |
| `#006B5C` | "Teal Flash — locked" callout text                          |
| `#6B5000` | "Kaya Gold — locked" callout text                           |
| `#C8A030` | Dark-mode "Review needed" gold sub-text                     |
| `#EFC060` | Kaya Gold lighter swatch (shared-card example)              |
| `#33D4BC` | Dark-mode "On track" text (matches `--tl2`)                 |

> Note: these constants are used inline as alternates to the declared `:root` palette but are **not** themselves named tokens in the source. Consider promoting to tokens — see §11.

---

## 3. Typography

### 3.1 Font families

| Family        | Source       | Weights loaded                                  | Role                                             |
| ------------- | ------------ | ----------------------------------------------- | ------------------------------------------------ |
| Space Grotesk | Google Fonts | 400, 500, 600, 700                              | All functional / data-facing / UI type           |
| Lora          | Google Fonts | italic 400, italic 600 (and 600 upright loaded) | Editorial / brand moments — italic only in usage |
| DM Sans       | Google Fonts | 300, 400, 500                                   | All body copy                                    |

> Source rule: "If it's about doing, use Space Grotesk; if it's about feeling, use Lora." DM Sans is the body workhorse (`body { font-family: 'DM Sans', sans-serif; }`).

### 3.2 Type scale

| Token / role              | Font-family   | Size                                                                      | Line-height                                                | Weight                         | Letter-spacing                                       | Usage                                                                    |
| ------------------------- | ------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Wordmark — cover          | Space Grotesk | 80px                                                                      | 1                                                          | 600                            | -3px                                                 | Cover wordmark (`for` + terracotta `acle`)                               |
| Wordmark — logo lockup    | Space Grotesk | 32px                                                                      | // TODO: not defined in source                             | 600                            | -1px                                                 | Standard logo lockup                                                     |
| Wordmark — small lockup   | Space Grotesk | 20px                                                                      | // TODO: not defined in source                             | 600                            | -0.5px                                               | Logo with tagline                                                        |
| Wordmark — footer         | Space Grotesk | 22px                                                                      | // TODO: not defined in source                             | 600                            | -0.5px                                               | Footer wordmark                                                          |
| Display H1                | Space Grotesk | 32–40px                                                                   | 1.2 (sample)                                               | 600                            | -0.5px to -1.5px (large display)                     | Marketing headlines, screen titles, onboarding headers                   |
| Section title (sec-title) | Space Grotesk | 28px                                                                      | // TODO: not defined in source                             | 600                            | -0.5px                                               | Section dividers in brand-guide layout                                   |
| Heading H2                | Space Grotesk | 20–24px (22px sample)                                                     | // TODO: not defined in source                             | 600                            | -0.3px (sample)                                      | Section headers, feature titles, card headings                           |
| Cover title               | Space Grotesk | 36px                                                                      | 1.2                                                        | 600                            | -0.5px                                               | Cover lower-right title                                                  |
| Editorial — primary       | Lora Italic   | 24px                                                                      | 1.4                                                        | 400 italic                     | // TODO: not defined in source                       | Tagline, hero brand copy, positioning statement                          |
| Editorial — cover tagline | Lora Italic   | 20px                                                                      | // TODO: not defined in source                             | 400 italic                     | // TODO: not defined in source                       | Cover tagline                                                            |
| Editorial — large quote   | Lora Italic   | 32px (tagline display) / 19px (positioning quote) / 17px (mission/vision) | 1.2 / 1.6 / 1.55                                           | 400 italic / 600 italic        | // TODO: not defined in source                       | Hero brand statements                                                    |
| Body                      | DM Sans       | 14–16px (15px on `body`)                                                  | 1.6–1.75 (1.6 on body, 1.7 on rule cards)                  | 400                            | // TODO: not defined in source                       | All body copy, descriptions, onboarding, notifications                   |
| Label Caps                | Space Grotesk | 10–11px                                                                   | 1 / 1.6 (varies)                                           | 500 (sample) / 600 (some uses) | 0.14–0.18em (also 0.10em / 0.12em / 0.20em variants) | Data labels, chart axes, metadata, section sub-labels — always uppercase |
| Eyebrow                   | Space Grotesk | 11px                                                                      | // TODO: not defined in source                             | 500                            | 0.18em uppercase                                     | Cover eyebrow / sec-num                                                  |
| Block label               | Space Grotesk | 10px                                                                      | // TODO: not defined in source                             | 600                            | 0.18em uppercase                                     | Block labels in layout                                                   |
| Data Display              | Space Grotesk | 24–36px (32px sample, 26px in cards, 22px in mini-cards)                  | -0.3 to -0.5px (negative letter-spacing for large display) | 600                            | -0.3px to -0.5px                                     | Currency and key numbers — never DM Sans                                 |
| Mono / hex                | monospace     | 11px                                                                      | // TODO: not defined in source                             | 400                            | // TODO: not defined in source                       | Hex codes, spacing values, radius labels                                 |

### 3.3 Typography rules (verbatim from source)

**Do:**

- Use Space Grotesk for all button labels, navigation items, data labels, and UI copy.
- Use Lora italic sparingly — maximum **one instance per screen or page**.
- Maintain hierarchy: Display > H2 > Body > Label. Never skip levels.
- Use negative letter-spacing on large display type (-0.5px to -1.5px at 24px+).
- All wordmark usage must be lowercase with no exceptions.

**Don't:**

- Never use Lora upright (non-italic) — it only appears in italic form.
- Never mix DM Sans and Space Grotesk in the same UI element (e.g. a button).
- Never use all-caps for Display or H2 type — only Label Caps are capped.
- Never use font sizes below 11px anywhere in the product.
- Never use Lora for data, numbers, labels, or functional copy.

---

## 4. Spacing scale

Base unit: **8px**. All spacing values are multiples of 8px (with a `4` half-step for `xs`).

| Token | Value (px) | Value (rem) |
| ----- | ---------- | ----------- |
| `xs`  | 4          | 0.25rem     |
| `sm`  | 8          | 0.5rem      |
| `md`  | 16         | 1rem        |
| `lg`  | 24         | 1.5rem      |
| `xl`  | 32         | 2rem        |
| `2xl` | 48         | 3rem        |
| `3xl` | 64         | 4rem        |
| `4xl` | 80         | 5rem        |

> rem values inferred from a 16px root; the source only defines pixel values. No formal `--space-*` CSS variables exist — the scale is illustrated visually in the spacing-scale block.

### 4.1 Layout grid

| Surface | Columns | Gutter | Outer margin / max-width | Other                                                     |
| ------- | ------- | ------ | ------------------------ | --------------------------------------------------------- |
| Mobile  | 4       | 16px   | 16px outer margins       | Bottom nav 64px height; status bar 48px (safe area)       |
| Web     | 12      | 24px   | Max content width 1100px | Section vertical padding 80px; card inner padding 24–32px |

---

## 5. Radii

| Token / value | Pixel value | Usage                                                            |
| ------------- | ----------- | ---------------------------------------------------------------- |
| `4px`         | 4px         | Inputs                                                           |
| `6px`         | 6px         | Buttons                                                          |
| `8px`         | 8px         | Badges (also alert/info inline cards)                            |
| `10px`        | 10px        | Cards (rule-card, swatch, voice-card, trait-card, ui-card, etc.) |
| `12px`        | 12px        | Mode panels, dark-content surfaces, mission/vision cards         |
| `16px`        | 16px        | Modals                                                           |
| `28px`        | 28px        | Phone shell                                                      |
| `999px`       | 999px       | Pills                                                            |

> Radii are referenced as raw pixel values in the source (`border-radius: 6px`), not via named `--radius-*` tokens.

---

## 6. Shadows / elevation

| Token / context          | Value                                                                                                   | Usage                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Input focus ring         | `box-shadow: 0 0 0 3px rgba(184,98,42,0.1)`                                                             | `.input-sg:focus` — Terracotta-tinted focus ring                                |
| Card / panel "elevation" | `border: 0.5px solid rgba(28,43,42,0.10)` (light) / `border: 0.5px solid rgba(240,235,224,0.08)` (dark) | The system uses **borders rather than box-shadows** for surface differentiation |

> No `box-shadow` elevation scale (sm/md/lg/xl) is defined. Depth in the source is achieved through hairline borders + surface color stack (`bg-page` → `bg-surface` → `bg-elevated` → `bg-muted`). See §11.

---

## 7. Breakpoints

| Name              | Min-width                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| Print media query | `@media print` (no min-width — switches `body` background to white and forces page-break after `.cover`)     |
| Mobile vs Web     | // TODO: not defined in source — only "Mobile grid" and "Web grid" rules are described, no pixel breakpoints |

---

## 8. Z-index layers

// TODO: not defined in source — no `z-index` rules appear in the inline `<style>` block.

---

## 9. Motion

| Property    | Value                          |
| ----------- | ------------------------------ |
| Durations   | // TODO: not defined in source |
| Easings     | // TODO: not defined in source |
| Transitions | // TODO: not defined in source |

> No `transition`, `animation`, `@keyframes`, `--duration-*`, or `--ease-*` declarations exist in the source.

---

## 10. Components

### 10.1 Buttons

**Anatomy** — `font-family: 'Space Grotesk'`, `font-size: 13px` (default), `font-weight: 500`, `padding: 10px 22px`, `border-radius: 6px`, `display: inline-block`, `cursor: pointer`.

**Variants**

| Variant        | Background             | Border                          | Color                 | Source class     |
| -------------- | ---------------------- | ------------------------------- | --------------------- | ---------------- |
| Primary        | `var(--p)` `#B8622A`   | none                            | `#FBF7F1`             | `.btn-primary`   |
| Secondary      | transparent            | `1.5px solid var(--p)`          | `var(--p)`            | `.btn-secondary` |
| Ghost          | transparent            | `1px solid rgba(28,43,42,0.20)` | `rgba(28,43,42,0.60)` | `.btn-ghost`     |
| Teal (success) | `var(--tl)` `#00C4AA`  | none                            | `var(--h)` `#1C2B2A`  | `.btn-teal`      |
| Danger         | `var(--err)` `#E05555` | none                            | `white`               | `.btn-danger`    |

**Sizes**

| Size              | Padding     | Font-size |
| ----------------- | ----------- | --------- |
| Small (`.btn-sm`) | `7px 16px`  | 12px      |
| Default           | `10px 22px` | 13px      |
| Large (`.btn-lg`) | `13px 28px` | 15px      |

**States** — // TODO: hover, focus, active, disabled, loading states are **not defined** in source. Only default visual is shown. Hover for primary is implied by `accent-primary-hover` (`#D4845A`) but the rule is not written.

**Usage rule (verbatim):** "Teal buttons (`btn-teal`) appear only in success/completion flows — e.g. after a savings goal is reached, a budget streak is achieved. Never use as a primary CTA for standard actions."

**Code-ready spec**

```css
/* primary */
background: var(--accent-primary); /* #B8622A light, #D4845A dark */
color: var(--bg-page); /* #FBF7F1 light, #141E1D dark */
border-radius: 6px;
padding: 10px 22px;
font:
  500 13px "Space Grotesk",
  sans-serif;
```

---

### 10.2 Status badges

**Anatomy** — `font-family: 'Space Grotesk'`, `font-size: 11px`, `font-weight: 600`, `padding: 4px 12px`, `border-radius: 4px`.

**Variants**

| Variant | Background              | Color                 | Source class     |
| ------- | ----------------------- | --------------------- | ---------------- |
| Success | `rgba(0,196,170,0.15)`  | `#007A68`             | `.badge-success` |
| Warning | `rgba(212,168,67,0.18)` | `#7A5A00`             | `.badge-warning` |
| Danger  | `rgba(224,85,85,0.15)`  | `#8B0000`             | `.badge-danger`  |
| Neutral | `rgba(28,43,42,0.08)`   | `rgba(28,43,42,0.50)` | `.badge-neutral` |
| Brand   | `rgba(184,98,42,0.15)`  | `var(--p)` `#B8622A`  | `.badge-brand`   |

**States** — // TODO: hover/focus states not defined; badges are non-interactive in source.

---

### 10.3 Form inputs

**Anatomy** — `width: 100%`, `padding: 10px 14px`, `border: 1px solid rgba(28,43,42,0.20)` (`border-strong`), `border-radius: 6px`, `font-family: 'DM Sans'`, `font-size: 14px`, `color: var(--h)`, `background: white`, `outline: none`.

**Label** — `font-family: 'Space Grotesk'`, `font-size: 11px`, `font-weight: 600`, `letter-spacing: 0.1em`, `text-transform: uppercase`, `color: rgba(28,43,42,0.50)`, `margin-bottom: 6px`.

**Helper text** — `font-size: 12px`, `margin-top: 5px`. Color follows state.

**States**

| State    | Border                               | Box-shadow                       | Helper color           | Source modifier                               |
| -------- | ------------------------------------ | -------------------------------- | ---------------------- | --------------------------------------------- |
| Default  | `1px solid rgba(28,43,42,0.20)`      | none                             | —                      | `.input-sg`                                   |
| Focus    | `border-color: var(--p)` `#B8622A`   | `0 0 0 3px rgba(184,98,42,0.10)` | —                      | `.input-sg:focus`                             |
| Success  | `border-color: var(--tl)` `#00C4AA`  | // TODO: not defined             | `var(--tl)` `#00C4AA`  | `.input-sg.success` + `.input-helper.success` |
| Error    | `border-color: var(--err)` `#E05555` | // TODO: not defined             | `var(--err)` `#E05555` | `.input-sg.error` + `.input-helper.error`     |
| Hover    | // TODO: not defined in source       |
| Disabled | // TODO: not defined in source       |

---

### 10.4 Cards

**Generic card (light surface)**

| Property      | Value                                           |
| ------------- | ----------------------------------------------- |
| Background    | `var(--bg-surface)` (`#FFFFFF`)                 |
| Border        | `0.5px solid rgba(28,43,42,0.10)`               |
| Border-radius | `10px`                                          |
| Padding       | `16–24px` (varies: 16px, 18px, 20px, 22px 24px) |

**Dashboard card on dark canvas (`.ui-card`)**

| Property                | Value                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| Background              | `var(--h)` `#1C2B2A`                                                                       |
| Border                  | `0.5px solid rgba(240,235,224,0.08)`                                                       |
| Border-radius           | `10px`                                                                                     |
| Padding                 | `16px 18px`                                                                                |
| Label                   | Space Grotesk 10px / 600 / `letter-spacing: 0.12em` / uppercase / `rgba(240,235,224,0.35)` |
| Amount                  | Space Grotesk 26px / 600 / `letter-spacing: -0.5px`                                        |
| Sub-text                | 12px / `rgba(240,235,224,0.40)` / `margin-top: 4px`                                        |
| Progress bar background | `height: 4px`, `border-radius: 2px`, `background: rgba(255,255,255,0.08)`                  |
| Progress bar foreground | `height: 4px`, `border-radius: 2px` (color = data semantic: terracotta / teal / gold)      |

**Status-tinted card variants** (used in light-mode preview)

| Tint               | Background              | Border                              |
| ------------------ | ----------------------- | ----------------------------------- |
| Positive (teal)    | `rgba(0,196,170,0.08)`  | `0.5px solid rgba(0,196,170,0.20)`  |
| Warning (gold)     | `rgba(212,168,67,0.08)` | `0.5px solid rgba(212,168,67,0.20)` |
| Brand (terracotta) | `rgba(184,98,42,0.07)`  | `0.5px solid rgba(184,98,42,0.20)`  |

---

### 10.5 Modals

// TODO: no full modal component is defined in the source. Only the radius is specified: **`16px`** for modals (per radius scale). Anatomy, sizing, backdrop, header/body/footer, close affordance — all not defined. See §11.

---

### 10.6 Voice cards (Do / Don't pattern)

**Anatomy** — wrapper `border-radius: 10px`, `0.5px solid rgba(28,43,42,0.10)`, header + body split.

| Variant       | Header background      | Header color |
| ------------- | ---------------------- | ------------ |
| `.voice-do`   | `rgba(0,196,170,0.12)` | `#007A68`    |
| `.voice-dont` | `rgba(224,85,85,0.10)` | `#8B0000`    |

Header type: Space Grotesk 10px / 600 / `letter-spacing: 0.14em` / uppercase. Body padding `16px`, background white, example font 14px / line-height 1.6.

---

### 10.7 Trait cards

| Property          | Value                                          |
| ----------------- | ---------------------------------------------- |
| Background        | `white`                                        |
| Border            | `0.5px solid rgba(28,43,42,0.10)`              |
| Border-radius     | `10px`                                         |
| Padding           | `18px 16px`                                    |
| Name              | Space Grotesk 14px / 600 / `var(--h)`          |
| Desc              | 12px / `rgba(28,43,42,0.50)` / line-height 1.6 |
| Negation ("Not:") | 11px italic / `rgba(28,43,42,0.35)`            |

---

### 10.8 Logo / wordmark lockups

| Lockup              | Background           | Wordmark color           | Accent on `acle`     | Notes                          |
| ------------------- | -------------------- | ------------------------ | -------------------- | ------------------------------ |
| Primary (dark bg)   | `var(--h)` `#1C2B2A` | `#F0EBE0`                | `var(--p)` `#B8622A` | The reference lockup           |
| Reversed (light bg) | `#FBF7F1`            | `var(--h)` `#1C2B2A`     | `var(--p)`           | With `0.5px` light border      |
| Mono light on brand | `var(--p)` `#B8622A` | `#FBF7F1`                | none (mono)          | "Mono light · brand colour bg" |
| Mono on dark        | `var(--h)`           | `#F0EBE0` `opacity: 0.9` | none (mono)          | "Mono · dark bg, no accent"    |
| With tagline        | white / `var(--h)`   | `var(--h)` / `#F0EBE0`   | `var(--p)`           | Lora italic 11px tagline       |

**Logo rules (verbatim)**

- Always lowercase — **foracle**, never Foracle.
- The 'acle' carries the terracotta accent on dark/light bgs.
- Minimum size: 80px wide for digital, 18mm for print.
- Clear space: equal to the height of the 'f' on all sides.
- Never stretch, skew, or rotate the wordmark.
- Never place on a busy photo without an overlay.
- Never use teal as the logo accent colour.
- Never recreate the wordmark in a different typeface.

---

### 10.9 Tile motif (brand signature)

A horizontal strip of equal-width color blocks tiled in a fixed sequence:

**Sequence (immutable):** Deep Forest → Terracotta → Teal Flash → Jungle Green → Kaya Gold → Prawn Coral → repeat
`#1C2B2A` → `#B8622A` → `#00C4AA` → `#3A6B52` → `#D4A843` → `#D4845A` → repeat

**Size variants**

| Variant  | Height                        | Border-radius | Usage                                          |
| -------- | ----------------------------- | ------------- | ---------------------------------------------- |
| Thick    | 12px                          | 4–6px         | App splash, hero headers                       |
| Standard | 8px (also 6px in description) | 3px           | Website section dividers                       |
| Thin     | 3–4px                         | 2px           | Marketing cards, email footers, inline accents |

> Source uses the same fixed 12-block sequence (with `#1C2B2A` as the closing block) at all heights. CSS classes: `.motif`, `.motif.h12`, `.motif.h8`, `.motif.h4`, `.motif.h3`.

---

### 10.10 Section divider / header pattern

| Element        | Type spec                                                                               |
| -------------- | --------------------------------------------------------------------------------------- |
| `.sec-num`     | Space Grotesk 11px / 600 / `letter-spacing: 0.20em` / uppercase / `var(--p)`            |
| `.sec-line`    | `1px` line / `rgba(28,43,42,0.15)`                                                      |
| `.sec-title`   | Space Grotesk 28px / 600 / `letter-spacing: -0.5px` / `var(--h)`                        |
| `.block-label` | Space Grotesk 10px / 600 / `letter-spacing: 0.18em` / uppercase / `rgba(28,43,42,0.40)` |
| `.block-desc`  | DM Sans 14px / `rgba(28,43,42,0.65)` / line-height 1.7 / max-width 640px                |

---

## 11. Gaps & open questions

The following items are ambiguous, missing, or inconsistent in the source and should be resolved before this guide is treated as the canonical reference.

- **Motion system is undefined.** No durations, easings, transitions, or `@keyframes` exist in the source. Define an at-minimum 2-step duration scale (e.g. `fast`, `base`) and a default ease for hover/focus/state changes.
- **Z-index layering is undefined.** No `z-index` declarations in source. Need a stacking scale (modal, dropdown, toast, overlay, sticky-nav).
- **Breakpoints are undefined.** "Mobile grid" and "Web grid" are described conceptually but no pixel breakpoint values exist. Define `sm` / `md` / `lg` / `xl` numerically.
- **Shadow/elevation scale is undefined.** Source relies on hairline borders + surface stack instead of `box-shadow`. Confirm intent: is this a deliberate "no shadows" rule, or do modals/popovers/dropdowns need an elevation scale?
- **Component states are partial.** Buttons have no documented hover/focus/active/disabled/loading. Inputs have no hover/disabled. Badges have no interactive states. Define explicitly per component.
- **Modal anatomy is missing.** Only the radius (`16px`) is given — no width, padding, header/body/footer, backdrop color, dismiss affordance, or motion.
- **Token naming is split between two systems.** The `:root` block uses cryptic 1–3 letter aliases (`--p`, `--g`, `--tl`, `--h2`); the semantic mode tables use clear names (`accent-primary`, `bg-elevated`). The semantic names are never declared as actual CSS variables. Either:
  - declare the semantic names in `:root` and deprecate aliases, or
  - publish the alias→semantic mapping as the canonical lookup.
- **Inline-only colors are not tokenized.** `#007A68`, `#7A5A00`, `#8B0000`, `#7A3A0A`, `#006B5C`, `#6B5000`, `#C8A030`, `#EFC060` appear repeatedly inline (badges, callouts, voice headers) but are not declared as tokens. Promote to `--text-on-success`, `--text-on-warning`, `--text-on-danger`, etc.
- **Letter-spacing on Label Caps spans 0.10em → 0.20em.** The rules say "0.14–0.18em," but inline usage drifts to 0.10em (`.input-wrap label`), 0.12em (`.ui-card-label`, `.motif-card-top`), and 0.20em (`.sec-num`). Tighten the rule or add named sub-tokens.
- **Body font-size says 14–16px but `body` is set to 15px.** Pick a single canonical body size or define `body-sm` / `body` / `body-lg`.
- **Tile motif sequence inconsistency.** The "base sequence" prose lists 6 colors (Deep Forest, Terracotta, Teal, Jungle, Gold, Coral). The size-variant blocks tile **12 elements** but the 12th block ends on Deep Forest, not Coral — i.e. the 6-step pattern is broken at the end. Confirm whether motifs should always be a multiple of 6 blocks or whether the asymmetric closing is intentional.
- **Wordmark `letter-spacing` varies.** Cover uses `-3px`, logo lockup uses `-1px`, smaller lockup `-0.5px`, footer `-0.5px`, type-system sample `-2px`. Define explicit per-size values or a formula.
- **Type rule "max one Lora instance per screen"** is stated in §3.3 but the brand-guide source itself violates this (cover tagline + cover wordmark + mission/vision both use Lora on the same page). Clarify whether the rule applies to product UI only.
- **No `--border-*` or `--radius-*` CSS variables.** Borders and radii are written as raw rgba/pixel values throughout. Decide whether to tokenize.
- **Iconography system not documented.** No icon library, sizing, stroke weight, or grid is defined.
- **Charts/data viz not documented.** Accent-secondary hints at "chart categories" but no chart palette, axis treatment, or category ordering is given.
- **Accessibility / contrast targets not documented.** WCAG level (AA / AAA), minimum contrast on muted text, focus-ring contrast on dark mode are not stated.
