# Foracle AI Assistant Tools

This document describes the tools available to the Foracle AI Assistant. These tools allow the assistant to fetch and analyze your financial data to answer questions about your finances.

---

## Overview

The AI Assistant has access to **9 tools** that help it understand and analyze your financial situation:

| Tool | Purpose | Data Source |
|------|---------|-------------|
| `get_income_summary` | Detailed income and CPF breakdown | `incomes`, `family_members` |
| `get_expenses_summary` | Detailed expense breakdown | `expenses`, `expense_categories` |
| `get_family_summary` | Household structure and income inclusion | `family_members`, `incomes` |
| `get_balance_summary` | Projected savings over a date range | `current_holdings`, `incomes`, `expenses` |
| `get_holdings_summary` | Current cash and liquid assets | `current_holdings`, `family_members` |
| `get_property_assets_summary` | Property assets and mortgages | `property_assets` |
| `get_vehicle_assets_summary` | Vehicle assets and loans | `vehicle_assets` |
| `get_other_assets_summary` | Other assets (investments, etc.) | `assets` |
| `get_insurance_summary` | Insurance policies and coverage | `policies` |

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

### 5. `get_holdings_summary`

**What it does:**
Shows your current cash holdings and liquid assets — how much money you have in your bank accounts right now. This is separate from income (which is recurring) and gives a snapshot of your current financial position.

**When the assistant uses it:**
- "How much money do I have?"
- "What's my current savings?"
- "What's my bank balance?"
- "How much liquid assets do I have?"
- "What's in my accounts?"

**What it returns:**
- Total holdings (sum across all accounts)
- Number of accounts
- Individual holdings with:
  - Bank name
  - Amount
  - Which family member owns it (if applicable)
  - Last updated date
- Holdings breakdown by family member:
  - Member name
  - Total amount
  - Number of accounts
- Notes explaining any context

**Data Sources:**
| Table | What it provides |
|-------|------------------|
| `current_holdings` | Bank account balances |
| `family_members` | Links accounts to family members |

**Related App Pages:** `/assets` (Current Holdings section)

---

### 6. `get_property_assets_summary`

**What it does:**
Shows details about all property assets you own — houses, HDB flats, condos, etc. Includes purchase price, loan details, CPF usage, and equity calculations.

**When the assistant uses it:**
- "What properties do I own?"
- "How much do I owe on my mortgage?"
- "What's my home equity?"
- "How much CPF did I use for my house?"
- "What are my monthly mortgage payments?"

**What it returns:**
- Total property value (sum of purchase prices)
- Total outstanding loans
- Total equity owned
- Total monthly payments
- Individual properties with:
  - Property name and purchase date
  - Original purchase price
  - Loan amount taken and outstanding
  - Monthly payment and interest rate
  - CPF withdrawn and housing grant
  - Equity owned (purchase price - outstanding loan)
  - Loan progress percentage

**Data Sources:**
| Table | What it provides |
|-------|------------------|
| `property_assets` | All property records with loan and CPF details |

**Related App Pages:** `/assets` (Property Assets section)

---

### 7. `get_vehicle_assets_summary`

**What it does:**
Shows details about all vehicles you own — cars, motorcycles, etc. Includes purchase price, loan status, and COE expiry (Singapore-specific).

**When the assistant uses it:**
- "What cars do I own?"
- "How much do I owe on my car loan?"
- "When does my COE expire?"
- "What's my vehicle worth?"
- "What are my car loan payments?"

**What it returns:**
- Total vehicle value
- Total outstanding loans
- Total monthly payments
- Individual vehicles with:
  - Vehicle name and purchase date
  - COE expiry date and years remaining
  - Original purchase price
  - Loan taken, repaid, and outstanding
  - Monthly payment
  - Loan progress percentage

**Data Sources:**
| Table | What it provides |
|-------|------------------|
| `vehicle_assets` | All vehicle records with loan and COE details |

**Related App Pages:** `/assets` (Vehicle Assets section)

---

### 8. `get_other_assets_summary`

**What it does:**
Shows details about other assets you track — investments, savings, collectibles, etc. Can be filtered by asset type.

**When the assistant uses it:**
- "What other assets do I have?"
- "What are my investments worth?"
- "Show me my asset portfolio"
- "How much have my investments grown?"
- "What's my total net worth from assets?"

**What it returns:**
- Total current value
- Total purchase value
- Overall gain/loss
- Breakdown by asset type
- Individual assets with:
  - Name and type
  - Current and purchase value
  - Purchase date
  - Gain/loss amount and percentage

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `assetType` | No | Filter by type (e.g., 'investment', 'savings', 'collectible') |

**Data Sources:**
| Table | What it provides |
|-------|------------------|
| `assets` | Generic asset records with values |

**Related App Pages:** `/assets` (Other Assets section)

---

### 9. `get_insurance_summary`

**What it does:**
Shows details about all your insurance policies — life, health, auto, home, etc. Includes provider, premium amounts, coverage details, and policy status.

**When the assistant uses it:**
- "What insurance do I have?"
- "How much am I paying for insurance?"
- "What's my life insurance coverage?"
- "Show me my health insurance policies"
- "How much death coverage do I have?"

**What it returns:**
- Total annual and monthly premiums
- Total death and critical illness coverage
- Breakdown by policy type
- Breakdown by provider
- Individual policies with:
  - Provider and policy number
  - Policy type and status
  - Policy holder (family member)
  - Start date, maturity date, years active
  - Premium amount and frequency
  - Coverage details (death, TPD, critical illness, hospitalisation)

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `policyType` | No | Filter by type (e.g., 'life', 'health', 'auto', 'home') |
| `status` | No | Filter by status: 'active' (default), 'lapsed', 'cancelled', 'matured', 'all' |

**Data Sources:**
| Table | What it provides |
|-------|------------------|
| `policies` | All insurance policy records |
| `family_members` | Links policies to family members |

**Related App Pages:** `/policies`

---

## Database Tables Reference

| Table | Description | Key Fields |
|-------|-------------|------------|
| `incomes` | All income sources | `name`, `amount`, `frequency`, `family_member_id`, `subject_to_cpf`, `future_milestones` |
| `expenses` | Recurring expenses | `name`, `amount`, `frequency`, `category`, `is_active` |
| `expense_categories` | Expense categories | `name`, `icon`, `is_default`, `tracked_in_budget` |
| `family_members` | Household members | `name`, `relationship`, `is_contributing`, `date_of_birth` |
| `current_holdings` | Bank account balances | `bank_name`, `holding_amount`, `family_member_id` |
| `property_assets` | Property/real estate | `property_name`, `original_purchase_price`, `outstanding_loan`, `monthly_loan_payment`, `interest_rate` |
| `vehicle_assets` | Vehicles | `vehicle_name`, `original_purchase_price`, `coe_expiry_date`, `loan_amount_taken`, `loan_amount_repaid` |
| `assets` | Other assets | `name`, `type`, `current_value`, `purchase_value`, `purchase_date` |
| `policies` | Insurance policies | `provider`, `policy_type`, `premium_amount`, `premium_frequency`, `coverage_options`, `status` |

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

**Example: "How much do I have in the bank?"**
1. Calls `get_holdings_summary` to get all current holdings
2. Returns total across all accounts with individual breakdown
3. Shows which accounts belong to which family members

**Example: "What's my net worth?"**
1. Calls `get_holdings_summary` for liquid assets
2. Calls `get_property_assets_summary` for property equity
3. Calls `get_vehicle_assets_summary` for vehicle values
4. Calls `get_other_assets_summary` for other asset values
5. Combines all to calculate total net worth

**Example: "How much do I owe across all loans?"**
1. Calls `get_property_assets_summary` for mortgage balances
2. Calls `get_vehicle_assets_summary` for car loan balances
3. Sums up all outstanding loans

**Example: "Am I adequately insured?"**
1. Calls `get_insurance_summary` to get all active policies
2. Calls `get_income_summary` to understand annual income
3. Compares death/CI coverage against typical recommendations (e.g., 10x annual income)

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
