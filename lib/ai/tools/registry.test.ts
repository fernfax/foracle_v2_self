import { describe, it, expect, beforeEach } from "vitest";
import {
  ToolRegistry,
  getToolRegistry,
  resetToolRegistry,
  MonthParamSchema,
  DateRangeParamSchema,
  TripBudgetParamSchema,
  SummaryRangeParamSchema,
  type ToolName,
} from "./registry";

describe("ToolRegistry", () => {
  beforeEach(() => {
    resetToolRegistry();
  });

  // ---------------------------------------------------------------------------
  // Registry Initialization
  // ---------------------------------------------------------------------------

  describe("initialization", () => {
    it("should create a registry with allowlisted tools", () => {
      const registry = new ToolRegistry();
      const toolNames = registry.getToolNames();

      expect(toolNames).toContain("get_remaining_budget");
      expect(toolNames).toContain("get_upcoming_expenses");
      expect(toolNames).toContain("compute_trip_budget");
      expect(toolNames).toContain("get_summary_range");
      expect(toolNames).toContain("get_income_summary");
      expect(toolNames).toContain("get_expenses_summary");
      expect(toolNames).toContain("get_family_summary");
      expect(toolNames).toHaveLength(7);
    });

    it("should return singleton instance via getToolRegistry", () => {
      const registry1 = getToolRegistry();
      const registry2 = getToolRegistry();

      expect(registry1).toBe(registry2);
    });

    it("should reset singleton on resetToolRegistry", () => {
      const registry1 = getToolRegistry();
      resetToolRegistry();
      const registry2 = getToolRegistry();

      expect(registry1).not.toBe(registry2);
    });
  });

  // ---------------------------------------------------------------------------
  // Tool Allowlist
  // ---------------------------------------------------------------------------

  describe("allowlist", () => {
    it("should recognize allowed tools", () => {
      const registry = new ToolRegistry();

      expect(registry.isAllowed("get_remaining_budget")).toBe(true);
      expect(registry.isAllowed("get_upcoming_expenses")).toBe(true);
      expect(registry.isAllowed("compute_trip_budget")).toBe(true);
      expect(registry.isAllowed("get_summary_range")).toBe(true);
      expect(registry.isAllowed("get_income_summary")).toBe(true);
      expect(registry.isAllowed("get_expenses_summary")).toBe(true);
      expect(registry.isAllowed("get_family_summary")).toBe(true);
    });

    it("should reject unknown tools", () => {
      const registry = new ToolRegistry();

      expect(registry.isAllowed("delete_all_data")).toBe(false);
      expect(registry.isAllowed("execute_sql")).toBe(false);
      expect(registry.isAllowed("")).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Tool Definitions
  // ---------------------------------------------------------------------------

  describe("getDefinition", () => {
    it("should return definition for valid tool", () => {
      const registry = new ToolRegistry();
      const def = registry.getDefinition("get_remaining_budget");

      expect(def).toBeDefined();
      expect(def?.name).toBe("get_remaining_budget");
      expect(def?.description).toContain("remaining budget");
      expect(def?.parameters).toHaveProperty("type", "object");
    });

    it("should return undefined for unknown tool", () => {
      const registry = new ToolRegistry();
      const def = registry.getDefinition("unknown_tool" as ToolName);

      expect(def).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // OpenAI Format
  // ---------------------------------------------------------------------------

  describe("getOpenAITools", () => {
    it("should return tools in OpenAI format", () => {
      const registry = new ToolRegistry();
      const tools = registry.getOpenAITools();

      expect(tools).toHaveLength(7);

      const budgetTool = tools.find(
        (t) => t.function.name === "get_remaining_budget"
      );
      expect(budgetTool).toBeDefined();
      expect(budgetTool?.type).toBe("function");
      expect(budgetTool?.function.description).toBeDefined();
      expect(budgetTool?.function.parameters).toHaveProperty("type", "object");
      expect(budgetTool?.function.parameters).toHaveProperty("properties");
      expect(budgetTool?.function.parameters).toHaveProperty("required");
    });

    it("should include all required parameters", () => {
      const registry = new ToolRegistry();
      const tools = registry.getOpenAITools();

      const tripBudgetTool = tools.find(
        (t) => t.function.name === "compute_trip_budget"
      );
      expect(tripBudgetTool?.function.parameters.required).toContain("month");
      expect(tripBudgetTool?.function.parameters.required).toContain("tripCost");
    });
  });

  // ---------------------------------------------------------------------------
  // Argument Validation
  // ---------------------------------------------------------------------------

  describe("validateArgs", () => {
    it("should validate valid month params", () => {
      const registry = new ToolRegistry();
      const result = registry.validateArgs("get_remaining_budget", {
        month: "2025-02",
      });

      expect(result).toEqual({ month: "2025-02" });
    });

    it("should throw on invalid month format", () => {
      const registry = new ToolRegistry();

      expect(() =>
        registry.validateArgs("get_remaining_budget", { month: "2025-2" })
      ).toThrow();

      expect(() =>
        registry.validateArgs("get_remaining_budget", { month: "Feb 2025" })
      ).toThrow();
    });

    it("should validate valid date range params", () => {
      const registry = new ToolRegistry();
      const result = registry.validateArgs("get_upcoming_expenses", {
        fromDate: "2025-02-01",
        toDate: "2025-02-28",
      });

      expect(result).toEqual({
        fromDate: "2025-02-01",
        toDate: "2025-02-28",
      });
    });

    it("should throw on invalid date format", () => {
      const registry = new ToolRegistry();

      expect(() =>
        registry.validateArgs("get_upcoming_expenses", {
          fromDate: "2025/02/01",
          toDate: "2025-02-28",
        })
      ).toThrow();
    });

    it("should validate valid trip budget params", () => {
      const registry = new ToolRegistry();
      const result = registry.validateArgs("compute_trip_budget", {
        month: "2025-12",
        tripCost: 5000,
      });

      expect(result).toEqual({ month: "2025-12", tripCost: 5000 });
    });

    it("should throw on negative trip cost", () => {
      const registry = new ToolRegistry();

      expect(() =>
        registry.validateArgs("compute_trip_budget", {
          month: "2025-12",
          tripCost: -100,
        })
      ).toThrow();
    });

    it("should throw for unknown tool", () => {
      const registry = new ToolRegistry();

      expect(() =>
        registry.validateArgs("unknown" as ToolName, {})
      ).toThrow("Unknown tool");
    });

    it("should validate valid summary range params", () => {
      const registry = new ToolRegistry();
      const result = registry.validateArgs("get_summary_range", {
        fromDate: "2025-01-01",
        toDate: "2025-06-30",
      });

      expect(result).toEqual({
        fromDate: "2025-01-01",
        toDate: "2025-06-30",
        includeIncome: true,
        includeExpenses: true,
      });
    });

    it("should throw on invalid date range (from > to)", () => {
      const registry = new ToolRegistry();

      expect(() =>
        registry.validateArgs("get_summary_range", {
          fromDate: "2025-12-31",
          toDate: "2025-01-01",
        })
      ).toThrow();
    });

    it("should validate valid income summary params", () => {
      const registry = new ToolRegistry();
      const result = registry.validateArgs("get_income_summary", {
        month: "2025-02",
      });

      expect(result).toEqual({ month: "2025-02" });
    });

    it("should validate valid expenses summary params", () => {
      const registry = new ToolRegistry();
      const result = registry.validateArgs("get_expenses_summary", {
        month: "2025-02",
      });

      expect(result).toEqual({ month: "2025-02" });
    });
  });

  // ---------------------------------------------------------------------------
  // Safe Validation
  // ---------------------------------------------------------------------------

  describe("safeValidateArgs", () => {
    it("should return success for valid args", () => {
      const registry = new ToolRegistry();
      const result = registry.safeValidateArgs("get_remaining_budget", {
        month: "2025-02",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ month: "2025-02" });
      }
    });

    it("should return error for invalid args", () => {
      const registry = new ToolRegistry();
      const result = registry.safeValidateArgs("get_remaining_budget", {
        month: "invalid",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("YYYY-MM");
      }
    });

    it("should return error for missing required args", () => {
      const registry = new ToolRegistry();
      const result = registry.safeValidateArgs("compute_trip_budget", {
        month: "2025-02",
        // tripCost is missing
      });

      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// Zod Schema Unit Tests
// =============================================================================

describe("Zod Schemas", () => {
  describe("MonthParamSchema", () => {
    it("should accept valid YYYY-MM format", () => {
      expect(MonthParamSchema.safeParse({ month: "2025-01" }).success).toBe(true);
      expect(MonthParamSchema.safeParse({ month: "2025-12" }).success).toBe(true);
      expect(MonthParamSchema.safeParse({ month: "1999-06" }).success).toBe(true);
    });

    it("should reject invalid month values", () => {
      expect(MonthParamSchema.safeParse({ month: "2025-00" }).success).toBe(false);
      expect(MonthParamSchema.safeParse({ month: "2025-13" }).success).toBe(false);
      expect(MonthParamSchema.safeParse({ month: "2025-1" }).success).toBe(false);
    });
  });

  describe("DateRangeParamSchema", () => {
    it("should accept valid YYYY-MM-DD format", () => {
      const result = DateRangeParamSchema.safeParse({
        fromDate: "2025-02-01",
        toDate: "2025-02-28",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid date format", () => {
      const result = DateRangeParamSchema.safeParse({
        fromDate: "02-01-2025",
        toDate: "2025-02-28",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("TripBudgetParamSchema", () => {
    it("should accept positive trip cost", () => {
      const result = TripBudgetParamSchema.safeParse({
        month: "2025-06",
        tripCost: 5000,
      });
      expect(result.success).toBe(true);
    });

    it("should reject zero trip cost", () => {
      const result = TripBudgetParamSchema.safeParse({
        month: "2025-06",
        tripCost: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative trip cost", () => {
      const result = TripBudgetParamSchema.safeParse({
        month: "2025-06",
        tripCost: -500,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("SummaryRangeParamSchema", () => {
    it("should accept valid date range with defaults", () => {
      const result = SummaryRangeParamSchema.safeParse({
        fromDate: "2025-01-01",
        toDate: "2025-06-30",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeIncome).toBe(true);
        expect(result.data.includeExpenses).toBe(true);
      }
    });

    it("should accept valid date range with explicit toggles", () => {
      const result = SummaryRangeParamSchema.safeParse({
        fromDate: "2025-01-01",
        toDate: "2025-06-30",
        includeIncome: false,
        includeExpenses: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeIncome).toBe(false);
        expect(result.data.includeExpenses).toBe(true);
      }
    });

    it("should reject invalid date format", () => {
      const result = SummaryRangeParamSchema.safeParse({
        fromDate: "01-01-2025",
        toDate: "2025-06-30",
      });
      expect(result.success).toBe(false);
    });

    it("should reject when fromDate is after toDate", () => {
      const result = SummaryRangeParamSchema.safeParse({
        fromDate: "2025-06-30",
        toDate: "2025-01-01",
      });
      expect(result.success).toBe(false);
    });

    it("should accept same date for fromDate and toDate", () => {
      const result = SummaryRangeParamSchema.safeParse({
        fromDate: "2025-03-15",
        toDate: "2025-03-15",
      });
      expect(result.success).toBe(true);
    });
  });
});
