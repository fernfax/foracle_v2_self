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

// Schema for individual hypothetical items (multi-scenario support)
export const HypotheticalItemSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive("Amount must be positive"),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format"),
  label: z.string().optional(),
});

export const BalanceSummaryParamSchema = z.object({
  // ===== EXISTING PARAMS (backwards compatible) =====
  fromMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "fromMonth must be in YYYY-MM format"),
  toMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "toMonth must be in YYYY-MM format"),
  // Legacy single hypothetical (kept for backwards compatibility)
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

  // ===== NEW PARAMS (v2 enhancements) =====
  // Multi-scenario hypotheticals (if provided, overrides legacy single hypothetical params)
  hypotheticals: z.array(HypotheticalItemSchema).optional(),

  // Safety / buffer constraints
  minEndBalance: z
    .number()
    .optional()
    .describe("Minimum acceptable balance at end of projection period"),
  minMonthlyBalance: z
    .number()
    .optional()
    .describe("Minimum acceptable balance for any month during projection"),

  // Affordability mode - compute max affordable expense for a specific month
  computeMaxAffordableExpenseMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Must be in YYYY-MM format")
    .optional()
    .describe("If provided, computes the maximum one-time expense affordable in this month while respecting constraints"),
});

// =============================================================================
// Tool Type Definitions
// =============================================================================

export type MonthParams = z.infer<typeof MonthParamSchema>;
export type FamilySummaryParams = z.infer<typeof FamilySummaryParamSchema>;
export type BalanceSummaryParams = z.infer<typeof BalanceSummaryParamSchema>;
export type HypotheticalItem = z.infer<typeof HypotheticalItemSchema>;

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
      "Cashflow & affordability engine for balance projections and spending analysis. Returns monthly breakdown showing income, expenses, net savings, and cumulative balance. Starting balance is fetched from current holdings. ALWAYS includes a safetyAssessment with traffic light status (green/yellow/red) based on emergency fund health: GREEN = balance stays above 9 months of net income, YELLOW = balance dips to 6-9 months (caution advised), RED = balance drops below 6 months (expense not recommended). Use this for: (1) Balance projections - 'how much will I have saved by X', 'what will my balance be'; (2) Affordability questions - 'how much can I spend on a gift', 'can I afford X', 'what's my budget for Y' - use computeMaxAffordableExpenseMonth to find max affordable amount; (3) Multi-scenario planning - use hypotheticals[] array for trips spanning months or multiple purchases; (4) Safety analysis - use minEndBalance/minMonthlyBalance to ensure constraints are met. IMPORTANT: When user asks about a SPECIFIC month, only show that month's data. For affordability questions, use computeMaxAffordableExpenseMonth and report the maxAffordableOneTimeExpense. ALWAYS report the safetyAssessment status and recommendation to the user - if status is 'yellow' or 'red', explicitly advise caution or against the expense.",
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
          description: "[Legacy] Single one-time expense to simulate. For multiple scenarios, use hypotheticals[] instead.",
        },
        hypotheticalExpenseMonth: {
          type: "string",
          description: "[Legacy] Month for hypotheticalExpense in YYYY-MM format",
        },
        hypotheticalIncome: {
          type: "number",
          description: "[Legacy] Single one-time income to simulate. For multiple scenarios, use hypotheticals[] instead.",
        },
        hypotheticalIncomeMonth: {
          type: "string",
          description: "[Legacy] Month for hypotheticalIncome in YYYY-MM format",
        },
        hypotheticals: {
          type: "array",
          description: "Array of hypothetical income/expense scenarios. If provided, legacy single hypothetical params are ignored.",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["income", "expense"], description: "Whether this is income or expense" },
              amount: { type: "number", description: "Amount in dollars" },
              month: { type: "string", description: "Month in YYYY-MM format" },
              label: { type: "string", description: "Optional label (e.g., 'Valentine gift', 'Japan trip')" },
            },
            required: ["type", "amount", "month"],
          },
        },
        minEndBalance: {
          type: "number",
          description: "Minimum acceptable balance at end of projection. Used for constraint checking.",
        },
        minMonthlyBalance: {
          type: "number",
          description: "Minimum acceptable balance for any month. Used for constraint checking and affordability calculations.",
        },
        computeMaxAffordableExpenseMonth: {
          type: "string",
          description: "If provided (YYYY-MM format), computes the MAXIMUM one-time expense the user can afford in that month while never going below minMonthlyBalance (default 0). Use this for questions like 'how much can I spend on X'.",
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
