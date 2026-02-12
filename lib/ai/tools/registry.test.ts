import { describe, it, expect, beforeEach } from "vitest";
import {
  ToolRegistry,
  getToolRegistry,
  resetToolRegistry,
  MonthParamSchema,
  FamilySummaryParamSchema,
  BalanceSummaryParamSchema,
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

      expect(toolNames).toContain("get_income_summary");
      expect(toolNames).toContain("get_expenses_summary");
      expect(toolNames).toContain("get_family_summary");
      expect(toolNames).toContain("get_balance_summary");
      expect(toolNames).toHaveLength(4);
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

      expect(registry.isAllowed("get_income_summary")).toBe(true);
      expect(registry.isAllowed("get_expenses_summary")).toBe(true);
      expect(registry.isAllowed("get_family_summary")).toBe(true);
      expect(registry.isAllowed("get_balance_summary")).toBe(true);
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
      const def = registry.getDefinition("get_income_summary");

      expect(def).toBeDefined();
      expect(def?.name).toBe("get_income_summary");
      expect(def?.description).toContain("income");
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

      expect(tools).toHaveLength(4);

      const incomeTool = tools.find(
        (t) => t.function.name === "get_income_summary"
      );
      expect(incomeTool).toBeDefined();
      expect(incomeTool?.type).toBe("function");
      expect(incomeTool?.function.description).toBeDefined();
      expect(incomeTool?.function.parameters).toHaveProperty("type", "object");
      expect(incomeTool?.function.parameters).toHaveProperty("properties");
      expect(incomeTool?.function.parameters).toHaveProperty("required");
    });

    it("should include all required parameters", () => {
      const registry = new ToolRegistry();
      const tools = registry.getOpenAITools();

      const incomeTool = tools.find(
        (t) => t.function.name === "get_income_summary"
      );
      expect(incomeTool?.function.parameters.required).toContain("month");
    });
  });

  // ---------------------------------------------------------------------------
  // Argument Validation
  // ---------------------------------------------------------------------------

  describe("validateArgs", () => {
    it("should validate valid month params for income summary", () => {
      const registry = new ToolRegistry();
      const result = registry.validateArgs("get_income_summary", {
        month: "2025-02",
      });

      expect(result).toEqual({ month: "2025-02" });
    });

    it("should throw on invalid month format", () => {
      const registry = new ToolRegistry();

      expect(() =>
        registry.validateArgs("get_income_summary", { month: "2025-2" })
      ).toThrow();

      expect(() =>
        registry.validateArgs("get_income_summary", { month: "Feb 2025" })
      ).toThrow();
    });

    it("should validate valid expenses summary params", () => {
      const registry = new ToolRegistry();
      const result = registry.validateArgs("get_expenses_summary", {
        month: "2025-02",
      });

      expect(result).toEqual({ month: "2025-02" });
    });

    it("should validate valid family summary params with defaults", () => {
      const registry = new ToolRegistry();
      const result = registry.validateArgs("get_family_summary", {});

      expect(result).toEqual({ scope: "auto" });
    });

    it("should validate valid family summary params with all options", () => {
      const registry = new ToolRegistry();
      const result = registry.validateArgs("get_family_summary", {
        scope: "member",
        month: "2025-02",
        memberName: "Bei Yu",
      });

      expect(result).toEqual({
        scope: "member",
        month: "2025-02",
        memberName: "Bei Yu",
      });
    });

    it("should throw for unknown tool", () => {
      const registry = new ToolRegistry();

      expect(() =>
        registry.validateArgs("unknown" as ToolName, {})
      ).toThrow("Unknown tool");
    });
  });

  // ---------------------------------------------------------------------------
  // Safe Validation
  // ---------------------------------------------------------------------------

  describe("safeValidateArgs", () => {
    it("should return success for valid args", () => {
      const registry = new ToolRegistry();
      const result = registry.safeValidateArgs("get_income_summary", {
        month: "2025-02",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ month: "2025-02" });
      }
    });

    it("should return error for invalid args", () => {
      const registry = new ToolRegistry();
      const result = registry.safeValidateArgs("get_income_summary", {
        month: "invalid",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("YYYY-MM");
      }
    });

    it("should return success for family summary with no args", () => {
      const registry = new ToolRegistry();
      const result = registry.safeValidateArgs("get_family_summary", {});

      expect(result.success).toBe(true);
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

  describe("FamilySummaryParamSchema", () => {
    it("should accept valid scope values", () => {
      expect(FamilySummaryParamSchema.safeParse({ scope: "household" }).success).toBe(true);
      expect(FamilySummaryParamSchema.safeParse({ scope: "member" }).success).toBe(true);
      expect(FamilySummaryParamSchema.safeParse({ scope: "auto" }).success).toBe(true);
    });

    it("should use default scope when not provided", () => {
      const result = FamilySummaryParamSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scope).toBe("auto");
      }
    });

    it("should accept optional month parameter", () => {
      const result = FamilySummaryParamSchema.safeParse({
        month: "2025-02",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.month).toBe("2025-02");
      }
    });

    it("should reject invalid month format", () => {
      const result = FamilySummaryParamSchema.safeParse({
        month: "02-2025",
      });
      expect(result.success).toBe(false);
    });

    it("should accept memberName parameter", () => {
      const result = FamilySummaryParamSchema.safeParse({
        memberName: "Bei Yu",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.memberName).toBe("Bei Yu");
      }
    });
  });

  describe("BalanceSummaryParamSchema", () => {
    it("should accept valid date range", () => {
      const result = BalanceSummaryParamSchema.safeParse({
        fromMonth: "2025-01",
        toMonth: "2025-12",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fromMonth).toBe("2025-01");
        expect(result.data.toMonth).toBe("2025-12");
      }
    });

    it("should reject invalid month format", () => {
      const result = BalanceSummaryParamSchema.safeParse({
        fromMonth: "01-2025",
        toMonth: "2025-12",
      });
      expect(result.success).toBe(false);
    });

    it("should accept optional hypothetical expense", () => {
      const result = BalanceSummaryParamSchema.safeParse({
        fromMonth: "2025-01",
        toMonth: "2025-12",
        hypotheticalExpense: 5000,
        hypotheticalExpenseMonth: "2025-06",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hypotheticalExpense).toBe(5000);
        expect(result.data.hypotheticalExpenseMonth).toBe("2025-06");
      }
    });

    it("should accept optional hypothetical income", () => {
      const result = BalanceSummaryParamSchema.safeParse({
        fromMonth: "2025-01",
        toMonth: "2025-12",
        hypotheticalIncome: 10000,
        hypotheticalIncomeMonth: "2025-03",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hypotheticalIncome).toBe(10000);
        expect(result.data.hypotheticalIncomeMonth).toBe("2025-03");
      }
    });

    it("should reject negative hypothetical expense", () => {
      const result = BalanceSummaryParamSchema.safeParse({
        fromMonth: "2025-01",
        toMonth: "2025-12",
        hypotheticalExpense: -500,
      });
      expect(result.success).toBe(false);
    });

    it("should require both fromMonth and toMonth", () => {
      const result = BalanceSummaryParamSchema.safeParse({
        fromMonth: "2025-01",
      });
      expect(result.success).toBe(false);
    });
  });
});
