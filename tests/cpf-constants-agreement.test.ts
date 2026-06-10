import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  CPF_RATES,
  CPF_RATE_BAND_ORDER,
  CPF_RATE_BAND_LABELS,
  CPF_ALLOCATION_RATES,
  CPF_ALLOCATION_BAND_ORDER,
  OW_CEILING,
  ANNUAL_WAGE_CEILING,
  CPF_ANNUAL_LIMIT,
  CPF_EFFECTIVE_FROM,
} from "@/lib/cpf-constants";
import {
  getCPFRatesByAge,
  getCPFBracketIndex,
  getCPFAllocationByAge,
  getCPFAllocationBracketIndex,
  CPF_RATE_BRACKETS,
  CPF_ALLOCATION_BRACKETS,
  OW_CEILING_AMOUNT,
  ANNUAL_WAGE_CEILING_AMOUNT,
} from "@/lib/cpf-calculator";

// The CPF audit found the engine on stale 2025 rates while the AI knowledge
// base text already had 2026 — three copies of the same numbers, drifting.
// This test pins engine == display brackets == knowledge-base text to the one
// constants module, so a January rate change that misses any consumer fails CI.

const norm = (s: string) => s.replace(/\s+/g, "");
const ratePct = (frac: number) => Math.round(frac * 1000) / 10;
// One sample age inside each rate band, in CPF_RATE_BAND_ORDER order.
const RATE_BAND_SAMPLE_AGE = [30, 58, 63, 68, 73];

describe("engine ↔ constants", () => {
  it("getCPFRatesByAge returns the constant rates for every band", () => {
    CPF_RATE_BAND_ORDER.forEach((band, i) => {
      expect(getCPFRatesByAge(RATE_BAND_SAMPLE_AGE[i])).toEqual(CPF_RATES[band]);
    });
  });

  it("getCPFAllocationByAge returns the constant allocations for a sample of bands", () => {
    expect(getCPFAllocationByAge(30)).toEqual(CPF_ALLOCATION_RATES["35_and_below"]);
    expect(getCPFAllocationByAge(63)).toEqual(CPF_ALLOCATION_RATES["above_60_to_65"]);
    expect(getCPFAllocationByAge(70)).toEqual(CPF_ALLOCATION_RATES["above_65"]);
  });

  it("ceilings re-exported from the engine match the constants", () => {
    expect(OW_CEILING_AMOUNT).toBe(OW_CEILING);
    expect(ANNUAL_WAGE_CEILING_AMOUNT).toBe(ANNUAL_WAGE_CEILING);
  });
});

describe("display brackets ↔ constants (derived, no drift)", () => {
  it("CPF_RATE_BRACKETS are derived from CPF_RATES with no float dust", () => {
    CPF_RATE_BAND_ORDER.forEach((band, i) => {
      const b = CPF_RATE_BRACKETS[getCPFBracketIndex(RATE_BAND_SAMPLE_AGE[i])];
      expect(b.label).toBe(CPF_RATE_BAND_LABELS[band]);
      expect(b.employer).toBe(ratePct(CPF_RATES[band].employer));
      expect(b.employee).toBe(ratePct(CPF_RATES[band].employee));
      expect(b.total).toBe(b.employer + b.employee);
      // no float dust: percentages render to at most one decimal place
      expect(Number.isInteger(b.employer * 10)).toBe(true);
      expect(Number.isInteger(b.employee * 10)).toBe(true);
    });
  });

  it("CPF_ALLOCATION_BRACKETS are derived from CPF_ALLOCATION_RATES", () => {
    CPF_ALLOCATION_BAND_ORDER.forEach((band) => {
      const idx = getCPFAllocationBracketIndex(
        band === "35_and_below" ? 30 : band === "above_65" ? 70 : 48
      );
      // spot-check the two endpoints precisely
      if (band === "35_and_below") {
        expect(CPF_ALLOCATION_BRACKETS[0]).toMatchObject(CPF_ALLOCATION_RATES["35_and_below"]);
      }
      expect(idx).toBeGreaterThanOrEqual(0);
    });
    // Full structural check: every bracket equals its rate band.
    CPF_ALLOCATION_BAND_ORDER.forEach((band, i) => {
      expect(CPF_ALLOCATION_BRACKETS[i]).toMatchObject(CPF_ALLOCATION_RATES[band]);
    });
  });
});

describe("AI knowledge base ↔ constants", () => {
  const kbRates = readFileSync(
    new URL("../scripts/cpf-knowledge-2026.ts", import.meta.url),
    "utf8"
  );
  const kbOwAw = readFileSync(
    new URL("../scripts/cpf-ow-aw-knowledge.ts", import.meta.url),
    "utf8"
  );
  const kbRatesNorm = norm(kbRates);

  it("the rates summary table matches the constant rates for every band", () => {
    CPF_RATE_BAND_ORDER.forEach((band) => {
      const employer = ratePct(CPF_RATES[band].employer);
      const employee = ratePct(CPF_RATES[band].employee);
      const total = employer + employee;
      // KB table columns: | Age | Total | Employer | Employee |
      const row = norm(
        `| ${CPF_RATE_BAND_LABELS[band]} | ${total}% | ${employer}% | ${employee}% |`
      );
      expect(kbRatesNorm).toContain(row);
    });
  });

  it("the knowledge base cites the current ceilings, annual limit, and effective date", () => {
    expect(kbRates).toContain(`$${OW_CEILING.toLocaleString()}`); // $8,000
    expect(kbRates).toContain(`$${ANNUAL_WAGE_CEILING.toLocaleString()}`); // $102,000
    expect(kbRates).toContain(`$${CPF_ANNUAL_LIMIT.toLocaleString()}`); // $37,740
    expect(kbRates).toContain(CPF_EFFECTIVE_FROM); // 2026-01-01

    expect(kbOwAw).toContain(`$${ANNUAL_WAGE_CEILING.toLocaleString()}`);
    expect(kbOwAw).toContain(`$${CPF_ANNUAL_LIMIT.toLocaleString()}`);
  });
});
