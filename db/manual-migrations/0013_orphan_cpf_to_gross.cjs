#!/usr/bin/env node
/*
 * 0013b — Flip orphan CPF rows to gross (member+DOB policy, audit PR 5).
 *
 * Under the policy, an income that is subject_to_cpf but has NO linked family
 * member, OR a member with no date_of_birth, can no longer compute CPF. This
 * nulls those rows' stored CPF fields (employee / employer / net_take_home /
 * cpf_rates_version) so they display as gross. subject_to_cpf is LEFT as-is —
 * preserving the user's intent, so CPF re-computes automatically once a DOB'd
 * member is linked. User-entered OA/SA/MA balances are left untouched.
 *
 * Run AFTER the PR 5 code is deployed (so the app stops creating new orphans
 * with CPF). DRY-RUN by default; --apply writes in one transaction. Idempotent.
 *
 *   node db/manual-migrations/0013_orphan_cpf_to_gross.cjs            # dry-run
 *   node db/manual-migrations/0013_orphan_cpf_to_gross.cjs --apply    # write
 */
"use strict"
const postgres = require("postgres")

async function main() {
  const APPLY = process.argv.includes("--apply")
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set")
  console.log(
    `CPF orphan → gross — ${APPLY ? "APPLY (writing)" : "DRY RUN (no writes)"}\n`
  )

  const sql = postgres(process.env.DATABASE_URL, { max: 1 })
  try {
    const rows = await sql`
      select
        i.id,
        i.amount::text                    as amount,
        i.family_member_id                as member_id,
        fm.name                           as member_name,
        i.employee_cpf_contribution::text as ee,
        i.net_take_home::text             as net
      from incomes_beta i
      left join family_members fm on fm.id = i.family_member_id
      where i.subject_to_cpf = true
        and (i.family_member_id is null or fm.date_of_birth is null)
        and (
          i.employee_cpf_contribution is not null
          or i.employer_cpf_contribution is not null
          or i.net_take_home is not null
          or i.cpf_rates_version is not null
        )
    `

    console.log(
      `Orphan CPF rows (subject_to_cpf, no member / no DOB, with stored CPF): ${rows.length}\n`
    )
    const CAP = 100
    rows
      .slice(0, CAP)
      .forEach((r) =>
        console.log(
          `  ${r.id}  $${r.amount}  member=${r.member_name ? `${r.member_name} (no DOB)` : "none"}  ` +
            `EE ${r.ee ?? "—"}→—  net ${r.net ?? "—"}→gross`
        )
      )
    if (rows.length > CAP) console.log(`  …and ${rows.length - CAP} more`)
    console.log("")

    if (!APPLY) {
      console.log(
        rows.length === 0
          ? "Nothing to do — no orphan CPF rows."
          : `DRY RUN complete. Re-run with --apply to flip these ${rows.length} row(s) to gross.`
      )
      return
    }
    if (rows.length === 0) {
      console.log("Nothing to write.")
      return
    }

    await sql.begin(async (tx) => {
      for (const r of rows) {
        await tx`
          update incomes_beta
             set employee_cpf_contribution = null,
                 employer_cpf_contribution = null,
                 net_take_home             = null,
                 cpf_rates_version         = null,
                 updated_at                = now()
           where id = ${r.id}
        `
      }
    })
    console.log(`APPLIED — ${rows.length} row(s) flipped to gross.`)
    console.log("Re-run without --apply to confirm 0 remaining.")
  } finally {
    await sql.end()
  }
}

main().catch((e) => {
  console.error("\nMigration aborted:", e.message)
  process.exit(1)
})
