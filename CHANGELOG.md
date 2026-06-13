# Changelog

All notable changes to Foracle are documented here.
Entries: `## [MAJOR.MINOR.PATCH.MICRO] - YYYY-MM-DD` with Added / Changed / Fixed / Removed sections.

## [1.3.3.0] - 2026-06-14

### Changed
- **The background wallpaper (Radial circles / Peranakan tiles) now shows in dark mode too.** Previously both were `dark:hidden` and the dark canvas was always plain. The patterns are now theme-tuned via `--foreground` — faint deep-forest on the light canvas, faint cream on the nightfall canvas — so whichever wallpaper you pick carries through to dark mode without competing with content. Light mode is visually unchanged. (A deliberate departure from the original design guide §11 "plain dark canvas" rule.)

## [1.3.2.0] - 2026-06-14

### Fixed
- **The page-load logo now follows the theme.** The branded loading overlay rendered the gunmetal mark in both themes, leaving it low-contrast on the dark frost. It now inverts to cream in dark mode (and stays gunmetal in light), matching the shell wordmark's treatment.

## [1.3.1.0] - 2026-06-14

A dark-mode contrast sweep across the whole app, dialog colour standardisation, and a mobile income-slider fix.

### Changed
- **Form controls inside every add/edit dialog now share one background** (`bg-card`), so dialogs like Add Investment match Add Goal, Add Expense, and the rest instead of rendering a shade darker. They all inherit the same surface the input/select primitives use.

### Fixed
- **Dark-mode contrast, app-wide.** Swept every chart, table, tooltip, and form surface for low-contrast colours: the Sankey's inflow/outflow labels were invisible against the nightfall canvas; chart gridlines, axes, and tick labels used hardcoded near-black that vanished in dark mode; and several tooltips rendered light-on-light. They all resolve through theme tokens now, so they stay legible in both themes.
- **The income view's time-range slider now works on mobile.** The slider rendered but a short-circuit ignored its value, so dragging it did nothing — mobile now honours the 2–10 year range like desktop.

## [1.3.0.0] - 2026-06-13

Dark-mode polish across the board, desktop budget fixes, and a budget gauge built into the cashflow Sankey.

### Added
- **The cashflow Sankey's expense end-bars now double as budget gauges.** Each spending category's thick bar fills from the bottom with a deeper shade of its own colour as the month's spending approaches that category's budget (capped at 100% when over). Savings and CPF aren't gauged, and the flowing ribbons are untouched — only the end-bars fill.

### Changed
- **The Budget month selector is now a compact pill** (month + year, with breathing room around the arrows), matching the Sankey's month switcher — fixed width instead of growing with the date text.
- **Page headers are a uniform height across every tab**, so e.g. Insurance no longer sits shorter than Budget.

### Fixed
- **Dark mode contrast, several places:** the add-expense keypad sheet rendered white with washed-out buttons (now a proper dark sheet with legible keys); over-budget / negative red text was too dark to read on the nightfall canvas (now a brighter red); the tour modal's header title was invisible against a hardcoded light gradient; and chart tooltips (Sankey, daily-spending) showed light-on-light.
- **The Daily Spending Trend chart was blank on desktop** even with data — the chart container had no definite height, so the responsive chart collapsed to zero. It renders now.
- **The desktop sidebar no longer flashes on mobile while the app loads.** The layout is now CSS-driven, so the first paint is correct on phones instead of briefly showing the desktop sidebar.

## [1.2.2.0] - 2026-06-13

An immersive page-load transition and a one-tap dark mode switch.

### Added
- **One-tap dark / light toggle in the account menu.** Tapping your avatar now shows a "Dark mode" / "Light mode" item right in the menu, so you can switch without digging into Manage account → Display. The swap cross-fades instead of hard-cutting (and respects "reduce motion"). The full Light / Dark / System picker still lives in Display.

### Changed
- **Switching tabs now blurs the current page with the Foracle mark on top**, instead of a blank loading screen. The previous page frosts over while the next one loads, the bottom nav stays sharp, and a thin progress bar runs along the top. Instant (prefetched) tabs stay crisp — the blur only appears when there's a real wait, and after a few seconds it says "Taking a little longer…" so a slow load reads as intentional.

## [1.2.1.0] - 2026-06-13

Mobile nav polish + a branded loading screen so tab switches feel instant.

### Added
- **Loading screen on tab switches (desktop + mobile).** Switching sections now shows a branded loader — the Foracle "F" mark inside a spinning ring — in the content area while the next page loads, instead of leaving the previous screen frozen. The shell (sidebar on desktop, floating nav on mobile) stays put, so it reads as instant feedback rather than a lag.

### Changed
- **The account avatar now lives inside the bottom nav pill.** It moved out of its own separate circle into the same floating island as the six sections (with a hairline divider) — one neat object instead of two.
- **The active tab highlight slides.** Tapping a section animates the highlight to it (and it moves the instant you tap, before the next page finishes loading), so it's clearer which tab you're on as you move around.

## [1.2.0.0] - 2026-06-13

A Whoop-inspired mobile refresh: a lighter top, a floating bottom bar, and a colour-theme switch you can actually reach.

### Added
- **Light / Dark / System theme toggle.** Account menu → Display now has a colour-theme picker — choose Light, Dark, or System (follow your phone's appearance). Dark mode was already built but could only be triggered by your device setting; now you can pick it directly, and your choice is remembered across visits.

### Changed
- **The bulky mobile top bar is gone, reclaiming vertical space.** The 70px band (logo on the left, account button on the right) is replaced by a small centred Foracle wordmark that scrolls with the page, so the page title and tabs sit higher and more content is visible. A thin status-bar strip keeps content from sliding under the notch / Dynamic Island, and the wordmark stays legible in dark mode.
- **The bottom navigation now floats.** It's a frameless, frosted pill detached from the screen edges (Whoop-style), holding the six sections with a clearer "you are here" highlight. Your account avatar moved out of the old top bar into its own circle beside the pill — tap it for sign-out and Family / Display settings.

## [1.1.0.0] - 2026-06-10

CPF audit remediation, phases 4–6 (built test-first; see CPF_AUDIT_REPORT.md).

### Added
- A single CPF constants module (rates, ceilings, FRS, the $37,740 annual limit) is now the one source of truth shared by the calculation engine, the on-screen rate tables, and the AI assistant's knowledge base — with a test that fails if they ever drift apart (the audit found the engine on 2025 rates while the assistant cited 2026).
- A `cpf_rates_version` stamp on income rows so a future rate change can detect and refresh stale figures on its own.

### Changed
- **Bonus CPF is now correct across the whole year.** Multiple bonuses in a calendar year share the annual ceiling cumulatively instead of each being taxed on the full amount, the $37,740 yearly cap is applied, and bonus CPF is rounded the statutory way — consistently on the CPF tab, the projection chart, the income popup, and the cashflow diagram (which previously over-deducted).
- **CPF now requires a family member with a date of birth.** An income with no linked member (or a member without a DOB) is treated as gross take-home — no more silent assumption of age 30. Age is derived only from the member's DOB, never from the browser, and the lookup is scoped to your own household.

### Fixed
- Income amounts are validated server-side: $0, negative, and non-numeric amounts are rejected (the rules existed but never actually ran).

### Removed
- Negative amounts are no longer accepted by the income amount field.

## [1.0.2.0] - 2026-06-10

### Fixed
- The CPF tab no longer mis-reads one-off bonuses. A one-off bonus (a fixed dollar payout on a specific month) was being treated as a "months of salary" multiplier, so a $5,000 one-off on a $5,000 salary was computed as a $25,000,000 bonus — showing roughly $8,400 of bonus CPF instead of $1,000. Recurring and one-off bonuses are now told apart correctly everywhere.
- The CPF projection chart was silently dropping every bonus (it expected a data shape the app never stored). Bonuses now appear: recurring ones repeat each year in their month, one-off ones land once in their exact month.
- The CPF tab now derives each income's CPF from the same calculation used to save it, so the tab and the income rows agree to the dollar.
- Bonus year-matching is now pinned to Singapore time, so a one-off bonus dated near 1 January is no longer dropped for an ~8-hour window when the server clock (UTC) and Singapore disagree on the calendar year.

### Changed
- Inputs use a 16px font on mobile (14px on larger screens) to stop iOS Safari from auto-zooming when you tap a field.

### Removed
- Deleted three stale internal dev docs (DEV_SERVER_PORT, PWA_MOBILE_AUDIT_REPORT, SETUP_COMPLETE).

## [1.0.1.0] - 2026-06-10

### Fixed
- CPF contributions for ages 55–65 now use the official 1 January 2026 rates (above 55–60: 16% employer / 18% employee; above 60–65: 12.5% / 12.5%). The 2025 rates were previously applied, understating total CPF for senior workers by up to $105/month and overstating their take-home pay.
- CPF amounts now follow the CPF Board's statutory rounding rule — the total contribution rounds to the nearest dollar, the employee share keeps whole dollars, and the employer pays the difference — so Foracle's figures match official payslips and the CPF Board calculator to the dollar.
- The income quick-adjust popup's live CPF preview now uses the exact calculation that gets saved; previously the preview could disagree with the saved figures by $1 on most wages.
- The Full Retirement Sum target on the CPF tab is now $220,400 (the official figure for members turning 55 in 2026); it previously showed the 2024 figure, overstating progress toward the target.

### Added
- 36 new unit tests pinning the 2026 CPF rate tables, statutory rounding edges (round-up, round-down, float-dust), every age-band boundary (55/60/65/70), senior rates through the bonus path, and display-bracket↔engine sync.
