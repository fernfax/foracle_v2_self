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

export const DateRangeParamSchema = z.object({
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "fromDate must be in YYYY-MM-DD format"),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "toDate must be in YYYY-MM-DD format"),
});

export const TripBudgetParamSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format"),
  tripCost: z.number().positive("Trip cost must be a positive number"),
});

export const SummaryRangeParamSchema = z.object({
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "fromDate must be in YYYY-MM-DD format"),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "toDate must be in YYYY-MM-DD format"),
  includeIncome: z.boolean().optional().default(true),
  includeExpenses: z.boolean().optional().default(true),
}).refine(
  (data) => new Date(data.fromDate) <= new Date(data.toDate),
  { message: "fromDate must be before or equal to toDate" }
);

// =============================================================================
// Tool Type Definitions
// =============================================================================

export type MonthParams = z.infer<typeof MonthParamSchema>;
export type DateRangeParams = z.infer<typeof DateRangeParamSchema>;
export type TripBudgetParams = z.infer<typeof TripBudgetParamSchema>;
export type SummaryRangeParams = z.infer<typeof SummaryRangeParamSchema>;

export type ToolName =
  | "get_month_summary"
  | "get_remaining_budget"
  | "get_upcoming_expenses"
  | "compute_trip_budget"
  | "get_summary_range"
  | "get_income_summary"
  | "get_expenses_summary";

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
  get_month_summary: {
    name: "get_month_summary",
    description:
      "Get a comprehensive financial summary for a specific month including total income (earnings), total budgeted expenses, actual spending, remaining budget, net surplus (income minus expenses), and spending pace. Use this when the user asks about their income, earnings, how much they earn, their overall financial status, or budget summary for a month.",
    schema: MonthParamSchema,
    parameters: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "The month to get summary for in YYYY-MM format (e.g., '2025-02')",
        },
      },
      required: ["month"],
    },
  },

  get_remaining_budget: {
    name: "get_remaining_budget",
    description:
      "Get the remaining budget breakdown by category for a specific month. Shows each category's budget, amount spent, and remaining balance. Use this when the user asks about budget availability or category-specific spending.",
    schema: MonthParamSchema,
    parameters: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "The month to check in YYYY-MM format (e.g., '2025-02')",
        },
      },
      required: ["month"],
    },
  },

  get_upcoming_expenses: {
    name: "get_upcoming_expenses",
    description:
      "Get recurring expenses that will occur within a date range. Shows expense name, category, amount, and frequency. Use this when the user asks about future or planned expenses.",
    schema: DateRangeParamSchema,
    parameters: {
      type: "object",
      properties: {
        fromDate: {
          type: "string",
          description: "Start date in YYYY-MM-DD format (e.g., '2025-02-01')",
        },
        toDate: {
          type: "string",
          description: "End date in YYYY-MM-DD format (e.g., '2025-02-28')",
        },
      },
      required: ["fromDate", "toDate"],
    },
  },

  compute_trip_budget: {
    name: "compute_trip_budget",
    description:
      "Calculate if the user can afford a trip by comparing trip cost against available funds after fixed expenses. Returns affordability assessment and savings suggestions. Use this when the user asks about planning a trip or large purchase.",
    schema: TripBudgetParamSchema,
    parameters: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "The month to analyze in YYYY-MM format (e.g., '2025-02')",
        },
        tripCost: {
          type: "number",
          description: "The total cost of the trip in SGD",
        },
      },
      required: ["month", "tripCost"],
    },
  },

  get_summary_range: {
    name: "get_summary_range",
    description:
      "Get a comprehensive income and expense summary for a date range. Returns total income, total expenses, net savings, and monthly averages. Use this when the user asks about earnings or spending over a period of time, such as 'How much did I earn/spend between January and June?' or 'What's my average monthly spending this year?'",
    schema: SummaryRangeParamSchema,
    parameters: {
      type: "object",
      properties: {
        fromDate: {
          type: "string",
          description: "Start date in YYYY-MM-DD format (e.g., '2025-01-01')",
        },
        toDate: {
          type: "string",
          description: "End date in YYYY-MM-DD format (e.g., '2025-06-30')",
        },
        includeIncome: {
          type: "boolean",
          description: "Whether to include income in the summary (default: true)",
        },
        includeExpenses: {
          type: "boolean",
          description: "Whether to include expenses in the summary (default: true)",
        },
      },
      required: ["fromDate", "toDate"],
    },
  },

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
};

// =============================================================================
// Tool Allowlist
// =============================================================================

const ALLOWED_TOOLS: Set<ToolName> = new Set([
  "get_month_summary",
  "get_remaining_budget",
  "get_upcoming_expenses",
  "compute_trip_budget",
  "get_summary_range",
  "get_income_summary",
  "get_expenses_summary",
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
