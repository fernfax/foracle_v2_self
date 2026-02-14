#!/usr/bin/env node
/**
 * CPF Ordinary Wages vs Additional Wages Knowledge
 *
 * Explains the difference between OW and AW, and how to calculate
 * the Additional Wage ceiling for CPF contributions.
 */

require("dotenv").config({ path: ".env.local" });

import { ingestToKnowledgeBase } from "../lib/vectors";

const OW_AW_DOCUMENT = {
  docId: "cpf-ow-aw-ceiling",
  content: `
# CPF Ordinary Wages (OW) vs Additional Wages (AW)

## What are Ordinary Wages (OW)?

Ordinary Wages are your regular monthly earnings. For wages to be classified as Ordinary Wages (OW) for a month, they must satisfy **both** conditions:

1. The wages are due or granted wholly or exclusively in respect of your employment during that month
2. The wages for that month are payable by the 14th of the following month

**Examples of Ordinary Wages:**
- Monthly basic salary
- Monthly fixed allowances
- Monthly overtime pay (if paid by 14th of next month)

## What are Additional Wages (AW)?

Additional Wages are wages that are **not classified as Ordinary Wages**. These are typically irregular or annual payments.

**Examples of Additional Wages:**
- Annual performance bonus
- 13th month bonus (AWS - Annual Wage Supplement)
- Annual variable component
- Leave encashment payments
- One-time payments or incentives
- Commissions paid annually

## The Payable Date Rule

The "payable date" refers to the date when the company is contractually obligated to pay the employee. This is important for determining whether wages are OW or AW.

For example:
- If your December bonus is contractually payable on 15th January, it would be classified as AW (not OW) because it's not payable by 14th of the following month
- If your monthly salary for January is payable by 7th February, it's classified as OW

## What is the Additional Wage (AW) Ceiling?

The AW ceiling limits the amount of Additional Wages that attract CPF contributions. It ensures that high earners don't contribute excessively to CPF through bonus payments.

### AW Ceiling Formula

**AW Ceiling = $102,000 - Total Ordinary Wages subject to CPF for the year**

The AW ceiling is calculated:
- Per employer (if you have multiple employers, each has separate AW ceiling)
- Per calendar year

### Examples of AW Ceiling Calculation

**Example 1: Regular employee earning $6,000/month**
- Total OW for year: $6,000 × 12 = $72,000
- AW Ceiling: $102,000 - $72,000 = **$30,000**
- If annual bonus is $15,000, full amount attracts CPF
- If annual bonus is $40,000, only $30,000 attracts CPF

**Example 2: High earner at $8,000/month (at OW ceiling)**
- Total OW for year: $8,000 × 12 = $96,000
- AW Ceiling: $102,000 - $96,000 = **$6,000**
- If annual bonus is $20,000, only $6,000 attracts CPF

**Example 3: Employee earning $10,000/month**
- CPF is only calculated on $8,000/month (OW ceiling)
- Total OW subject to CPF: $8,000 × 12 = $96,000
- AW Ceiling: $102,000 - $96,000 = **$6,000**

**Example 4: Part-year employment (joined in July)**
- Monthly salary: $7,000
- Worked 6 months: Total OW = $7,000 × 6 = $42,000
- AW Ceiling: $102,000 - $42,000 = **$60,000**
- Larger AW ceiling because of part-year employment

## Why Does the AW Ceiling Matter?

Understanding the AW ceiling helps you:

1. **Estimate your CPF contributions on bonuses** - Know how much of your bonus will have CPF deducted
2. **Plan your cash flow** - Higher bonuses may have less CPF deduction than expected
3. **Understand your total CPF savings** - Important for housing and retirement planning
4. **Compare job offers** - Consider how bonus structures affect your CPF

## Key Numbers to Remember

| Item | Amount |
|------|--------|
| CPF Annual Salary Ceiling | $102,000 |
| CPF OW Ceiling (from Jan 2026) | $8,000/month |
| Maximum OW per year at ceiling | $96,000 |
| Minimum AW Ceiling (at OW ceiling) | $6,000 |
| CPF Annual Limit | $37,740 |

## Multiple Employers

If you work for multiple employers in the same year:
- Each employer calculates your AW ceiling separately
- Your OW from one employer doesn't affect the AW ceiling at another employer
- However, the total CPF contributions across all employers are still subject to the CPF Annual Limit of $37,740
  `.trim(),
  metadata: {
    source: "cpf-board-official",
    category: "cpf-wages",
    lastUpdated: "2026-01-01",
  },
};

async function main() {
  console.log("📊 Adding OW vs AW Knowledge to CPF Knowledge Base...\n");

  console.log(`📄 Ingesting: ${OW_AW_DOCUMENT.docId}`);
  try {
    const result = await ingestToKnowledgeBase(OW_AW_DOCUMENT);
    console.log(
      `   ✅ Created ${result.chunksCreated} chunks, ${result.embeddingsGenerated} embeddings`
    );
  } catch (error) {
    console.error(`   ❌ Failed:`, error);
  }

  console.log("\n✨ Done!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Update failed:", error);
  process.exit(1);
});
