# TODOS

## CPF / Income Engine

### PR 4b — per-month dashboard bonus surfaces (deferred from PR 4)

**Priority:** P2
PR 4 routed the dedicated bonus-CPF surfaces (CPF tab, projection, income popup, beta-view, Sankey ratio fix) through the new `AnnualBonusCpf` accumulator. Still on the legacy per-call `calculateBonusCPF(.,.,30)`: `src/lib/balance-calculator.ts` (~:353) and `src/components/dashboard/dashboard-header.tsx` (~:302); `src/components/dashboard/total-income-card.tsx` still has NO bonus block. These are per-MONTH surfaces that need a shared `bonusNetForMonth(income, year, month, age)` helper (replays the year's bonuses ≤ target month so the AW ceiling is cumulative) and move the main dashboard's numbers — kept separate to land the higher-risk dashboard change on its own. Also align both dashboard cards to include bonuses (decided 2026-06-10), and thread real age here once PR 5's resolver lands (these still hardcode 30).

### Salary-inclusive $37,740 annual-limit cap (follow-up)

**Priority:** P3
`AnnualBonusCpf`'s $37,740 cap is bonus-only — it doesn't see the member's monthly salary CPF, so the cap is a safety rail that (given the AW ceiling) never actually binds on bonus alone. Full coverage means seeding the accumulator with the year's salary CPF already consumed. Low urgency (the AW ceiling binds first in every realistic case).

### PR 5b — input UI + secondary display enforcement (follow-up to PR 5)

**Priority:** P1
PR 5 landed the SERVER-side member+DOB policy (both write paths via the shared `resolveCpfFields`, recompute-on-read, the `cpf_rates_version` column, the CPF-tab no-DOB fix, and the orphan-flip migration). Still to do:

- **Member-create DOB enforcement:** `src/lib/services/family.ts` `createFamilyMember` / `updateFamilyMember` should reject a null DOB — but NOT the invite path (`inviteFamilyMember` deliberately inserts pending members with no DOB; they're locked until acceptance). The add dialog already requires DOB; `src/components/family-members/edit-family-member-dialog.tsx` does not — add the guard there.
- **Creator drawer:** disable the "Subject to CPF" toggle when no member is linked (it currently defaults ON, `income-creator-drawer.tsx:115`) and stop sending the year-diff `familyMemberAge` (`:127-129`) — the server ignores it now, but drop the dead client computation.
- **Secondary display age-30 kills:** `src/lib/ai/tools/executors.ts` (~:794, :1215) and `src/components/income/income-list.tsx:419` (legacy-modal client preview) still hardcode age 30 — thread the member's DOB age (CPF off when null).
- **Invite-acceptance DOB capture UI** — the stubbed product decision (minimal DOB-confirm gate vs trimmed invitee wizard). Until built, invitees' linked incomes correctly show gross.

### Prod migration runbook for PR 5 (gated, Render shell)

**Priority:** P0 (when PR 5 lands)

1. BEFORE deploying PR 5: `node src/db/manual-migrations/0013_add_cpf_rates_version.cjs` (adds the column; the app writes it on every income save). 2. Deploy PR 5. 3. `node src/db/manual-migrations/0013_orphan_cpf_to_gross.cjs` (dry-run — review the orphan list), then `--apply`, then re-run to confirm 0. Flips subject-to-CPF incomes with no DOB'd member to gross.

### Validation, scoping, and constants module (audit PR 6)

**Priority:** P2
Enforce the zod schemas in income server actions (`.parse()` — they're currently type-only), require amount > 0, reject NaN, strip the `-?` from `moneyString`. Family-scope `familyMemberId` on income create and the DOB lookup (`src/lib/services/incomes.ts:50-52,116-145`; `src/lib/actions/income.ts:80`) — a crafted create can link a foreign family's member. Single CPF constants module with `effectiveFrom` metadata shared by the engine, display brackets, and the AI knowledge-base seed scripts, with an agreement test (the KB had correct 2026 rates while the engine didn't); derive `CPF_RATE_BRACKETS` from `CPF_RATES`; document the January rates checklist.

### Tab vs projection bonus divergence (PR 3 review, 2026-06-10)

**Priority:** P2
Three pre-existing surface disagreements the PR 3 review surfaced, left out of scope: (1) `extractCpfProjectionInputs` uses `incomes.find(...)` so the projection only reads the FIRST CPF income's bonuses per member, while the CPF tab loops all of them; (2) the projection is forward-only (skips month 0), so a one-off dated to the current or a past month of this year shows in the tab snapshot but never in the projection; (3) the recurring projection bonus scales off current gross, ignoring future raises, unlike `bonusForMonth` in the studio. Decide on one canonical bonus semantic across tab / projection / studio.

### Validate imported one-off bonus date shape (PR 3 review, 2026-06-10)

**Priority:** P3
`parseBonusGroups` trusts the one-off `date` is `YYYY-MM` (app writer guarantees it via `format(..., "yyyy-MM")`, but migrated/imported rows aren't validated). A malformed date like `2026-6` silently fails the `=== monthKey` match. Add a shape guard when ingesting external bonus data.

## Completed

### Backfill stored CPF values (audit PR 2)

**Completed:** applied to production 2026-06-10 (`src/db/manual-migrations/0012_backfill_cpf_2026.cjs`). Dry-run then `--apply` in the Render shell populated 13 NULL CPF rows; re-run confirmed 0 remaining. No senior-rate rows existed on prod, so the change was NULL→correct-value, not drift.

### Bonus parsing fixes (audit PR 3)

**Completed:** v1.0.2.0 (2026-06-10). One-off-vs-multiplier fix in `src/lib/actions/cpf.ts` (via the new tested `bonusDollarsForYear` helper, SGT-pinned), projection parser fix + one-off wiring in `src/lib/cpf-projection-calculator.ts`, CPF tab routed through `calculateCPF`. The projection now has a test file (`tests/cpf-projection-calculator.test.ts`, 8 tests) and the bonus aggregation is unit-tested via `bonusDollarsForYear` — closing the prior coverage gap.
