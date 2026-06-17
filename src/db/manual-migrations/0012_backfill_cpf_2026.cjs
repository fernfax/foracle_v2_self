#!/usr/bin/env node
/*
 * 0012 — Backfill stored CPF on incomes_beta to the 1 Jan 2026 rates +
 * statutory rounding (audit PR 2; pairs with the v1.0.1.0 engine change).
 *
 * WHY: incomes_beta stores employee_cpf_contribution / employer_cpf_contribution
 * / net_take_home at write time and never recomputes them. v1.0.1.0 changed the
 * senior age-band rates (56–65) and switched to statutory rounding, so every
 * stored row written before that deploy is stale until its income is re-saved.
 *
 * SCOPE (decided 2026-06-10): only backfill rows that are subject_to_cpf AND
 * have a linked family member WITH a date_of_birth. Rows with no member / no DOB
 * are counted and listed but NEVER written — they're handled by the member+DOB
 * policy migration (audit PR 5). There is deliberately no age-30 fallback here.
 *
 * SAFETY:
 *   - DRY-RUN by default: prints exactly what would change, writes nothing.
 *   - Pass --apply to write (wrapped in a single transaction).
 *   - The embedded CPF engine self-checks against 6 known vectors before it is
 *     allowed to touch data; a mismatch aborts.
 *   - Idempotent: re-running after --apply reports 0 changes.
 *
 * RUN (Render shell, prod) or locally with a dev DATABASE_URL:
 *   node db/manual-migrations/0012_backfill_cpf_2026.cjs            # dry-run
 *   node db/manual-migrations/0012_backfill_cpf_2026.cjs --apply    # write
 */
"use strict"

const postgres = require("postgres")

// ===========================================================================
// Embedded CPF engine — a point-in-time copy of lib/cpf-calculator.ts as of
// v1.0.1.0. Kept inline (not imported) so this migration is self-contained and
// immune to future engine drift: it always writes the values v1.0.1.0 produced.
// ===========================================================================
const OW_CEILING = 8000
const CPF_LOW_WAGE_NO_CPF = 50
const CPF_LOW_WAGE_NO_EMPLOYEE = 500
const CPF_LOW_WAGE_PHASE_IN_END = 750

const CPF_RATES = {
  "55_and_below": { employer: 0.17, employee: 0.2 },
  above_55_to_60: { employer: 0.16, employee: 0.18 },
  above_60_to_65: { employer: 0.125, employee: 0.125 },
  above_65_to_70: { employer: 0.09, employee: 0.075 },
  above_70: { employer: 0.075, employee: 0.05 }
}

function getCPFRatesByAge(age) {
  if (age <= 55) return CPF_RATES["55_and_below"]
  if (age <= 60) return CPF_RATES["above_55_to_60"]
  if (age <= 65) return CPF_RATES["above_60_to_65"]
  if (age <= 70) return CPF_RATES["above_65_to_70"]
  return CPF_RATES["above_70"]
}

function computeCpfContributions(cpfApplicableAmount, rates) {
  if (cpfApplicableAmount <= CPF_LOW_WAGE_NO_CPF)
    return { employee: 0, employer: 0 }
  const employer = cpfApplicableAmount * rates.employer
  let employee
  if (cpfApplicableAmount <= CPF_LOW_WAGE_NO_EMPLOYEE) {
    employee = 0
  } else if (cpfApplicableAmount <= CPF_LOW_WAGE_PHASE_IN_END) {
    employee =
      rates.employee * 3 * (cpfApplicableAmount - CPF_LOW_WAGE_NO_EMPLOYEE)
  } else {
    employee = cpfApplicableAmount * rates.employee
  }
  return { employee, employer }
}

// Statutory rounding: total -> nearest dollar (50c up), employee cents dropped,
// employer = total - employee. 1e-9 epsilon absorbs IEEE-754 dust.
function calculateCPF(grossAmount, age) {
  const rates = getCPFRatesByAge(age)
  const cpfApplicableAmount = Math.min(grossAmount, OW_CEILING)
  const { employee: employeeRaw, employer: employerRaw } =
    computeCpfContributions(cpfApplicableAmount, rates)
  const totalCpfContribution = Math.round(employeeRaw + employerRaw + 1e-9)
  const employeeCpfContribution = Math.floor(employeeRaw + 1e-9)
  const employerCpfContribution = totalCpfContribution - employeeCpfContribution
  const netTakeHome =
    Math.round((grossAmount - employeeCpfContribution) * 100) / 100
  return { employeeCpfContribution, employerCpfContribution, netTakeHome }
}

// Mirrors lib/services/incomes.ts calculateAge (and uses new Date(dobStr) the
// same way the app does, so backfilled ages match what the app would compute).
function calculateAge(dob) {
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

// ===========================================================================
// Self-check — abort before any DB work if the embedded engine drifted.
// Vectors mirror tests/cpf-calculator.test.ts (1 Jan 2026 + statutory rounding).
// ===========================================================================
function selfCheck() {
  const vectors = [
    [5000, 35, 1000, 850], // baseline <=55
    [8000, 40, 1600, 1360], // OW ceiling
    [4000, 58, 720, 640], // 56–60 band (2026: 18% / 16%)
    [7000, 63, 875, 875], // 61–65 band (2026: 12.5% / 12.5%)
    [2500, 73, 125, 188], // statutory rounding (312.50 -> 313, ER 188)
    [700, 68, 45, 63] // low-wage phase-in + float-dust floor
  ]
  for (const [gross, age, ee, er] of vectors) {
    const r = calculateCPF(gross, age)
    if (r.employeeCpfContribution !== ee || r.employerCpfContribution !== er) {
      throw new Error(
        `Engine self-check FAILED for ($${gross}, age ${age}): ` +
          `got EE ${r.employeeCpfContribution}/ER ${r.employerCpfContribution}, ` +
          `expected EE ${ee}/ER ${er}. Refusing to backfill.`
      )
    }
  }
}

// ===========================================================================
const fmtMoney = (n) => (n === null || n === undefined ? "—" : `$${n}`)
const num = (s) => (s === null || s === undefined ? null : Number(s))

async function main() {
  const APPLY = process.argv.includes("--apply")
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set")
  }

  selfCheck()
  console.log(
    `CPF 2026 backfill — ${APPLY ? "APPLY (writing)" : "DRY RUN (no writes)"}`
  )
  console.log("Engine self-check: PASS (6/6 vectors)\n")

  const sql = postgres(process.env.DATABASE_URL, { max: 1 })
  try {
    const rows = await sql`
      select
        i.id,
        i.amount::text                       as amount,
        i.employee_cpf_contribution::text    as ee,
        i.employer_cpf_contribution::text    as er,
        i.net_take_home::text                as net,
        i.family_member_id                   as member_id,
        fm.name                              as member_name,
        fm.date_of_birth::text               as dob
      from incomes_beta i
      left join family_members fm on fm.id = i.family_member_id
      where i.subject_to_cpf = true
    `

    const orphans = []
    const changes = []
    let unchanged = 0

    for (const r of rows) {
      if (!r.member_id || !r.dob) {
        orphans.push(r)
        continue
      }
      const age = calculateAge(new Date(r.dob))
      const gross = Number(r.amount)
      const cpf = calculateCPF(gross, age)
      const oldEe = num(r.ee)
      const oldEr = num(r.er)
      const oldNet = num(r.net)
      if (
        oldEe === cpf.employeeCpfContribution &&
        oldEr === cpf.employerCpfContribution &&
        oldNet === cpf.netTakeHome
      ) {
        unchanged++
        continue
      }
      changes.push({
        id: r.id,
        name: r.member_name,
        gross,
        age,
        oldEe,
        oldEr,
        oldNet,
        newEe: cpf.employeeCpfContribution,
        newEr: cpf.employerCpfContribution,
        newNet: cpf.netTakeHome,
        rateAffected: age >= 56 && age <= 65 // bands that changed in 2026
      })
    }

    const rateChanges = changes.filter((c) => c.rateAffected)
    const roundingOnly = changes.filter((c) => !c.rateAffected)
    const maxEeDelta = changes.reduce(
      (m, c) => Math.max(m, Math.abs((c.newEe ?? 0) - (c.oldEe ?? 0))),
      0
    )

    console.log(`incomes_beta rows with subject_to_cpf = true: ${rows.length}`)
    console.log(
      `  backfillable (linked member + DOB): ${rows.length - orphans.length}`
    )
    console.log(
      `    would change:    ${changes.length}  (age 56–65 rate change: ${rateChanges.length} | rounding-only: ${roundingOnly.length})`
    )
    console.log(`    already correct: ${unchanged}`)
    console.log(
      `  skipped — no member / no DOB: ${orphans.length}  (left for member+DOB policy migration, audit PR 5)`
    )
    console.log(`  largest employee delta: ${fmtMoney(maxEeDelta)}\n`)

    const CAP = 100
    const dump = (title, list, render) => {
      if (list.length === 0) return
      console.log(title)
      list.slice(0, CAP).forEach((x) => console.log("  " + render(x)))
      if (list.length > CAP) console.log(`  …and ${list.length - CAP} more`)
      console.log("")
    }

    dump(
      `Senior rows (age 56–65) that change — rate-driven:`,
      rateChanges,
      (c) =>
        `${c.id}  ${c.name}  $${c.gross}  age ${c.age}  ` +
        `EE ${fmtMoney(c.oldEe)}→${fmtMoney(c.newEe)}  ` +
        `ER ${fmtMoney(c.oldEr)}→${fmtMoney(c.newEr)}  ` +
        `net ${fmtMoney(c.oldNet)}→${fmtMoney(c.newNet)}`
    )
    dump(
      `Rounding-only changes (≤$1, ages ≤55 / 66+):`,
      roundingOnly,
      (c) =>
        `${c.id}  ${c.name}  $${c.gross}  age ${c.age}  ` +
        `EE ${fmtMoney(c.oldEe)}→${fmtMoney(c.newEe)}  ` +
        `ER ${fmtMoney(c.oldEr)}→${fmtMoney(c.newEr)}`
    )
    dump(
      `Skipped orphan rows (subject_to_cpf, no member/DOB) — NOT written:`,
      orphans,
      (r) =>
        `${r.id}  $${r.amount}  member=${r.member_name ? `${r.member_name} (no DOB)` : "none"}`
    )

    if (!APPLY) {
      console.log(
        changes.length === 0
          ? "Nothing to do — all backfillable rows already match v1.0.1.0."
          : `DRY RUN complete. Re-run with --apply to write these ${changes.length} change(s).`
      )
      return
    }

    if (changes.length === 0) {
      console.log("Nothing to write — all backfillable rows already match.")
      return
    }

    // Sets updated_at=now() to mirror how the app writes CPF (the stored values
    // genuinely changed). One transaction: all-or-nothing.
    await sql.begin(async (tx) => {
      for (const c of changes) {
        await tx`
          update incomes_beta
             set employee_cpf_contribution = ${c.newEe},
                 employer_cpf_contribution = ${c.newEr},
                 net_take_home             = ${c.newNet},
                 updated_at                = now()
           where id = ${c.id}
        `
      }
    })

    console.log(`APPLIED ${changes.length} update(s) in one transaction.`)
    console.log("Re-run without --apply to confirm 0 remaining changes.")
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error("\nBackfill aborted:", err.message)
  process.exit(1)
})
