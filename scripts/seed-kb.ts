/**
 * Seed Knowledge Base Script
 *
 * Populates the kb_chunks table with sample financial knowledge for testing.
 *
 * Usage:
 *   npx tsx scripts/seed-kb.ts
 *
 * Requirements:
 *   - DATABASE_URL environment variable set
 *   - VOYAGE_API_KEY or OPENAI_API_KEY for embeddings
 *   - pgvector extension enabled in database
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { ingestToKnowledgeBase, listKnowledgeBaseDocs } from "../lib/vectors";

// Sample knowledge base documents
const SAMPLE_DOCUMENTS = [
  {
    docId: "cpf-basics",
    content: `
# CPF (Central Provident Fund) Basics

The Central Provident Fund (CPF) is Singapore's mandatory social security savings scheme. It helps working Singaporeans and Permanent Residents save for retirement, healthcare, and housing.

## CPF Contribution Rates

For employees aged 55 and below:
- Employee contribution: 20% of monthly wages
- Employer contribution: 17% of monthly wages
- Total: 37% of monthly wages

The contribution rates decrease for employees above 55 years old.

## CPF Account Types

### Ordinary Account (OA)
- Can be used for housing, insurance, investment, and education
- Earns 2.5% interest per annum (first $20,000 earns extra 1%)

### Special Account (SA)
- For retirement and investment in retirement-related financial products
- Earns 4% interest per annum (first $40,000 earns extra 1%)

### MediSave Account (MA)
- For hospitalization expenses and approved medical insurance
- Earns 4% interest per annum

## CPF Allocation Rates (Age 35 and below)

Based on monthly wages:
- Ordinary Account: 23% (of total contribution)
- Special Account: 6% (of total contribution)
- MediSave Account: 8% (of total contribution)
    `.trim(),
    metadata: {
      source: "cpf-official",
      category: "retirement",
      lastUpdated: "2024-01-01",
    },
  },
  {
    docId: "emergency-fund",
    content: `
# Emergency Fund Guidelines

An emergency fund is money set aside for unexpected expenses or financial emergencies. It provides a financial safety net.

## How Much to Save

Financial experts recommend:
- **Minimum**: 3-6 months of essential expenses
- **Comfortable**: 6-9 months of essential expenses
- **Conservative**: 9-12 months of essential expenses

For Foracle's safety assessment:
- Green (Safe): 9+ months of net income
- Yellow (Caution): 6-9 months of net income
- Red (At Risk): Less than 6 months of net income

## What Counts as Emergency Fund

Your emergency fund should cover:
- Housing costs (rent/mortgage)
- Utilities and bills
- Food and groceries
- Transportation
- Insurance premiums
- Minimum debt payments

## Where to Keep It

Emergency funds should be:
- Easily accessible (liquid)
- Low risk (no market exposure)
- Separate from daily spending

Good options in Singapore:
- High-yield savings accounts
- Singapore Savings Bonds (SSB)
- Fixed deposits (short-term)
    `.trim(),
    metadata: {
      source: "financial-planning",
      category: "savings",
      lastUpdated: "2024-01-15",
    },
  },
  {
    docId: "budgeting-basics",
    content: `
# Budgeting Fundamentals

A budget is a plan for how you'll spend your money. It helps you track income and expenses, and achieve financial goals.

## The 50/30/20 Rule

A popular budgeting framework:
- **50% Needs**: Essential expenses (housing, utilities, food, transportation, insurance)
- **30% Wants**: Discretionary spending (entertainment, dining out, hobbies)
- **20% Savings**: Emergency fund, retirement, investments, debt repayment

## Expense Categories

### Fixed Expenses
Expenses that stay the same each month:
- Rent or mortgage
- Insurance premiums
- Loan payments
- Subscriptions

### Variable Expenses
Expenses that change month to month:
- Groceries
- Utilities
- Transportation
- Entertainment

### Periodic Expenses
Expenses that occur occasionally:
- Annual subscriptions
- Car maintenance
- Medical checkups
- Gifts

## Budget Tracking Tips

1. Track every expense for at least one month
2. Categorize expenses consistently
3. Review and adjust monthly
4. Automate savings where possible
5. Use budget tracking apps like Foracle
    `.trim(),
    metadata: {
      source: "financial-literacy",
      category: "budgeting",
      lastUpdated: "2024-02-01",
    },
  },
];

async function main() {
  console.log("🌱 Seeding Knowledge Base...\n");

  // Check current state
  const existingDocs = await listKnowledgeBaseDocs();
  console.log(`📚 Current documents in KB: ${existingDocs.length}`);
  if (existingDocs.length > 0) {
    existingDocs.forEach((doc) => {
      console.log(`   - ${doc.docId}: ${doc.chunkCount} chunks`);
    });
    console.log("");
  }

  // Ingest documents
  for (const doc of SAMPLE_DOCUMENTS) {
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

  // Verify
  console.log("\n📊 Final state:");
  const finalDocs = await listKnowledgeBaseDocs();
  finalDocs.forEach((doc) => {
    console.log(`   - ${doc.docId}: ${doc.chunkCount} chunks`);
  });

  console.log("\n✨ Done!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
