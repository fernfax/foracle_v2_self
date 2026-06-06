import { describe, it, expect } from "vitest";
import {
  calculateCPF,
  computeCpfContributions,
  calculateBonusCPF,
  getCPFRatesByAge,
  getCPFAllocationByAge,
  OW_CEILING_AMOUNT,
  ANNUAL_WAGE_CEILING_AMOUNT,
  CPF_LOW_WAGE_NO_CPF,
  CPF_LOW_WAGE_NO_EMPLOYEE,
  CPF_LOW_WAGE_PHASE_IN_END,
} from "@/lib/cpf-calculator";

// Reference values pinned to the 1 Jan 2026 CPF rate/ceiling/allocation tables.
// Maps to §5C of the Income QA plan (the "Unit" layer in §6). The calc engine
// returns precise figures; the UI rounds to whole dollars at the display layer,
// so assertions here use the engine's cent-level values.
//
// ≤55 rates: employee 20% / employer 17%. OW ceiling $8,000/mo.

describe("getCPFRatesByAge — age bands", () => {
  it.each([
    [30, 0.2, 0.17],
    [55, 0.2, 0.17],
    [58, 0.17, 0.155], // above 55–60 (CPF-10, senior band)
    [62, 0.115, 0.12], // above 60–65
    [68, 0.075, 0.09], // above 65–70
    [72, 0.05, 0.075], // above 70
  ])("age %i → employee %f / employer %f", (age, employee, employer) => {
    expect(getCPFRatesByAge(age)).toEqual({ employee, employer });
  });
});

describe("calculateCPF — baseline & ceiling (CPF-01..03)", () => {
  it("CPF-01: $5,000 @35 → EE $1,000, ER $850, total $1,850, net $4,000", () => {
    const r = calculateCPF(5000, 35);
    expect(r.employeeCpfContribution).toBe(1000);
    expect(r.employerCpfContribution).toBe(850);
    expect(r.totalCpfContribution).toBe(1850);
    expect(r.netTakeHome).toBe(4000);
    expect(r.cpfApplicableAmount).toBe(5000);
  });

  it("CPF-02: exactly at OW ceiling ($8,000) → EE $1,600, ER $1,360, total $2,960", () => {
    const r = calculateCPF(8000, 40);
    expect(r.employeeCpfContribution).toBe(1600);
    expect(r.employerCpfContribution).toBe(1360);
    expect(r.totalCpfContribution).toBe(2960);
  });

  it("CPF-03: above ceiling ($12,000) → CPF computed on $8,000 only (EE $1,600, net $10,400)", () => {
    const r = calculateCPF(12000, 40);
    expect(r.cpfApplicableAmount).toBe(OW_CEILING_AMOUNT);
    expect(r.employeeCpfContribution).toBe(1600); // not 12000 * 0.2 = 2400
    expect(r.employerCpfContribution).toBe(1360);
    expect(r.netTakeHome).toBe(10400); // 12000 - 1600
  });

  it("CPF-04: $7,999 (just below ceiling) → EE $1,599.80 at the engine level", () => {
    const r = calculateCPF(7999, 35);
    // Engine keeps cents; the pad/UI rounds this to $1,600 for display.
    expect(r.employeeCpfContribution).toBeCloseTo(1599.8, 2);
    expect(r.employerCpfContribution).toBeCloseTo(1359.83, 2);
  });
});

describe("computeCpfContributions — low-wage rules (CPF-11/12)", () => {
  const rates = { employee: 0.2, employer: 0.17 };

  it.each([
    // wage, expected employee, expected employer
    [40, 0, 0], // ≤ $50: no CPF at all
    [50, 0, 0], // boundary: still no CPF
    [400, 0, 68], // $50–$500: employer-only (CPF-12)
    [500, 0, 85], // boundary: employee still nil
    [600, 60, 102], // $500–$750 phase-in: 0.6*(600-500)=$60 (CPF-11)
    [700, 120, 119], // 0.6*(700-500)=$120
    [750, 150, 127.5], // continuity: phased $150 === full 20%*750
    [751, 150.2, 127.67], // just above: full rate kicks in (751*0.2)
    [5000, 1000, 850], // normal full rate
  ])("wage $%i → employee $%f / employer $%f", (wage, ee, er) => {
    const r = computeCpfContributions(wage, rates);
    expect(r.employee).toBeCloseTo(ee, 2);
    expect(r.employer).toBeCloseTo(er, 2);
  });

  it("phase-in is continuous at $750 for EVERY age band (no step at the boundary)", () => {
    for (const age of [30, 58, 62, 68, 72]) {
      const rate = getCPFRatesByAge(age);
      const phased = computeCpfContributions(CPF_LOW_WAGE_PHASE_IN_END, rate);
      const fullRate = computeCpfContributions(CPF_LOW_WAGE_PHASE_IN_END + 1, rate);
      // phased employee at $750 ≈ full-rate employee at $750
      expect(phased.employee).toBeCloseTo(rate.employee * CPF_LOW_WAGE_PHASE_IN_END, 2);
      // and the function doesn't jump discontinuously just past the boundary
      expect(fullRate.employee).toBeGreaterThan(phased.employee);
    }
  });

  it("low-wage thresholds match CPF Board values", () => {
    expect(CPF_LOW_WAGE_NO_CPF).toBe(50);
    expect(CPF_LOW_WAGE_NO_EMPLOYEE).toBe(500);
    expect(CPF_LOW_WAGE_PHASE_IN_END).toBe(750);
  });
});

describe("calculateCPF flows low-wage rules through (CPF-12)", () => {
  it("$400 → employee $0, employer $68, take-home unchanged ($400)", () => {
    const r = calculateCPF(400, 35);
    expect(r.employeeCpfContribution).toBe(0);
    expect(r.employerCpfContribution).toBe(68);
    expect(r.netTakeHome).toBe(400);
  });

  it("senior worker (age 58, $5,000) → above-55 rates: EE $850 (17%), ER $775 (15.5%)", () => {
    const r = calculateCPF(5000, 58);
    expect(r.employeeCpfContribution).toBe(850);
    expect(r.employerCpfContribution).toBe(775);
  });
});

describe("OA/SA/MA allocation (CPF-16/17)", () => {
  it("age 35 allocation rates sum to 1 and match the 2026 table", () => {
    const a = getCPFAllocationByAge(35);
    expect(a).toEqual({ oa: 0.6217, sa: 0.1622, ma: 0.2162 });
    expect(a.oa + a.sa + a.ma).toBeCloseTo(1, 2);
  });

  it("allocation shifts toward MA with age (CPF-17)", () => {
    const young = getCPFAllocationByAge(30);
    const old = getCPFAllocationByAge(66);
    expect(old.ma).toBeGreaterThan(young.ma);
    expect(old.oa).toBeLessThan(young.oa);
  });

  it.each([30, 40, 48, 53, 58, 63, 70])(
    "age %i allocation sums to 1",
    (age) => {
      const a = getCPFAllocationByAge(age);
      expect(a.oa + a.sa + a.ma).toBeCloseTo(1, 2);
    }
  );
});

describe("Bonus / Additional Wage ceiling (CPF-13/14)", () => {
  it("CPF-13: bonus within AW ceiling fully attracts CPF", () => {
    // $5,000/mo → annual OW $60,000; AW ceiling room = $102,000 - $60,000 = $42,000.
    const r = calculateBonusCPF(5000, 10000, 35);
    expect(r.bonusCpfApplicableAmount).toBe(10000); // whole bonus
    expect(r.bonusEmployeeCpf).toBe(2000); // 10000 * 0.20
    expect(r.bonusEmployerCpf).toBe(1700); // 10000 * 0.17
  });

  it("CPF-14: bonus exceeding AW ceiling is capped to the remaining room", () => {
    // $8,000/mo (capped) → annual OW $96,000; AW room = $102,000 - $96,000 = $6,000.
    const r = calculateBonusCPF(8000, 15000, 35);
    expect(r.remainingAnnualCeiling).toBe(6000);
    expect(r.bonusCpfApplicableAmount).toBe(6000); // only $6k of the $15k bonus
    expect(r.bonusEmployeeCpf).toBe(1200); // 6000 * 0.20
  });

  it("OW above ceiling still caps the annual base at $96,000 for AW room", () => {
    // $12,000/mo OW capped at $8,000 → annual base $96,000.
    const r = calculateBonusCPF(12000, 20000, 35);
    expect(r.remainingAnnualCeiling).toBe(6000);
    expect(r.bonusCpfApplicableAmount).toBe(6000);
  });
});

describe("constants pinned to 2026", () => {
  it("OW ceiling $8,000, AW ceiling $102,000", () => {
    expect(OW_CEILING_AMOUNT).toBe(8000);
    expect(ANNUAL_WAGE_CEILING_AMOUNT).toBe(102000);
  });
});
