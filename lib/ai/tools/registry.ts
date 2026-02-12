import { z } from "zod";
import type { Tool } from "../openai-client";

// =============================================================================
// Tool Parameter Schemas (Zod)
// =============================================================================

export const MonthParamSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format"),
});

export const FamilySummaryParamSchema = z.object({
  scope: z.enum(["household", "member", "auto"]).default("auto"),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format")
    .optional(),
  memberId: z.string().optional(),
  memberName: z.string().optional(),
});

export const BalanceSummaryParamSchema = z.object({
  fromMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "fromMonth must be in YYYY-MM format"),
  toMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "toMonth must be in YYYY-MM format"),
  hypotheticalExpense: z
    .number()
    .positive("Hypothetical expense must be positive")
    .optional(),
  hypotheticalExpenseMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "hypotheticalExpenseMonth must be in YYYY-MM format")
    .optional(),
  hypotheticalIncome: z
    .number()
    .positive("Hypothetical income must be positive")
    .optional(),
  hypotheticalIncomeMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "hypotheticalIncomeMonth must be in YYYY-MM format")
    .optional(),
});

// =============================================================================
// Tool Type Definitions
// =============================================================================

export type MonthParams = z.infer<typeof MonthParamSchema>;
export type FamilySummaryParams = z.infer<typeof FamilySummaryParamSchema>;
export type BalanceSummaryParams = z.infer<typeof BalanceSummaryParamSchema>;

export type ToolName =
  | "get_income_summary"
  | "get_expenses_summary"
  | "get_family_summary"
  | "get_balance_summary";

export interface ToolDefinition {
  name: ToolName;
  description: string;
  schema: z.ZodSchema;
  parameters: Record<string, unknown>;
}

// =============================================================================
// Tool Definitions for OpenAI
// =============================================================================

const TOOL_DEFINITIONS: Record<ToolName, ToolDefinition> = {
  get_income_summary: {
    name: "get_income_summary",
    description:
      "Get detailed income and CPF summary for a specific month. Returns gross income, net income (take-home pay), CPF contributions (employee and employer shares), CPF account allocations (OA, SA, MA), and breakdown by income source with family member attribution. Use this when the user asks about their income, earnings, salary, take-home pay, net income, CPF contributions, how much they earn, or how much goes to CPF.",
    schema: MonthParamSchema,
    parameters: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "The month to get income for in YYYY-MM format (e.g., '2025-02')",
        },
      },
      required: ["month"],
    },
  },

  get_expenses_summary: {
    name: "get_expenses_summary",
    description:
      "Get detailed recurring expense summary for a specific month. Returns total monthly expenses, breakdown by category with percentages, and list of all expense items with name, category, amount, frequency, and type. Use this when the user asks about their expenses, bills, recurring costs, how much they spend monthly, expense breakdown by category, or what their fixed costs are.",
    schema: MonthParamSchema,
    parameters: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "The month to get expenses for in YYYY-MM format (e.g., '2025-02')",
        },
      },
      required: ["month"],
    },
  },

  get_family_summary: {
    name: "get_family_summary",
    description:
      "Get family/household structure and income inclusion settings. Returns list of family members, which members are included in household income totals, their relationships, and any detected income changes. Use this BEFORE get_income_summary when user asks about household income, combined income, family finances, who contributes to household income, spouse/partner income, or when you need to understand family structure. Also call this when user asks 'why did household income change' to check for member inclusion changes or income change signals.",
    schema: FamilySummaryParamSchema,
    parameters: {
      type: "object",
      properties: {
        scope: {
          type: "string",
          enum: ["household", "member", "auto"],
          description: "Scope of summary: 'household' for all members, 'member' for specific member, 'auto' to choose based on other params (default: auto)",
        },
        month: {
          type: "string",
          description: "Optional month context in YYYY-MM format for income change detection",
        },
        memberId: {
          type: "string",
          description: "Optional family member ID for member-specific queries",
        },
        memberName: {
          type: "string",
          description: "Optional family member name for lookup (e.g., 'Bei Yu', 'my wife', 'spouse')",
        },
      },
      required: [],
    },
  },

  get_balance_summary: {
    name: "get_balance_summary",
    description:
      "Get projected cumulative balance (savings) over a date range. Returns monthly breakdown showing income, expenses, net savings, and cumulative balance for each month. Starting balance is fetched from current holdings. Supports hypothetical 'what-if' scenarios by adding optional one-time expenses or income. Use this when user asks about: future savings, balance projections, 'how much will I have saved by X', 'what will my balance be in N months', affordability of large purchases, or impact of spending on savings. IMPORTANT: When user asks about a SPECIFIC month (e.g., 'What is my balance in August 2026?'), only show that month's data in your response - do not list all intermediate months. When user asks about a RANGE or trend, you may show multiple months.",
    schema: BalanceSummaryParamSchema,
    parameters: {
      type: "object",
      properties: {
        fromMonth: {
          type: "string",
          description: "Start month in YYYY-MM format (e.g., '2025-02')",
        },
        toMonth: {
          type: "string",
          description: "End month in YYYY-MM format (e.g., '2025-12')",
        },
        hypotheticalExpense: {
          type: "number",
          description: "Optional one-time expense amount to simulate (e.g., 5000 for a trip)",
        },
        hypotheticalExpenseMonth: {
          type: "string",
          description: "Month when hypothetical expense occurs in YYYY-MM format",
        },
        hypotheticalIncome: {
          type: "number",
          description: "Optional one-time income amount to simulate (e.g., bonus)",
        },
        hypotheticalIncomeMonth: {
          type: "string",
          description: "Month when hypothetical income occurs in YYYY-MM format",
        },
      },
      required: ["fromMonth", "toMonth"],
    },
  },
};

// =============================================================================
// Tool Allowlist
// =============================================================================

const ALLOWED_TOOLS: Set<ToolName> = new Set([
  "get_income_summary",
  "get_expenses_summary",
  "get_family_summary",
  "get_balance_summary",
]);

// =============================================================================
// Tool Registry Class
// =============================================================================

export class ToolRegistry {
  private definitions: Map<ToolName, ToolDefinition>;

  constructor() {
    this.definitions = new Map();

    // Register only allowlisted tools
    for (const [name, def] of Object.entries(TOOL_DEFINITIONS)) {
      if (ALLOWED_TOOLS.has(name as ToolName)) {
        this.definitions.set(name as ToolName, def);
      }
    }
  }

  /**
   * Check if a tool is allowed
   */
  isAllowed(name: string): name is ToolName {
    return ALLOWED_TOOLS.has(name as ToolName);
  }

  /**
   * Get a tool definition by name
   */
  getDefinition(name: ToolName): ToolDefinition | undefined {
    return this.definitions.get(name);
  }

  /**
   * Validate tool arguments against its schema
   * @returns Validated arguments or throws ZodError
   */
  validateArgs<T>(name: ToolName, args: unknown): T {
    const definition = this.definitions.get(name);
    if (!definition) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return definition.schema.parse(args) as T;
  }

  /**
   * Safely validate tool arguments (returns result object instead of throwing)
   */
  safeValidateArgs<T>(
    name: ToolName,
    args: unknown
  ): { success: true; data: T } | { success: false; error: string } {
    try {
      const data = this.validateArgs<T>(name, args);
      return { success: true, data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues || [];
        const messages = issues.map((e) => `${e.path.join(".")}: ${e.message}`);
        return { success: false, error: messages.join("; ") || error.message };
      }
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get all tool definitions formatted for OpenAI API
   */
  getOpenAITools(): Tool[] {
    return Array.from(this.definitions.values()).map((def) => ({
      type: "function" as const,
      function: {
        name: def.name,
        description: def.description,
        parameters: def.parameters,
      },
    }));
  }

  /**
   * Get list of all registered tool names
   */
  getToolNames(): ToolName[] {
    return Array.from(this.definitions.keys());
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let registryInstance: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!registryInstance) {
    registryInstance = new ToolRegistry();
  }
  return registryInstance;
}

export function resetToolRegistry(): void {
  registryInstance = null;
}
