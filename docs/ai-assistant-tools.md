# Foracle AI Assistant Tools

This document describes the tools available to the Foracle AI Assistant. These tools allow the assistant to fetch and analyze your financial data to answer questions about your finances.

---

## Overview

The AI Assistant has access to **4 tools** that help it understand and analyze your financial situation:

| Tool | Purpose | Data Source |
|------|---------|-------------|
| `get_income_summary` | Detailed income and CPF breakdown | `incomes`, `family_members` |
| `get_expenses_summary` | Detailed expense breakdown | `expenses`, `expense_categories` |
| `get_family_summary` | Household structure and income inclusion | `family_members`, `incomes` |
| `get_balance_summary` | Projected savings over a date range | `current_holdings`, `incomes`, `expenses` |

---

## Tool Details

### 1. `get_income_summary`

**What it does:**
Gives a detailed breakdown of all your income for a specific month. In Singapore, this includes CPF (Central Provident Fund) calculations — how much goes to your retirement accounts.

**When the assistant uses it:**
- "What's my take-home pay this month?"
- "How much CPF am I contributing?"
- "Break down my income sources"
- "What's my gross vs net salary?"

**What it returns:**
- Total gross income (before deductions)
- Total net income (take-home pay)
- CPF breakdown:
  - Employee contribution (deducted from your salary)
  - Employer contribution (paid by your company)
  - How it's split between OA, SA, and MA accounts
- Each income source with:
  - Name (e.g., "Evan Lee's Salary")
  - Gross and net amounts
  - CPF details
  - Which family member it belongs to

**Data Sources:**
| Table | What it provides |
|-------|------------------|
| `incomes` | All income records with CPF details |
| `family_members` | Links income to family members |

**Related App Pages:** `/user` (Income tab)

---

### 2. `get_expenses_summary`

**What it does:**
Provides a detailed breakdown of all your recurring expenses for a specific month. Shows what you're spending money on and which categories cost the most.

**When the assistant uses it:**
- "What are my monthly expenses?"
- "Break down my spending by category"
- "What are my biggest recurring costs?"
- "How much do I spend on insurance?"

**What it returns:**
- Total monthly expenses
- Number of expense items
- Category breakdown (sorted by amount):
  - Category name
  - Monthly amount
  - Number of expenses in category
  - Percentage of total spending
- Full list of expenses with:
  - Name
  - Category
  - Amount
  - Frequency
  - Type (recurring, one-time, etc.)
- Available expense categories with:
  - Name and icon
  - Whether tracked in budget

**Data Sources:**
| Table | What it provides |
|-------|------------------|
| `expenses` | All recurring expense records |
| `expense_categories` | User's expense categories for context |

**Related App Pages:** `/expenses`

---

### 3. `get_family_summary`

**What it does:**
Shows your household structure — who's in your family and whose income counts toward your household total. This is important for understanding combined household income.

**When the assistant uses it:**
- "What's our household income?"
- "How much does my spouse earn?"
- "Who's included in our family finances?"
- "Why did our household income change?"

**What it returns:**
- List of family members with:
  - Name
  - Relationship (spouse, child, etc.)
  - Whether their income is included in household totals
  - Their income sources
- Included members (contribute to household income)
- Excluded members (tracked but not counted in totals)
- Income change signals:
  - Upcoming salary changes (from `future_milestones`)
  - Detected income variations
- Notes explaining any assumptions

**Data Sources:**
| Table | What it provides |
|-------|------------------|
| `family_members` | Household member records |
| `incomes` | Income records linked to family members |

**Related App Pages:** `/user` (Family Members tab)

---

### 4. `get_balance_summary`

**What it does:**
Projects your cumulative savings/balance over a date range. Shows month-by-month income, expenses, net savings, and running balance. Starting balance comes from your current bank holdings. Supports "what-if" scenarios to see how hypothetical expenses or income would affect your balance.

**When the assistant uses it:**
- "How much will I have saved by December?"
- "What will my balance be in 3 months?"
- "How much will I save this year?"
- "If I spend $5,000 on a trip in June, how does that affect my savings?"
- "Can I afford a $3,000 purchase next month?"

**What it returns:**
- Starting balance (from current holdings)
- Monthly projections with:
  - Income for the month
  - Expenses for the month
  - Net balance (income - expenses)
  - Cumulative balance (running total)
- Period totals:
  - Total income
  - Total expenses
  - Net savings
- Final projected balance
- Hypothetical impact (if what-if parameters provided):
  - Balance with vs without the hypothetical
  - Percentage of monthly balance affected

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `fromMonth` | Yes | Start month (YYYY-MM format) |
| `toMonth` | Yes | End month (YYYY-MM format) |
| `hypotheticalExpense` | No | One-time expense to simulate |
| `hypotheticalExpenseMonth` | No | Month for the hypothetical expense |
| `hypotheticalIncome` | No | One-time income to simulate |
| `hypotheticalIncomeMonth` | No | Month for the hypothetical income |

**Data Sources:**
| Table | What it provides |
|-------|------------------|
| `current_holdings` | Starting balance from bank accounts |
| `incomes` | All active income sources |
| `expenses` | All active expense records |

**Related App Pages:** `/expenses` (Monthly Balance Projection graph)

---

## Database Tables Reference

| Table | Description | Key Fields |
|-------|-------------|------------|
| `incomes` | All income sources | `name`, `amount`, `frequency`, `family_member_id`, `subject_to_cpf`, `future_milestones` |
| `expenses` | Recurring expenses | `name`, `amount`, `frequency`, `category`, `is_active` |
| `expense_categories` | Expense categories | `name`, `icon`, `is_default`, `tracked_in_budget` |
| `family_members` | Household members | `name`, `relationship`, `is_contributing`, `date_of_birth` |
| `current_holdings` | Bank account balances | `bank_name`, `holding_amount`, `family_member_id` |

---

## How Tools Work Together

The assistant often combines multiple tools to answer complex questions:

**Example: "What's our household income this month?"**
1. First calls `get_family_summary` to understand who's in the household
2. Then calls `get_income_summary` to get the actual income numbers
3. Combines the information to explain total household income and who contributes

**Example: "How much will I save this year?"**
1. Calls `get_balance_summary` with the date range for the year
2. Returns the projected final balance and total net savings

**Example: "Can I afford a $5,000 trip to Japan in June?"**
1. Calls `get_balance_summary` with hypothetical expense of $5,000 in June
2. Shows the impact on savings and whether the balance stays positive
3. Provides the percentage of monthly balance the trip would consume

**Example: "What's my monthly cash flow?"**
1. Calls `get_income_summary` to understand monthly income
2. Calls `get_expenses_summary` to understand fixed costs
3. Calculates the difference to show disposable income

---

## Data Privacy

- All tools only access YOUR data — never other users' data
- Data is fetched in real-time from your Foracle account
- The AI doesn't store or remember data between conversations
- Sensitive details (like account numbers) are never included in responses

---

## Singapore-Specific Features

Several tools are tailored for Singapore's financial system:

- **CPF Calculations**: Income tools understand Singapore's CPF contribution rates and how they're allocated to OA (Ordinary Account), SA (Special Account), and MA (Medisave Account)
- **OW Ceiling**: The $8,000 Ordinary Wage ceiling for CPF is respected in calculations
- **Currency**: All amounts are in Singapore Dollars (SGD)
