# Changelog

All notable changes to Foracle are documented here.
Entries: `## [MAJOR.MINOR.PATCH.MICRO] - YYYY-MM-DD` with Added / Changed / Fixed / Removed sections.

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
