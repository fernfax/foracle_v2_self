#!/usr/bin/env node
/**
 * Enhanced CPF Knowledge Base - 2026 Updates
 *
 * Adds comprehensive CPF wage ceiling and contribution rate information
 * based on official CPF Board updates effective 1 January 2026.
 */

require("dotenv").config({ path: ".env.local" });

import { ingestToKnowledgeBase, deleteFromKnowledgeBase } from "../lib/vectors";

const CPF_DOCUMENTS = [
  {
    docId: "cpf-wage-ceiling-2026",
    content: `
# CPF Ordinary Wage Ceiling (Updated January 2026)

## What is the CPF Ordinary Wage Ceiling?

The CPF Ordinary Wage (OW) ceiling limits the amount of your monthly salary that attracts CPF contributions. Any salary above this ceiling will not have CPF contributions deducted or contributed.

## Current CPF OW Ceiling (From 1 January 2026)

**The CPF OW ceiling is $8,000 per month.**

This means:
- If you earn $8,000 or less per month, CPF is calculated on your full salary
- If you earn more than $8,000 per month, CPF is only calculated on $8,000
- Example: If you earn $10,000/month, CPF contributions are based on $8,000 only

## History of CPF OW Ceiling Increases

The OW ceiling was gradually increased from 2023 to 2026:

| Period | CPF OW Ceiling | Change |
|--------|---------------|--------|
| Jan 2016 - Aug 2023 | $6,000 | - |
| Sep 2023 - Dec 2023 | $6,300 | +$300 |
| Jan 2024 - Dec 2024 | $6,800 | +$500 |
| Jan 2025 - Dec 2025 | $7,400 | +$600 |
| From Jan 2026 | $8,000 | +$600 |

The January 2026 increase to $8,000 is the **final increase** in this series.

## CPF Annual Salary Ceiling

The CPF annual salary ceiling remains at **$102,000**. This is the maximum amount of total wages (Ordinary Wages + Additional Wages) that attracts CPF contributions in a calendar year.

## Additional Wage (AW) Ceiling

The Additional Wage ceiling is calculated as:
**AW Ceiling = $102,000 - Total Ordinary Wages subject to CPF for the year**

Additional Wages include bonuses, commissions, and other irregular payments.

## CPF Annual Limit

The CPF Annual Limit remains at **$37,740**. This is the maximum total CPF contributions (employee + employer) that can be made in a calendar year.

## Why Does This Matter?

Understanding the OW ceiling helps you:
1. Calculate your actual CPF contributions accurately
2. Plan for retirement savings (higher ceiling = more CPF savings for high earners)
3. Understand your take-home pay calculations
    `.trim(),
    metadata: {
      source: "cpf-board-official",
      category: "cpf-wages",
      lastUpdated: "2026-01-01",
      effectiveDate: "2026-01-01",
    },
  },
  {
    docId: "cpf-contribution-rates-2026",
    content: `
# CPF Contribution Rates (Updated January 2026)

## Overview

CPF contribution rates determine how much you and your employer contribute to your CPF accounts each month. The rates vary based on your age and were updated from 1 January 2026.

## Current CPF Contribution Rates (From 1 January 2026)

For Singapore Citizens and Permanent Residents (3rd year onwards) earning monthly wages above $750:

### Age 55 and Below
- **Total Contribution: 37%**
- Employer: 17%
- Employee: 20%
- No change from 2025

### Age Above 55 to 60
- **Total Contribution: 34%** (increased from 32.5%)
- Employer: 16% (+0.5%)
- Employee: 18% (+1%)

### Age Above 60 to 65
- **Total Contribution: 25%** (increased from 23.5%)
- Employer: 12.5% (+0.5%)
- Employee: 12.5% (+1%)

### Age Above 65 to 70
- **Total Contribution: 16.5%**
- Employer: 9%
- Employee: 7.5%
- No change from 2025

### Age Above 70
- **Total Contribution: 12.5%**
- Employer: 7.5%
- Employee: 5%
- No change from 2025

## Summary Table

| Age Group | Total | Employer | Employee |
|-----------|-------|----------|----------|
| 55 and below | 37% | 17% | 20% |
| Above 55 to 60 | 34% | 16% | 18% |
| Above 60 to 65 | 25% | 12.5% | 12.5% |
| Above 65 to 70 | 16.5% | 9% | 7.5% |
| Above 70 | 12.5% | 7.5% | 5% |

## Where Do the Increased Contributions Go?

For employees aged 55 to 65, the increased CPF contributions (the +1.5% total increase) are:
- Allocated to the **Retirement Account (RA)** up to the Full Retirement Sum (FRS)
- If the FRS is already met, contributions go to the **Ordinary Account (OA)**

This helps senior workers save more for retirement.

## Low Wage Earners ($500 to $750/month)

For employees earning between $500 and $750 per month, the employee contribution rates continue to be phased in gradually.

## Singapore Permanent Residents (SPRs)

First and second year SPRs have graduated (lower) contribution rates. There are no changes to these graduated rates in 2026.
    `.trim(),
    metadata: {
      source: "cpf-board-official",
      category: "cpf-rates",
      lastUpdated: "2026-01-01",
      effectiveDate: "2026-01-01",
    },
  },
  {
    docId: "cpf-allocation-rates-2026",
    content: `
# CPF Allocation Rates (How CPF is Split Between Accounts)

## Overview

When CPF contributions are made, they are allocated (split) into three accounts: Ordinary Account (OA), Special Account (SA), and MediSave Account (MA). The allocation rates vary by age.

## CPF Allocation Rates by Age

### Age 35 and Below
| Account | Allocation |
|---------|------------|
| Ordinary Account (OA) | 23% of wages |
| Special Account (SA) | 6% of wages |
| MediSave Account (MA) | 8% of wages |
| **Total** | **37%** |

### Age Above 35 to 45
| Account | Allocation |
|---------|------------|
| Ordinary Account (OA) | 21% of wages |
| Special Account (SA) | 7% of wages |
| MediSave Account (MA) | 9% of wages |
| **Total** | **37%** |

### Age Above 45 to 50
| Account | Allocation |
|---------|------------|
| Ordinary Account (OA) | 19% of wages |
| Special Account (SA) | 8% of wages |
| MediSave Account (MA) | 10% of wages |
| **Total** | **37%** |

### Age Above 50 to 55
| Account | Allocation |
|---------|------------|
| Ordinary Account (OA) | 15% of wages |
| Special Account (SA) | 11.5% of wages |
| MediSave Account (MA) | 10.5% of wages |
| **Total** | **37%** |

### Age Above 55 to 60
| Account | Allocation |
|---------|------------|
| Ordinary Account (OA) | 12% of wages |
| Special Account (SA) | 3.5% of wages |
| MediSave Account (MA) | 10.5% of wages |
| Retirement Account (RA)* | 8% of wages |
| **Total** | **34%** |

### Age Above 60 to 65
| Account | Allocation |
|---------|------------|
| Ordinary Account (OA) | 3.5% of wages |
| Special Account (SA) | 2.5% of wages |
| MediSave Account (MA) | 10.5% of wages |
| Retirement Account (RA)* | 8.5% of wages |
| **Total** | **25%** |

*Note: RA allocation applies only until Full Retirement Sum is reached. Excess goes to OA.

## What Each Account Is For

### Ordinary Account (OA)
- Housing (HDB flat purchase, mortgage payments)
- Insurance
- Investment
- Education

**Interest Rate: 2.5% per annum** (first $20,000 earns extra 1%)

### Special Account (SA)
- Retirement savings
- Retirement-related investments

**Interest Rate: 4% per annum** (first $40,000 earns extra 1%)

### MediSave Account (MA)
- Hospitalization expenses
- Approved medical insurance (MediShield Life, Integrated Shield Plans)
- Outpatient treatments for certain conditions

**Interest Rate: 4% per annum**

### Retirement Account (RA)
- Created at age 55 by combining OA and SA savings
- Provides monthly retirement payouts through CPF LIFE or Retirement Sum Scheme

**Interest Rate: Up to 6% per annum** (includes extra interest)
    `.trim(),
    metadata: {
      source: "cpf-board-official",
      category: "cpf-allocation",
      lastUpdated: "2026-01-01",
    },
  },
];

async function main() {
  console.log("🏦 Updating CPF Knowledge Base with 2026 information...\n");

  // Delete old cpf-basics document (we're replacing it with more detailed docs)
  console.log("🗑️  Removing outdated cpf-basics document...");
  await deleteFromKnowledgeBase("cpf-basics");

  // Ingest new documents
  for (const doc of CPF_DOCUMENTS) {
    console.log(`📄 Ingesting: ${doc.docId}`);
    try {
      const result = await ingestToKnowledgeBase(doc);
      console.log(
        `   ✅ Created ${result.chunksCreated} chunks, ${result.embeddingsGenerated} embeddings`
      );
    } catch (error) {
      console.error(`   ❌ Failed:`, error);
    }
  }

  console.log("\n✨ CPF Knowledge Base updated!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Update failed:", error);
  process.exit(1);
});
