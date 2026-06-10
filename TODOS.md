# TODOS

## CPF / Income Engine

### Shared annual bonus-CPF helper (audit PR 4)
**Priority:** P1
One year-level Additional Wage computation: AW ceiling consumed cumulatively across all bonuses in the year (today each bonus gets the full room — two $6k bonuses at $8k/mo each attract CPF where the law allows $6k total), plus the $37,740 CPF Annual Limit cap (currently unenforced anywhere). Adopt in `lib/balance-calculator.ts`, `components/dashboard/dashboard-header.tsx`, `lib/cashflow-sankey.ts` (replace ratio-on-bonus), and the income popup. Align both dashboard cards to include bonuses (decided 2026-06-10). Apply statutory rounding to bonus CPF here too (deliberately left cent-precise in v1.0.1.0).

### CPF requires a linked member with DOB (audit PR 5)
**Priority:** P1
Policy decided 2026-06-10: an income with no linked family member has CPF disabled (gross = take-home); no member can be created without a DOB (invitees supply DOB on acceptance). Implementation: server-side age resolver from member DOB that ignores client-sent `familyMemberAge` (closes the override hole + the creator drawer's year-diff age bug); disable the Subject-to-CPF toggle without a member (drawer currently defaults it ON); thread real age into `lib/balance-calculator.ts`, dashboard milestone/bonus paths, and `lib/ai/tools/executors.ts` (all currently hardcode age 30); silently migrate orphan CPF rows to gross (pre-count audit first); add a `cpf_rates_version` column with recompute-on-read so the 2027 rate change (already announced) can't reintroduce stale rows.

### Validation, scoping, and constants module (audit PR 6)
**Priority:** P2
Enforce the zod schemas in income server actions (`.parse()` — they're currently type-only), require amount > 0, reject NaN, strip the `-?` from `moneyString`. Family-scope `familyMemberId` on income create and the DOB lookup (`lib/services/incomes.ts:50-52,116-145`; `lib/actions/income.ts:80`) — a crafted create can link a foreign family's member. Single CPF constants module with `effectiveFrom` metadata shared by the engine, display brackets, and the AI knowledge-base seed scripts, with an agreement test (the KB had correct 2026 rates while the engine didn't); derive `CPF_RATE_BRACKETS` from `CPF_RATES`; document the January rates checklist.

### Tab vs projection bonus divergence (PR 3 review, 2026-06-10)
**Priority:** P2
Three pre-existing surface disagreements the PR 3 review surfaced, left out of scope: (1) `extractCpfProjectionInputs` uses `incomes.find(...)` so the projection only reads the FIRST CPF income's bonuses per member, while the CPF tab loops all of them; (2) the projection is forward-only (skips month 0), so a one-off dated to the current or a past month of this year shows in the tab snapshot but never in the projection; (3) the recurring projection bonus scales off current gross, ignoring future raises, unlike `bonusForMonth` in the studio. Decide on one canonical bonus semantic across tab / projection / studio.

### Validate imported one-off bonus date shape (PR 3 review, 2026-06-10)
**Priority:** P3
`parseBonusGroups` trusts the one-off `date` is `YYYY-MM` (app writer guarantees it via `format(..., "yyyy-MM")`, but migrated/imported rows aren't validated). A malformed date like `2026-6` silently fails the `=== monthKey` match. Add a shape guard when ingesting external bonus data.

## Completed

### Backfill stored CPF values (audit PR 2)
**Completed:** applied to production 2026-06-10 (`db/manual-migrations/0012_backfill_cpf_2026.cjs`). Dry-run then `--apply` in the Render shell populated 13 NULL CPF rows; re-run confirmed 0 remaining. No senior-rate rows existed on prod, so the change was NULL→correct-value, not drift.

### Bonus parsing fixes (audit PR 3)
**Completed:** v1.0.2.0 (2026-06-10). One-off-vs-multiplier fix in `lib/actions/cpf.ts` (via the new tested `bonusDollarsForYear` helper, SGT-pinned), projection parser fix + one-off wiring in `lib/cpf-projection-calculator.ts`, CPF tab routed through `calculateCPF`. The projection now has a test file (`tests/cpf-projection-calculator.test.ts`, 8 tests) and the bonus aggregation is unit-tested via `bonusDollarsForYear` — closing the prior coverage gap.
