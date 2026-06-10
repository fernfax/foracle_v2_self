# Changelog

All notable changes to Foracle are documented here.
Entries: `## [MAJOR.MINOR.PATCH.MICRO] - YYYY-MM-DD` with Added / Changed / Fixed / Removed sections.

## [1.0.1.0] - 2026-06-10

### Fixed
- CPF contributions for ages 55–65 now use the official 1 January 2026 rates (above 55–60: 16% employer / 18% employee; above 60–65: 12.5% / 12.5%). The 2025 rates were previously applied, understating total CPF for senior workers by up to $105/month and overstating their take-home pay.
- CPF amounts now follow the CPF Board's statutory rounding rule — the total contribution rounds to the nearest dollar, the employee share keeps whole dollars, and the employer pays the difference — so Foracle's figures match official payslips and the CPF Board calculator to the dollar.
- The income quick-adjust popup's live CPF preview now uses the exact calculation that gets saved; previously the preview could disagree with the saved figures by $1 on most wages.
- The Full Retirement Sum target on the CPF tab is now $220,400 (the official figure for members turning 55 in 2026); it previously showed the 2024 figure, overstating progress toward the target.

### Added
- 36 new unit tests pinning the 2026 CPF rate tables, statutory rounding edges (round-up, round-down, float-dust), every age-band boundary (55/60/65/70), senior rates through the bonus path, and display-bracket↔engine sync.
