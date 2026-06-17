/**
 * CPF constants — the single source of truth for every CPF rate, ceiling, and
 * limit in the app. The calculation engine (lib/cpf-calculator.ts), the display
 * brackets, and the AI knowledge-base seed scripts (scripts/cpf-*.ts) ALL import
 * from here. A drift between them (the engine on 2025 rates while the KB text
 * said 2026) is exactly what the CPF audit found — tests/cpf-constants-agreement
 * pins them together so it can't recur.
 *
 * ── JANUARY RATES CHECKLIST (rates change yearly) ──────────────────────────
 * When the CPF Board publishes new rates (already announced for 2027):
 *   1. Bump CPF_EFFECTIVE_FROM and CPF_RATES_VERSION below.
 *   2. Update every band in CPF_RATES and CPF_ALLOCATION_RATES.
 *   3. Update the ceilings / FRS / annual limit if they changed.
 *   4. Re-run the KB seed scripts (scripts/cpf-knowledge-2026.ts,
 *      scripts/cpf-ow-aw-knowledge.ts) to re-ingest the new figures.
 *   5. `npm test` — tests/cpf-constants-agreement.test.ts fails on any drift.
 *   6. Run the stored-CPF backfill so existing rows pick up the new rates
 *      (the cpf_rates_version column drives recompute-on-read; see PR 5).
 */

/** ISO date these rates took effect. Bump every January. */
export const CPF_EFFECTIVE_FROM = "2026-01-01"

/** Identity of the current rate set — stamped onto stored CPF rows so a future
 *  rate change can detect and recompute stale values. */
export const CPF_RATES_VERSION = "2026"

// ── Contribution rates (fractions) by age band ─────────────────────────────
// SC / PR 3rd year onwards, effective 1 Jan 2026 (cpf.gov.sg).
export const CPF_RATES = {
  "55_and_below": { employer: 0.17, employee: 0.2 },
  above_55_to_60: { employer: 0.16, employee: 0.18 },
  above_60_to_65: { employer: 0.125, employee: 0.125 },
  above_65_to_70: { employer: 0.09, employee: 0.075 },
  above_70: { employer: 0.075, employee: 0.05 }
} as const

/** Display labels, parallel keys to CPF_RATES (order = bracket display order). */
export const CPF_RATE_BAND_LABELS = {
  "55_and_below": "55 and below",
  above_55_to_60: "Above 55 to 60",
  above_60_to_65: "Above 60 to 65",
  above_65_to_70: "Above 65 to 70",
  above_70: "Above 70"
} as const

/** Age-band order for deriving the display brackets (must match getCPFBracketIndex). */
export const CPF_RATE_BAND_ORDER = [
  "55_and_below",
  "above_55_to_60",
  "above_60_to_65",
  "above_65_to_70",
  "above_70"
] as const

// ── Allocation rates (OA/SA/MA split of total CPF) by age band ─────────────
export const CPF_ALLOCATION_RATES = {
  "35_and_below": { oa: 0.6217, sa: 0.1622, ma: 0.2162 },
  above_35_to_45: { oa: 0.5676, sa: 0.2162, ma: 0.2162 },
  above_45_to_50: { oa: 0.5135, sa: 0.2703, ma: 0.2162 },
  above_50_to_55: { oa: 0.4324, sa: 0.3514, ma: 0.2162 },
  above_55_to_60: { oa: 0.4308, sa: 0.2462, ma: 0.3231 },
  above_60_to_65: { oa: 0.3404, sa: 0.1489, ma: 0.5106 },
  above_65: { oa: 0.3333, sa: 0.0909, ma: 0.5758 }
} as const

export const CPF_ALLOCATION_BAND_LABELS = {
  "35_and_below": "35 & below",
  above_35_to_45: "Above 35 to 45",
  above_45_to_50: "Above 45 to 50",
  above_50_to_55: "Above 50 to 55",
  above_55_to_60: "Above 55 to 60",
  above_60_to_65: "Above 60 to 65",
  above_65: "Above 65"
} as const

export const CPF_ALLOCATION_BAND_ORDER = [
  "35_and_below",
  "above_35_to_45",
  "above_45_to_50",
  "above_50_to_55",
  "above_55_to_60",
  "above_60_to_65",
  "above_65"
] as const

// ── Ceilings & limits ──────────────────────────────────────────────────────
/** Ordinary Wage ceiling — CPF is charged on at most this much monthly salary. */
export const OW_CEILING = 8000
export const OW_CEILING_YEAR = 2026

/** Annual salary ceiling (OW + AW). Bonuses attract CPF only on the part of
 *  this left after the year's ordinary-wage CPF. */
export const ANNUAL_WAGE_CEILING = 102000

/** CPF Annual Limit — max total (employer + employee) mandatory contributions
 *  per calendar year. Centralized here for the year-level bonus helper (PR 4). */
export const CPF_ANNUAL_LIMIT = 37740

/** Full Retirement Sum for members turning 55 in 2026 (CPF Board). */
export const FRS_2026 = 220_400

// ── Low-wage thresholds (monthly Total Wages) ──────────────────────────────
export const CPF_LOW_WAGE_NO_CPF = 50 // TW <= $50: no CPF at all
export const CPF_LOW_WAGE_NO_EMPLOYEE = 500 // TW <= $500: employer-only
export const CPF_LOW_WAGE_PHASE_IN_END = 750 // $500 < TW <= $750: employee phased in

export type CPFAgeGroup = keyof typeof CPF_RATES
