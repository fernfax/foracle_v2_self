import { ForacleAIClient, getAIClient, type AIResponse, type ToolCall } from "./openai-client";
import { getToolRegistry, executeTool, type ToolExecutionResult } from "./tools";

// =============================================================================
// Types
// =============================================================================

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  toolCallId?: string;
  toolName?: string;
  timestamp: Date;
}

export interface ConversationState {
  id: string;
  messages: Message[];
  lastResponseId?: string;
  toolsUsed: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrchestratorConfig {
  maxToolCalls?: number;
  systemPrompt?: string;
  client?: ForacleAIClient;
}

export interface OrchestratorResult {
  response: string;
  toolsUsed: string[];
  conversationId: string;
  responseId?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_TOOL_CALLS = 3;

// Generate system prompt with current date
function generateSystemPrompt(): string {
  // Get current date in Singapore timezone
  const now = new Date();
  const sgDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Singapore" }));
  const currentYear = sgDate.getFullYear();
  const currentMonth = sgDate.getMonth() + 1;
  const currentDay = sgDate.getDate();
  const currentMonthFormatted = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  const currentDateFormatted = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(currentDay).padStart(2, "0")}`;

  // Get month name
  const monthNames = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"];
  const currentMonthName = monthNames[currentMonth - 1];

  return `You are Foracle Assistant, an AI financial companion for the Foracle personal finance app. You help users understand their finances, analyze spending patterns, and plan for financial goals.

## CURRENT DATE CONTEXT
**IMPORTANT**: Today's date is ${currentDateFormatted} (${currentDay} ${currentMonthName} ${currentYear}).
- "This month" means ${currentMonthName} ${currentYear} (${currentMonthFormatted})
- "Last month" means ${monthNames[(currentMonth - 2 + 12) % 12]} ${currentMonth === 1 ? currentYear - 1 : currentYear}
- "Next month" means ${monthNames[currentMonth % 12]} ${currentMonth === 12 ? currentYear + 1 : currentYear}
- Always use the current date as reference for relative time expressions like "this month", "next 3 months", etc.

## CORE OPERATING PRINCIPLES

### 1. NO SELF-CALCULATION RULE
You MUST NOT perform any financial calculations yourself. All monetary computations must come from tool calls.
- Never add, subtract, multiply, or divide currency values in your response
- Always use the appropriate tool to get calculated results
- Report the exact figures returned by tools

### 2. CLARIFY AMBIGUITY
Before calling tools, verify you have clear information about:
- TIME PERIOD: Specific month in YYYY-MM format (use current date context above for relative terms)
- SCOPE: What categories or expenses to include

### 2.5 HOUSEHOLD/FAMILY INCOME QUESTIONS
When user asks about household income, combined income, or family finances:
1. FIRST call \`get_family_summary\` to understand:
   - Who is in the household
   - Which members are included in income totals (isContributing flag)
   - Any scheduled income changes (futureMilestones)
2. THEN call \`get_income_summary\` for the actual numbers
3. In your response, explain:
   - Who is included in the household total
   - Who is excluded and why
   - Any upcoming income changes

For member-specific questions ("How much does my spouse earn?"):
- Call \`get_family_summary\` with memberName to identify the member
- Then call \`get_income_summary\` and filter to that member's income sources

For income change questions ("Why did household income change?"):
- Call \`get_family_summary\` to check incomeChangeSignals
- Call \`get_income_summary\` for current and comparison months

### 3. TRANSPARENCY
Every response containing financial numbers MUST include at the end:
- A "Data used" section listing which tool(s) provided the data

### 4. ROLE BOUNDARIES
You are a consultant and planning partner - NOT a licensed financial advisor.
- DO: Analyze spending, suggest budget adjustments, propose actionable steps
- DO NOT: Give investment advice, recommend insurance products, provide tax advice

### 5. COMMUNICATION STYLE
- Use Singapore Dollar (SGD/$) as default currency
- Format numbers with commas (e.g., $12,500.00)
- Round to 2 decimal places
- Be concise but thorough

### 6. STRICT FORMATTING RULES
Your responses must be formatted like a clean financial report. Follow these rules exactly:

**RULE 1: Use Markdown Headings**
- Use ## for main sections
- Use ### for subsections
- Always add a blank line before AND after headings

**RULE 2: One Metric Per Line**
NEVER chain multiple metrics on one line.
- WRONG: Income - **Gross:** $9,000 - **Net:** $7,400 - **CPF:** $2,960
- CORRECT: Each metric on its own bullet point:
  - **Gross:** $9,000.00
  - **Net:** $7,400.00
  - **CPF:** $2,960.00

**RULE 3: Blank Lines Around Lists**
Always add a blank line before AND after any list (bullet or numbered).

**RULE 4: Tables Must Be Valid GFM**
When using tables, format them correctly with newlines:
- Header row
- Separator row with dashes (|---|---|)
- Data rows (each on its own line)

**RULE 5: Prefer Bullet Lists for Financial Data**
Use bullet lists for breakdowns:
- **Category Name:** $Amount (percentage%)

**RULE 6: Structure Like a Report**
Organize responses with clear sections, not paragraphs of text.

**RULE 7: Currency Formatting**
- Always use 2 decimal places: $5,400.00
- Use commas for thousands: $12,500.00

**RULE 8: Section Separators**
Add a horizontal rule (---) between major sections to visually separate content groups. Place --- after each major section's content, before the next section heading.

**Example Well-Formatted Response:**

## February 2026 Financial Summary

### Income Overview

- **Total Gross Income:** $15,200.00
- **Total Net Income:** $12,360.00
- **Total CPF Contribution:** $5,254.00

---

### Income Sources

**1. Evan Lee's Salary**

- Gross: $9,000.00
- Net: $7,400.00
- Employee CPF: $1,800.00
- Employer CPF: $1,160.00

**2. Ng Bei Yu's Salary**

- Gross: $6,200.00
- Net: $4,960.00
- Employee CPF: $1,240.00
- Employer CPF: $1,054.00

---

### Expenses by Category

- **Housing:** $5,400.00 (63.9%)
- **Insurance:** $1,455.00 (17.2%)
- **Children:** $1,000.00 (11.8%)
- **Allowances:** $600.00 (7.1%)

---

**Data used:** \`get_income_summary\`, \`get_expenses_summary\``;
}

const DEFAULT_SYSTEM_PROMPT = generateSystemPrompt();

// =============================================================================
// Conversation Store (In-Memory)
// =============================================================================

const conversations = new Map<string, ConversationState>();

function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// =============================================================================
// Orchestrator Class
// =============================================================================

export class AIOrchestrator {
  private client: ForacleAIClient;
  private maxToolCalls: number;
  private customSystemPrompt: string | null;

  constructor(config: OrchestratorConfig = {}) {
    this.client = config.client || getAIClient();
    this.maxToolCalls = config.maxToolCalls ?? DEFAULT_MAX_TOOL_CALLS;
    this.customSystemPrompt = config.systemPrompt ?? null;
  }

  /**
   * Get the system prompt with current date context
   */
  private getSystemPrompt(): string {
    return this.customSystemPrompt ?? generateSystemPrompt();
  }

  /**
   * Start a new conversation
   */
  createConversation(): ConversationState {
    const id = generateId();
    const conversation: ConversationState = {
      id,
      messages: [],
      toolsUsed: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    conversations.set(id, conversation);
    return conversation;
  }

  /**
   * Get an existing conversation
   */
  getConversation(id: string): ConversationState | undefined {
    return conversations.get(id);
  }

  /**
   * Process a user message and return the assistant's response
   */
  async chat(
    userMessage: string,
    conversationId?: string
  ): Promise<OrchestratorResult> {
    // Get or create conversation
    let conversation: ConversationState;
    if (conversationId && conversations.has(conversationId)) {
      conversation = conversations.get(conversationId)!;
    } else {
      conversation = this.createConversation();
    }

    // Add user message to conversation
    const userMsg: Message = {
      id: generateMessageId(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    conversation.messages.push(userMsg);
    conversation.updatedAt = new Date();

    // Track tools used in this interaction
    const toolsUsedThisRound: string[] = [];

    // Build input for OpenAI
    const registry = getToolRegistry();
    const tools = registry.getOpenAITools();

    // Get fresh system prompt with current date
    const systemPrompt = this.getSystemPrompt();

    // Initial API call
    let response = await this.client.createResponse({
      input: userMessage,
      instructions: systemPrompt,
      tools,
      tool_choice: "auto",
      previous_response_id: conversation.lastResponseId,
    });

    // Store response ID for conversation continuity
    conversation.lastResponseId = response.id;

    // Tool call loop
    let toolCallCount = 0;
    while (response.toolCalls.length > 0 && toolCallCount < this.maxToolCalls) {
      // Execute tool calls
      const toolResults = await this.executeToolCalls(response.toolCalls);

      // Track which tools were used
      for (const result of toolResults) {
        if (!toolsUsedThisRound.includes(result.toolName)) {
          toolsUsedThisRound.push(result.toolName);
        }
      }

      // Store tool messages in conversation
      for (let i = 0; i < response.toolCalls.length; i++) {
        const toolCall = response.toolCalls[i];
        const result = toolResults[i];

        // Add assistant's tool call message
        conversation.messages.push({
          id: generateMessageId(),
          role: "assistant",
          content: `Calling tool: ${toolCall.name}`,
          toolName: toolCall.name,
          timestamp: new Date(),
        });

        // Add tool result message
        conversation.messages.push({
          id: generateMessageId(),
          role: "tool",
          content: JSON.stringify(result.data ?? { error: result.error }),
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          timestamp: new Date(),
        });
      }

      // Build tool results for OpenAI (using function_call_output format)
      const toolResultsInput = toolResults.map((result, idx) => ({
        type: "function_call_output" as const,
        call_id: response.toolCalls[idx].id,
        output: JSON.stringify(result.success ? result.data : { error: result.error }),
      }));

      // Call OpenAI again with tool results
      response = await this.client.createResponse({
        input: toolResultsInput as unknown as string,
        instructions: systemPrompt,
        tools,
        tool_choice: "auto",
        previous_response_id: response.id,
      });

      // Update response ID
      conversation.lastResponseId = response.id;
      toolCallCount++;
    }

    // Get final assistant response
    let finalResponse = response.text || "I apologize, but I couldn't generate a response.";

    // Append "Data used" section if tools were used
    if (toolsUsedThisRound.length > 0) {
      // Check if response already has a Data used section
      if (!finalResponse.includes("**Data used:**") && !finalResponse.includes("Data used:")) {
        finalResponse += `\n\n---\n\n**Data used:** \`${toolsUsedThisRound.join("`, `")}\``;
      }
    }

    // Store assistant message
    conversation.messages.push({
      id: generateMessageId(),
      role: "assistant",
      content: finalResponse,
      timestamp: new Date(),
    });

    // Update tools used in conversation
    for (const tool of toolsUsedThisRound) {
      if (!conversation.toolsUsed.includes(tool)) {
        conversation.toolsUsed.push(tool);
      }
    }

    conversation.updatedAt = new Date();

    // HARD RULE: Always return toolsUsed array so the UI can display
    // the "Data sources used" section at the bottom of assistant messages.
    // This ensures transparency about which data sources were queried.
    return {
      response: finalResponse,
      toolsUsed: toolsUsedThisRound,
      conversationId: conversation.id,
      responseId: response.id,
    };
  }

  /**
   * Execute multiple tool calls in parallel
   */
  private async executeToolCalls(
    toolCalls: ToolCall[]
  ): Promise<ToolExecutionResult[]> {
    const results = await Promise.all(
      toolCalls.map((tc) => executeTool(tc.name, tc.arguments))
    );
    return results;
  }

  /**
   * Get conversation history formatted for display
   */
  getFormattedHistory(conversationId: string): string[] {
    const conversation = conversations.get(conversationId);
    if (!conversation) return [];

    return conversation.messages
      .filter((m) => m.role === "user" || (m.role === "assistant" && !m.toolName))
      .map((m) => `${m.role === "user" ? "You" : "Assistant"}: ${m.content}`);
  }

  /**
   * Clear a conversation
   */
  clearConversation(conversationId: string): void {
    conversations.delete(conversationId);
  }

  /**
   * Clear all conversations
   */
  clearAllConversations(): void {
    conversations.clear();
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let orchestratorInstance: AIOrchestrator | null = null;

export function getOrchestrator(config?: OrchestratorConfig): AIOrchestrator {
  if (!orchestratorInstance || config) {
    orchestratorInstance = new AIOrchestrator(config);
  }
  return orchestratorInstance;
}

export function resetOrchestrator(): void {
  orchestratorInstance?.clearAllConversations();
  orchestratorInstance = null;
}
