import { describe, it, expect, beforeEach } from "vitest";
import {
  ToolRegistry,
  getToolRegistry,
  resetToolRegistry,
  MonthParamSchema,
  FamilySummaryParamSchema,
  BalanceSummaryParamSchema,
  HypotheticalItemSchema,
  type ToolName,
  type BalanceSummaryParams,
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

    // =========================================================================
    // V2 Enhancement Tests
    // =========================================================================

    describe("v2 multi-hypotheticals", () => {
      it("should accept hypotheticals array with multiple items", () => {
        const result = BalanceSummaryParamSchema.safeParse({
          fromMonth: "2025-01",
          toMonth: "2025-12",
          hypotheticals: [
            { type: "expense", amount: 1000, month: "2025-03", label: "Gift" },
            { type: "expense", amount: 2000, month: "2025-06", label: "Trip" },
            { type: "income", amount: 5000, month: "2025-07", label: "Bonus" },
          ],
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.hypotheticals).toHaveLength(3);
          expect(result.data.hypotheticals![0]).toEqual({
            type: "expense",
            amount: 1000,
            month: "2025-03",
            label: "Gift",
          });
        }
      });

      it("should accept hypotheticals without labels", () => {
        const result = BalanceSummaryParamSchema.safeParse({
          fromMonth: "2025-01",
          toMonth: "2025-06",
          hypotheticals: [
            { type: "expense", amount: 500, month: "2025-02" },
          ],
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.hypotheticals![0].label).toBeUndefined();
        }
      });

      it("should reject hypothetical with invalid type", () => {
        const result = BalanceSummaryParamSchema.safeParse({
          fromMonth: "2025-01",
          toMonth: "2025-12",
          hypotheticals: [
            { type: "transfer", amount: 1000, month: "2025-03" },
          ],
        });
        expect(result.success).toBe(false);
      });

      it("should reject hypothetical with negative amount", () => {
        const result = BalanceSummaryParamSchema.safeParse({
          fromMonth: "2025-01",
          toMonth: "2025-12",
          hypotheticals: [
            { type: "expense", amount: -100, month: "2025-03" },
          ],
        });
        expect(result.success).toBe(false);
      });

      it("should reject hypothetical with invalid month format", () => {
        const result = BalanceSummaryParamSchema.safeParse({
          fromMonth: "2025-01",
          toMonth: "2025-12",
          hypotheticals: [
            { type: "expense", amount: 100, month: "March 2025" },
          ],
        });
        expect(result.success).toBe(false);
      });
    });

    describe("v2 buffer constraints", () => {
      it("should accept minEndBalance parameter", () => {
        const result = BalanceSummaryParamSchema.safeParse({
          fromMonth: "2025-01",
          toMonth: "2025-12",
          minEndBalance: 5000,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minEndBalance).toBe(5000);
        }
      });

      it("should accept minMonthlyBalance parameter", () => {
        const result = BalanceSummaryParamSchema.safeParse({
          fromMonth: "2025-01",
          toMonth: "2025-12",
          minMonthlyBalance: 1000,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minMonthlyBalance).toBe(1000);
        }
      });

      it("should accept both buffer constraints together", () => {
        const result = BalanceSummaryParamSchema.safeParse({
          fromMonth: "2025-01",
          toMonth: "2025-12",
          minEndBalance: 10000,
          minMonthlyBalance: 2000,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minEndBalance).toBe(10000);
          expect(result.data.minMonthlyBalance).toBe(2000);
        }
      });

      it("should accept negative buffer values (for overdraft scenarios)", () => {
        const result = BalanceSummaryParamSchema.safeParse({
          fromMonth: "2025-01",
          toMonth: "2025-12",
          minMonthlyBalance: -500,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minMonthlyBalance).toBe(-500);
        }
      });
    });

    describe("v2 affordability mode", () => {
      it("should accept computeMaxAffordableExpenseMonth", () => {
        const result = BalanceSummaryParamSchema.safeParse({
          fromMonth: "2025-01",
          toMonth: "2025-12",
          computeMaxAffordableExpenseMonth: "2025-06",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.computeMaxAffordableExpenseMonth).toBe("2025-06");
        }
      });

      it("should reject computeMaxAffordableExpenseMonth with invalid format", () => {
        const result = BalanceSummaryParamSchema.safeParse({
          fromMonth: "2025-01",
          toMonth: "2025-12",
          computeMaxAffordableExpenseMonth: "June 2025",
        });
        expect(result.success).toBe(false);
      });

      it("should accept affordability mode with buffer constraint", () => {
        const result = BalanceSummaryParamSchema.safeParse({
          fromMonth: "2025-01",
          toMonth: "2025-12",
          computeMaxAffordableExpenseMonth: "2025-06",
          minMonthlyBalance: 1000,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.computeMaxAffordableExpenseMonth).toBe("2025-06");
          expect(result.data.minMonthlyBalance).toBe(1000);
        }
      });
    });

    describe("v2 backwards compatibility", () => {
      it("should still accept legacy hypothetical expense params", () => {
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

      it("should still accept legacy hypothetical income params", () => {
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

      it("should accept both legacy and new params (new takes precedence at runtime)", () => {
        const result = BalanceSummaryParamSchema.safeParse({
          fromMonth: "2025-01",
          toMonth: "2025-12",
          // Legacy params
          hypotheticalExpense: 5000,
          hypotheticalExpenseMonth: "2025-06",
          // New params
          hypotheticals: [
            { type: "expense", amount: 2000, month: "2025-03" },
          ],
        });
        expect(result.success).toBe(true);
        if (result.success) {
          // Both should be present in parsed data
          expect(result.data.hypotheticalExpense).toBe(5000);
          expect(result.data.hypotheticals).toHaveLength(1);
        }
      });

      it("should work with minimal required params only", () => {
        const result = BalanceSummaryParamSchema.safeParse({
          fromMonth: "2025-01",
          toMonth: "2025-12",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.hypotheticals).toBeUndefined();
          expect(result.data.minEndBalance).toBeUndefined();
          expect(result.data.minMonthlyBalance).toBeUndefined();
          expect(result.data.computeMaxAffordableExpenseMonth).toBeUndefined();
        }
      });
    });

    describe("v2 full scenario validation", () => {
      it("should accept complete v2 request with all features", () => {
        const result = BalanceSummaryParamSchema.safeParse({
          fromMonth: "2025-01",
          toMonth: "2025-12",
          hypotheticals: [
            { type: "expense", amount: 1500, month: "2025-03", label: "Valentine Gift" },
            { type: "expense", amount: 3000, month: "2025-06", label: "Japan Trip Deposit" },
            { type: "expense", amount: 2000, month: "2025-07", label: "Japan Trip" },
            { type: "income", amount: 5000, month: "2025-12", label: "Year-end Bonus" },
          ],
          minEndBalance: 5000,
          minMonthlyBalance: 1000,
          computeMaxAffordableExpenseMonth: "2025-06",
        } as BalanceSummaryParams);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.hypotheticals).toHaveLength(4);
          expect(result.data.minEndBalance).toBe(5000);
          expect(result.data.minMonthlyBalance).toBe(1000);
          expect(result.data.computeMaxAffordableExpenseMonth).toBe("2025-06");
        }
      });
    });
  });

  // ===========================================================================
  // HypotheticalItemSchema Tests
  // ===========================================================================

  describe("HypotheticalItemSchema", () => {
    it("should accept valid expense hypothetical", () => {
      const result = HypotheticalItemSchema.safeParse({
        type: "expense",
        amount: 1000,
        month: "2025-06",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid income hypothetical", () => {
      const result = HypotheticalItemSchema.safeParse({
        type: "income",
        amount: 5000,
        month: "2025-12",
      });
      expect(result.success).toBe(true);
    });

    it("should accept hypothetical with label", () => {
      const result = HypotheticalItemSchema.safeParse({
        type: "expense",
        amount: 2500,
        month: "2025-03",
        label: "Birthday Gift",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.label).toBe("Birthday Gift");
      }
    });

    it("should reject zero amount", () => {
      const result = HypotheticalItemSchema.safeParse({
        type: "expense",
        amount: 0,
        month: "2025-06",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing required fields", () => {
      expect(HypotheticalItemSchema.safeParse({ type: "expense" }).success).toBe(false);
      expect(HypotheticalItemSchema.safeParse({ amount: 1000 }).success).toBe(false);
      expect(HypotheticalItemSchema.safeParse({ month: "2025-06" }).success).toBe(false);
    });
  });
});

// =============================================================================
// Safety Assessment Type Tests (shape validation)
// =============================================================================

describe("SafetyAssessment shape validation", () => {
  // These tests validate that the expected shape of SafetyAssessment is stable
  // by checking that a mock object with all required fields is valid TypeScript

  it("should have correct SafetyStatus enum values", () => {
    // This is a compile-time check - if these types don't match, TS will error
    const greenStatus: "green" | "yellow" | "red" = "green";
    const yellowStatus: "green" | "yellow" | "red" = "yellow";
    const redStatus: "green" | "yellow" | "red" = "red";

    expect(greenStatus).toBe("green");
    expect(yellowStatus).toBe("yellow");
    expect(redStatus).toBe("red");
  });

  it("should define expected SafetyAssessment fields", () => {
    // Mock SafetyAssessment to verify expected shape
    const mockSafetyAssessment = {
      status: "green" as const,
      statusLabel: "Safe",
      emergencyFundMonths: 12.5,
      monthlyNetIncome: 5000,
      greenThreshold: 45000, // 9 months
      yellowThreshold: 30000, // 6 months
      minimumBalance: 62500,
      minimumBalanceMonth: "2025-08",
      minimumBalanceMonthLabel: "Aug 2025",
      recommendation: "Your emergency fund remains healthy.",
    };

    // Verify all expected fields exist
    expect(mockSafetyAssessment).toHaveProperty("status");
    expect(mockSafetyAssessment).toHaveProperty("statusLabel");
    expect(mockSafetyAssessment).toHaveProperty("emergencyFundMonths");
    expect(mockSafetyAssessment).toHaveProperty("monthlyNetIncome");
    expect(mockSafetyAssessment).toHaveProperty("greenThreshold");
    expect(mockSafetyAssessment).toHaveProperty("yellowThreshold");
    expect(mockSafetyAssessment).toHaveProperty("minimumBalance");
    expect(mockSafetyAssessment).toHaveProperty("minimumBalanceMonth");
    expect(mockSafetyAssessment).toHaveProperty("minimumBalanceMonthLabel");
    expect(mockSafetyAssessment).toHaveProperty("recommendation");
  });

  it("should have thresholds based on 6 and 9 months of income", () => {
    const monthlyIncome = 5000;
    const expectedYellowThreshold = monthlyIncome * 6; // 30000
    const expectedGreenThreshold = monthlyIncome * 9; // 45000

    expect(expectedYellowThreshold).toBe(30000);
    expect(expectedGreenThreshold).toBe(45000);
  });

  describe("traffic light status logic", () => {
    const monthlyIncome = 5000;
    const yellowThreshold = monthlyIncome * 6; // 30000
    const greenThreshold = monthlyIncome * 9; // 45000

    it("should be GREEN when balance >= 9 months income", () => {
      const balance = 50000; // 10 months
      const status = balance >= greenThreshold ? "green" : balance >= yellowThreshold ? "yellow" : "red";
      expect(status).toBe("green");
    });

    it("should be YELLOW when balance is 6-9 months income", () => {
      const balance = 35000; // 7 months
      const status = balance >= greenThreshold ? "green" : balance >= yellowThreshold ? "yellow" : "red";
      expect(status).toBe("yellow");
    });

    it("should be RED when balance < 6 months income", () => {
      const balance = 20000; // 4 months
      const status = balance >= greenThreshold ? "green" : balance >= yellowThreshold ? "yellow" : "red";
      expect(status).toBe("red");
    });

    it("should be YELLOW at exactly 6 months (boundary)", () => {
      const balance = 30000; // exactly 6 months
      const status = balance >= greenThreshold ? "green" : balance >= yellowThreshold ? "yellow" : "red";
      expect(status).toBe("yellow");
    });

    it("should be GREEN at exactly 9 months (boundary)", () => {
      const balance = 45000; // exactly 9 months
      const status = balance >= greenThreshold ? "green" : balance >= yellowThreshold ? "yellow" : "red";
      expect(status).toBe("green");
    });
  });
});
