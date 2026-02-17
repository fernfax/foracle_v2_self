# AI Core Modules Documentation

This document explains the two core modules that power Foracle's AI Assistant: the **Orchestrator** and the **Tool Executors**.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Message                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATOR                                │
│  (lib/ai/orchestrator.ts)                                        │
│                                                                  │
│  • Manages conversation state                                    │
│  • Sends messages to OpenAI                                      │
│  • Handles tool call loop                                        │
│  • Enforces system prompt rules                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TOOL EXECUTORS                               │
│  (lib/ai/tools/executors.ts)                                     │
│                                                                  │
│  • get_income_summary          • get_holdings_summary            │
│  • get_expenses_summary        • get_property_assets_summary     │
│  • get_daily_expense_summary   • get_vehicle_assets_summary      │
│  • get_family_summary          • get_other_assets_summary        │
│  • get_balance_summary         • get_insurance_summary           │
│  • search_knowledge                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Database                                  │
│  incomes, expenses, dailyExpenses, familyMembers,               │
│  currentHoldings, propertyAssets, vehicleAssets,                │
│  assets, policies, expenseSubcategories                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Orchestrator (`lib/ai/orchestrator.ts`)

### Purpose

The Orchestrator is the **central controller** for the AI Assistant. It manages the conversation flow between the user, OpenAI's API, and the tool executors.

### Key Responsibilities

#### 1.1 Conversation State Management

```typescript
interface ConversationState {
  id: string;
  messages: Message[];
  lastResponseId?: string;  // For OpenAI conversation continuity
  toolsUsed: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

- Maintains in-memory conversation history
- Tracks which tools have been used in each conversation
- Preserves context across multiple messages using `lastResponseId`

#### 1.2 System Prompt Generation

The orchestrator generates a **dynamic system prompt** that includes:

- **Current date context** (Singapore timezone) for handling relative dates like "this month"
- **Core operating principles**:
  - NO SELF-CALCULATION RULE: AI must never calculate numbers itself
  - CLARIFY AMBIGUITY: Verify time periods and scope before tool calls
  - TRANSPARENCY: Always report which tools were used
  - ROLE BOUNDARIES: Financial consultant, not licensed advisor
- **Strict formatting rules** for clean, report-style responses

#### 1.3 Tool Call Loop

The orchestrator implements an **agentic loop** that:

1. Sends user message to OpenAI
2. If OpenAI requests tool calls, executes them via executors
3. Returns tool results to OpenAI
4. Repeats until no more tool calls or max limit reached (default: 3)
5. Returns final response to user

```typescript
// Simplified flow
while (response.toolCalls.length > 0 && toolCallCount < maxToolCalls) {
  const toolResults = await this.executeToolCalls(response.toolCalls);
  response = await this.client.createResponse({
    input: toolResults,
    previous_response_id: response.id,
  });
  toolCallCount++;
}
```

#### 1.4 Hard Rule: Data Sources Transparency

**HARD RULE**: The orchestrator always returns `toolsUsed` array so the UI can display the "Data sources used" section at the bottom of assistant messages.

```typescript
return {
  response: finalResponse,
  toolsUsed: toolsUsedThisRound,  // Always included
  conversationId: conversation.id,
  responseId: response.id,
};
```

### Usage

```typescript
import { getOrchestrator } from "@/lib/ai/orchestrator";

const orchestrator = getOrchestrator();
const result = await orchestrator.chat("What's my income this month?", conversationId);

console.log(result.response);     // AI's response text
console.log(result.toolsUsed);    // ["get_income_summary"]
console.log(result.conversationId); // For continuing the conversation
```

---

## 2. Tool Executors (`lib/ai/tools/executors.ts`)

### Purpose

The Tool Executors are the **data layer** for the AI Assistant. They query the database and return structured financial data that the AI can use to answer user questions.

### Available Tools

| Tool Name | Description |
|-----------|-------------|
| `get_income_summary` | Income breakdown with CPF calculations |
| `get_expenses_summary` | Recurring expense breakdown by category |
| `get_daily_expense_summary` | Actual daily spending history and totals |
| `get_family_summary` | Household structure and member info |
| `get_balance_summary` | Balance projections with safety assessment |
| `get_holdings_summary` | Current cash and liquid asset holdings |
| `get_property_assets_summary` | Property assets with mortgage/loan details |
| `get_vehicle_assets_summary` | Vehicle assets with loan and COE details |
| `get_other_assets_summary` | Other assets (investments, savings, etc.) |
| `get_insurance_summary` | Insurance policies and coverage details |
| `search_knowledge` | Semantic search over financial knowledge base |

---

### 2.1 `get_income_summary`

**Purpose**: Returns detailed income and CPF summary for a specific month.

**Parameters**:
```typescript
{ month: "YYYY-MM" }  // e.g., "2026-02"
```

**Returns**:
- Total gross/net income
- CPF contributions (employee, employer, account allocations)
- Breakdown by income source with family member attribution
- Handles future milestones (salary changes)

---

### 2.2 `get_expenses_summary`

**Purpose**: Returns recurring expense summary for a specific month.

**Parameters**:
```typescript
{ month: "YYYY-MM" }
```

**Returns**:
- Total monthly expenses
- Category breakdown with percentages
- All expense items with frequency and type

---

### 2.3 `get_daily_expense_summary`

**Purpose**: Returns actual daily spending summary for a date range. Unlike `get_expenses_summary` which shows planned recurring expenses, this shows real money spent.

**Parameters**:
```typescript
{
  month?: "YYYY-MM",        // Shorthand for entire month
  fromDate?: "YYYY-MM-DD",  // Start date (default: start of current month)
  toDate?: "YYYY-MM-DD",    // End date (default: today)
  categoryName?: string,    // Filter by category (e.g., "Food")
  subcategoryName?: string  // Filter by subcategory (e.g., "Groceries")
}
```

**Returns**:
- Date range and days covered
- Total spent and average per day
- Category breakdown with subcategory details
- All expense items with dates, amounts, and notes
- Foreign currency details if applicable

**Database Tables**: `dailyExpenses`, `expenseSubcategories`, `expenseCategories`

---

### 2.4 `get_family_summary`

**Purpose**: Returns household structure and income inclusion settings.

**Parameters**:
```typescript
{
  scope?: "household" | "member" | "auto",
  month?: "YYYY-MM",
  memberId?: string,
  memberName?: string
}
```

**Returns**:
- List of family members
- Which members are included in income totals
- Income change signals (scheduled salary changes)

---

### 2.5 `get_balance_summary` (Most Complex)

**Purpose**: Cashflow projection engine with safety assessment and affordability analysis.

**Parameters**:
```typescript
{
  fromMonth: "YYYY-MM",
  toMonth: "YYYY-MM",
  // Optional: Hypothetical scenarios
  hypotheticals?: Array<{ type: "income" | "expense", amount: number, month: string }>,
  // Optional: Constraints
  minEndBalance?: number,
  minMonthlyBalance?: number,
  // Optional: Affordability mode
  computeMaxAffordableExpenseMonth?: "YYYY-MM",
  // Optional: Purchase timing
  findSafeMonthForExpense?: number
}
```

**Returns**:
- Monthly balance projections
- Safety assessment with traffic light system
- Affordability analysis
- Safe purchase recommendations

---

### 2.6 `get_holdings_summary`

**Purpose**: Returns current cash and liquid asset holdings across all bank accounts.

**Parameters**:
```typescript
{}  // No parameters required
```

**Returns**:
- Total holdings amount across all accounts
- Number of accounts
- Individual holdings with bank name, amount, and family member ownership
- Holdings breakdown by family member (name, total, account count)
- Contextual notes

**Database Tables**: `currentHoldings`, `familyMembers`

---

### 2.7 `get_property_assets_summary`

**Purpose**: Returns details about all property assets including mortgage and CPF information.

**Parameters**:
```typescript
{}  // No parameters required
```

**Returns**:
- Total property value (sum of purchase prices)
- Total outstanding loans
- Total equity owned
- Total monthly mortgage payments
- Individual properties with:
  - Property name and purchase date
  - Original purchase price
  - Loan amount taken and outstanding
  - Monthly payment and interest rate
  - CPF withdrawn and housing grant
  - Equity owned (purchase price - outstanding loan)
  - Loan progress percentage

**Database Tables**: `propertyAssets`

---

### 2.8 `get_vehicle_assets_summary`

**Purpose**: Returns details about all vehicle assets including loan status and COE information.

**Parameters**:
```typescript
{}  // No parameters required
```

**Returns**:
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

**Database Tables**: `vehicleAssets`

---

### 2.9 `get_other_assets_summary`

**Purpose**: Returns details about other tracked assets like investments, savings, and collectibles.

**Parameters**:
```typescript
{
  assetType?: string  // Optional filter: "investment", "savings", "collectible", etc.
}
```

**Returns**:
- Total current value
- Total purchase value
- Overall gain/loss amount and percentage
- Breakdown by asset type (type, count, currentValue, purchaseValue, gainLoss)
- Individual assets with:
  - Name and type
  - Current and purchase value
  - Purchase date
  - Gain/loss amount and percentage

**Database Tables**: `assets`

---

### 2.10 `get_insurance_summary`

**Purpose**: Returns details about all insurance policies including coverage and premium information.

**Parameters**:
```typescript
{
  policyType?: string,  // Optional filter: "life", "health", "auto", "home", etc.
  status?: "active" | "lapsed" | "cancelled" | "matured" | "all"  // Default: "active"
}
```

**Returns**:
- Total annual and monthly premiums
- Total death coverage
- Total critical illness coverage
- Active policy count
- Breakdown by policy type (type, count, annualPremium)
- Breakdown by provider (provider, count, annualPremium)
- Individual policies with:
  - Provider and policy number
  - Policy type and status
  - Policy holder (family member name)
  - Start date, maturity date, years active
  - Premium amount and frequency (monthly/annual)
  - Coverage details (death, TPD, critical illness, hospitalisation)

**Database Tables**: `policies`, `familyMembers`

---

### 2.11 `search_knowledge`

**Purpose**: Semantic search over the Foracle knowledge base for general financial information.

**Parameters**:
```typescript
{
  query: string,    // Natural language search query
  limit?: number    // Max results (1-10, default: 5)
}
```

**Returns**:
- Relevant knowledge chunks with similarity scores
- Document metadata (source, category, etc.)

**When to Use**:
- General financial questions: "What is CPF?", "How much emergency fund should I have?"
- Concept explanations: "What are the CPF account types?"
- Best practices: "What are good budgeting strategies?"

**NOT for**:
- User-specific data (use the other tools)
- Balance projections (use `get_balance_summary`)

**Example Response**:
```typescript
{
  query: "What is CPF?",
  resultsCount: 3,
  results: [
    {
      docId: "cpf-basics",
      content: "# CPF (Central Provident Fund) Basics\n\nThe Central Provident Fund...",
      similarity: 0.61,
      metadata: { source: "cpf-official", category: "retirement" }
    },
    // ... more results
  ]
}
```

---

### Safety Assessment (Traffic Light System)

The `get_balance_summary` tool includes a **safety assessment** that evaluates whether an expense is financially safe based on emergency fund coverage.

#### Thresholds

| Status | Emergency Fund Coverage | Meaning |
|--------|------------------------|---------|
| 🟢 **Green** | ≥ 9 months of net income | Safe - healthy emergency fund |
| 🟡 **Yellow** | 6-9 months of net income | Caution - consider if essential |
| 🔴 **Red** | < 6 months of net income | At Risk - not recommended |

#### How It Works

```typescript
// Calculate average monthly net income
const baseMonthlyNetIncome = totalBaseIncome / monthCount;

// Calculate thresholds
const yellowThreshold = baseMonthlyNetIncome * 6;  // 6 months
const greenThreshold = baseMonthlyNetIncome * 9;   // 9 months

// Determine status based on balance after hypothetical expense
if (balance >= greenThreshold) {
  status = "green";
} else if (balance >= yellowThreshold) {
  status = "yellow";
} else {
  status = "red";
}
```

#### Safety Threshold Fix (Recent Update)

When computing the **maximum affordable expense** (`computeMaxAffordableExpenseMonth`), the system now defaults to using **6 months of net income** as the safety floor:

```typescript
// Default to 6 months of net income as the safety floor
const defaultSafetyFloor = baseMonthlyNetIncome * 6;
const minAllowedBalance = params.minMonthlyBalance ?? defaultSafetyFloor;
```

This ensures the AI **never recommends an expense that would deplete the emergency fund** below safe levels.

---

### Audit Logging

All tool executions are logged for transparency:

```typescript
interface AuditRecord {
  toolName: ToolName;
  userId: string;
  timestamp: Date;
  durationMs: number;
  status: "success" | "error" | "unauthorized" | "validation_error";
  errorMessage?: string;
}
```

---

## Architecture Decisions

### Why Tools Instead of Direct Database Access?

1. **Security**: Tools validate user authentication and only return their own data
2. **Consistency**: Calculations (like CPF) are centralized in one place
3. **Transparency**: Users can see exactly which data sources were used
4. **Testability**: Each tool can be unit tested independently

### Why In-Memory Conversation State?

- Current implementation uses in-memory storage for simplicity
- For production scale, should migrate to Redis or database storage
- The `lastResponseId` enables OpenAI to maintain conversation context

### Why a System Prompt with Strict Rules?

- Ensures consistent, professional formatting
- Prevents the AI from making up calculations
- Maintains clear role boundaries (consultant, not advisor)
- Handles Singapore-specific context (SGD, CPF)

---

## File Locations

```
lib/ai/
├── orchestrator.ts       # Conversation controller
├── openai-client.ts      # OpenAI API wrapper
├── rate-limiter.ts       # Request rate limiting
├── threads.ts            # Thread/conversation persistence
└── tools/
    ├── registry.ts       # Tool definitions and schemas
    ├── executors.ts      # Tool implementation logic
    └── index.ts          # Public exports

lib/vectors/
├── index.ts              # Public exports
├── embeddings.ts         # Embedding providers (Voyage AI, OpenAI)
├── chunker.ts            # Text chunking utilities
├── ingest.ts             # Document ingestion
└── retrieval.ts          # Semantic search queries

db/schema.ts              # Includes kb_chunks and user_chunks tables
scripts/
├── migrate-vector-tables.sql  # pgvector table creation
└── seed-kb.ts                 # Knowledge base seeding
```
