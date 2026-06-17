#!/usr/bin/env node
/*
 * 0013a — Add the incomes_beta.cpf_rates_version column (member+DOB policy, PR 5).
 *
 * Idempotent additive DDL. Run this in the Render shell BEFORE deploying the
 * PR 5 code — the app writes cpf_rates_version on every income create/update,
 * so the column must exist first or those writes fail.
 *
 *   node db/manual-migrations/0013_add_cpf_rates_version.cjs
 */
"use strict"
const postgres = require("postgres")

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set")
  const sql = postgres(process.env.DATABASE_URL, { max: 1 })
  try {
    await sql`ALTER TABLE incomes_beta ADD COLUMN IF NOT EXISTS cpf_rates_version varchar(20)`
    const [{ exists }] = await sql`
      select count(*) > 0 as exists
      from information_schema.columns
      where table_name = 'incomes_beta' and column_name = 'cpf_rates_version'
    `
    console.log(
      exists
        ? "OK — incomes_beta.cpf_rates_version is present."
        : "ERROR — column still missing after ALTER."
    )
  } finally {
    await sql.end()
  }
}
main().catch((e) => {
  console.error("Migration aborted:", e.message)
  process.exit(1)
})
