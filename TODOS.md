# TODOS

## CPF / Income Engine

### Backfill stored CPF values (audit PR 2)
**Priority:** P0
Recompute `employee_cpf_contribution` / `employer_cpf_contribution` / `net_take_home` for all `subject_to_cpf` rows that have a linked member with a DOB — rates and rounding changed in v1.0.1.0, so stored rows still carry 2025-rate, cent-precise values and disagree with live surfaces until re-saved. Rows without a member/DOB are counted and left for the member+DOB policy migration (PR 5). Prod path: Render shell node script. Must land in the same deploy window as v1.0.1.0 to avoid mixed-vintage households (updates recompute unconditionally, so touched rows silently re-price while untouched ones don't).

### Bonus parsing fixes (audit PR 3)
**Priority:** P1
`lib/actions/cpf.ts:173-178` sums one-off bonus dollars as months-of-salary multipliers (a $5,000 one-off on a $5,000 salary reads as a $25M bonus → EE CPF shows ~$8,400 instead of $1,000). `lib/cpf-projection-calculator.ts:91-97` silently drops ALL bonuses (expects a `multiplier` field the stored wire format never has). While in `actions/cpf.ts`, route its per-income math through `calculateCPF` so the CPF tab shows the same statutory dollars as the income rows (currently a ≤$1 seam).

### Shared annual bonus-CPF helper (audit PR 4)
**Priority:** P1
One year-level Additional Wage computation: AW ceiling consumed cumulatively across all bonuses in the year (today each bonus gets the full room — two $6k bonuses at $8k/mo each attract CPF where the law allows $6k total), plus the $37,740 CPF Annual Limit cap (currently unenforced anywhere). Adopt in `lib/balance-calculator.ts`, `components/dashboard/dashboard-header.tsx`, `lib/cashflow-sankey.ts` (replace ratio-on-bonus), and the income popup. Align both dashboard cards to include bonuses (decided 2026-06-10). Apply statutory rounding to bonus CPF here too (deliberately left cent-precise in v1.0.1.0).

### CPF requires a linked member with DOB (audit PR 5)
**Priority:** P1
Policy decided 2026-06-10: an income with no linked family member has CPF disabled (gross = take-home); no member can be created without a DOB (invitees supply DOB on acceptance). Implementation: server-side age resolver from member DOB that ignores client-sent `familyMemberAge` (closes the override hole + the creator drawer's year-diff age bug); disable the Subject-to-CPF toggle without a member (drawer currently defaults it ON); thread real age into `lib/balance-calculator.ts`, dashboard milestone/bonus paths, and `lib/ai/tools/executors.ts` (all currently hardcode age 30); silently migrate orphan CPF rows to gross (pre-count audit first); add a `cpf_rates_version` column with recompute-on-read so the 2027 rate change (already announced) can't reintroduce stale rows.

### Validation, scoping, and constants module (audit PR 6)
**Priority:** P2
Enforce the zod schemas in income server actions (`.parse()` — they're currently type-only), require amount > 0, reject NaN, strip the `-?` from `moneyString`. Family-scope `familyMemberId` on income create and the DOB lookup (`lib/services/incomes.ts:50-52,116-145`; `lib/actions/income.ts:80`) — a crafted create can link a foreign family's member. Single CPF constants module with `effectiveFrom` metadata shared by the engine, display brackets, and the AI knowledge-base seed scripts, with an agreement test (the KB had correct 2026 rates while the engine didn't); derive `CPF_RATE_BRACKETS` from `CPF_RATES`; document the January rates checklist.

### Test coverage gaps (ship coverage audit, 2026-06-10)
**Priority:** P2
`lib/cpf-projection-calculator.ts` has no test file (senior-band rates compound over the projection horizon, incl. 55/60/65 band crossings). `lib/actions/cpf.ts` per-income math untested (needs the real-DB server-action harness).

## Completed
