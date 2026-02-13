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
│  • get_income_summary                                            │
│  • get_expenses_summary                                          │
│  • get_family_summary                                            │
│  • get_balance_summary (with safety assessment)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Database                                  │
│  (incomes, expenses, familyMembers, currentHoldings)            │
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
| `get_expenses_summary` | Expense breakdown by category |
| `get_family_summary` | Household structure and member info |
| `get_balance_summary` | Balance projections with safety assessment |

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

### 2.3 `get_family_summary`

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

### 2.4 `get_balance_summary` (Most Complex)

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
```
