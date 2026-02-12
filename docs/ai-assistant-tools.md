# Foracle AI Assistant Tools

This document describes the tools available to the Foracle AI Assistant. These tools allow the assistant to fetch and analyze your financial data to answer questions about your finances.

---

## Overview

The AI Assistant has access to **8 tools** that help it understand and analyze your financial situation:

| Tool | Purpose | Data Source |
|------|---------|-------------|
| `get_month_summary` | Overall financial snapshot for a month | `incomes`, `expenses`, `daily_expenses` |
| `get_remaining_budget` | Budget availability by category | `expenses`, `expense_categories`, `daily_expenses` |
| `get_upcoming_expenses` | Future planned expenses | `expenses` |
| `compute_trip_budget` | Affordability check for trips/purchases | `incomes`, `expenses`, `daily_expenses` |
| `get_summary_range` | Financial summary over a date range | `incomes`, `daily_expenses` |
| `get_income_summary` | Detailed income and CPF breakdown | `incomes`, `family_members` |
| `get_expenses_summary` | Detailed expense breakdown | `expenses` |
| `get_family_summary` | Household structure and income inclusion | `family_members`, `incomes` |

---

## Tool Details

### 1. `get_month_summary`

**What it does:**
Gives you a complete financial picture for any month — how much you earned, how much you budgeted to spend, how much you actually spent, and whether you're on track.

**When the assistant uses it:**
- "How am I doing financially this month?"
- "What's my financial status for February?"
- "Am I saving money this month?"

**What it returns:**
- Total income for the month
- Total budgeted expenses
- Actual spending so far
- Remaining budget
- Net surplus (income minus expenses)
- Whether you're spending too fast, too slow, or on track

**Data Sources:**
| Table | What it provides |
|-------|------------------|
| `incomes` | Monthly income calculation |
| `expenses` | Budgeted recurring expenses |
| `daily_expenses` | Actual spending tracked |
| `expense_categories` | Budget limits per category |

**Related App Pages:** `/overview`, `/budget`

---

### 2. `get_remaining_budget`

**What it does:**
Shows how much budget you have left in each spending category. Useful for knowing if you can afford something in a specific category.

**When the assistant uses it:**
- "How much can I still spend on dining out?"
- "What's left in my entertainment budget?"
- "Which categories am I overspending in?"

**What it returns:**
- Each budget category with:
  - Original budget amount
  - Amount spent so far
  - Remaining balance
  - Percentage used

**Data Sources:**
| Table | What it provides |
|-------|------------------|
| `expenses` | Recurring expenses per category |
| `expense_categories` | Budget limits and category definitions |
| `daily_expenses` | Actual spending per category |

**Related App Pages:** `/budget`

---

### 3. `get_upcoming_expenses`

**What it does:**
Lists all your recurring bills and expenses that will come up within a date range. Helps you plan for upcoming financial obligations.

**When the assistant uses it:**
- "What bills do I have coming up next month?"
- "What expenses should I expect in March?"
- "How much will I need to pay for recurring expenses?"

**What it returns:**
- List of upcoming expenses with:
  - Expense name
  - Category
  - Amount
  - Frequency (monthly, yearly, etc.)
  - When it's due

**Data Sources:**
| Table | What it provides |
|-------|------------------|
| `expenses` | All recurring expense records |

**Related App Pages:** `/expenses`

---

### 4. `compute_trip_budget`

**What it does:**
Checks if you can afford a trip or large purchase by looking at your income and fixed expenses. If you can't afford it now, it tells you how long you'd need to save.

**When the assistant uses it:**
- "Can I afford a $2,000 trip to Japan?"
- "I want to buy a $500 gadget — is that doable?"
- "How long would I need to save for a $5,000 vacation?"

**What it returns:**
- Whether you can afford it
- Available funds after fixed expenses
- If not affordable: how much you're short, and how many months to save
- Recommendation on how to proceed

**Data Sources:**
| Table | What it provides |
|-------|------------------|
| `incomes` | Monthly income to calculate disposable funds |
| `expenses` | Fixed/recurring expenses |
| `daily_expenses` | Current month spending |

**Related App Pages:** `/overview`, `/budget`

---

### 5. `get_summary_range`

**What it does:**
Provides a financial summary over a longer period (e.g., 3 months, 6 months, a year). Shows totals and monthly averages for income and expenses.

**When the assistant uses it:**
- "How much did I earn this year so far?"
- "What was my average monthly spending from January to June?"
- "How much have I saved in the last 3 months?"

**What it returns:**
- Period covered
- Total income
- Total expenses
- Net savings
- Average monthly income
- Average monthly expenses

**Data Sources:**
| Table | What it provides |
|-------|------------------|
| `incomes` | Income records across the date range |
| `daily_expenses` | Spending records across the date range |

**Related App Pages:** `/overview`

---

### 6. `get_income_summary`

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

### 7. `get_expenses_summary`

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

**Data Sources:**
| Table | What it provides |
|-------|------------------|
| `expenses` | All recurring expense records |

**Related App Pages:** `/expenses`

---

### 8. `get_family_summary`

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

## Database Tables Reference

| Table | Description | Key Fields |
|-------|-------------|------------|
| `incomes` | All income sources | `name`, `amount`, `frequency`, `family_member_id`, `subject_to_cpf`, `future_milestones` |
| `expenses` | Recurring expenses | `name`, `amount`, `frequency`, `category`, `is_active` |
| `daily_expenses` | Day-to-day spending | `amount`, `category`, `date`, `description` |
| `expense_categories` | Budget categories | `name`, `monthly_budget`, `color` |
| `family_members` | Household members | `name`, `relationship`, `is_contributing`, `date_of_birth` |

---

## How Tools Work Together

The assistant often combines multiple tools to answer complex questions:

**Example: "What's our household income this month?"**
1. First calls `get_family_summary` to understand who's in the household
2. Then calls `get_income_summary` to get the actual income numbers
3. Combines the information to explain total household income and who contributes

**Example: "Can we afford a vacation?"**
1. Calls `get_income_summary` to understand monthly income
2. Calls `get_expenses_summary` to understand fixed costs
3. Calls `compute_trip_budget` to assess affordability

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
