import { describe, it, expect } from "vitest";
import {
  calculateCPF,
  computeCpfContributions,
  calculateBonusCPF,
  computeBonusCPF,
  AnnualBonusCpf,
  computeAnnualBonusCpf,
  getCPFRatesByAge,
  getCPFAllocationByAge,
  getCPFBracketIndex,
  getCPFAllocationBracketIndex,
  CPF_RATE_BRACKETS,
  CPF_ALLOCATION_BRACKETS,
  OW_CEILING_AMOUNT,
  ANNUAL_WAGE_CEILING_AMOUNT,
  CPF_LOW_WAGE_NO_CPF,
  CPF_LOW_WAGE_NO_EMPLOYEE,
  CPF_LOW_WAGE_PHASE_IN_END,
  FRS_2026,
} from "@/lib/cpf-calculator";

// Reference values pinned to the 1 Jan 2026 CPF rate/ceiling/allocation tables.
// Maps to §5C of the Income QA plan (the "Unit" layer in §6). calculateCPF
// applies the statutory CPF rounding rule (total → nearest dollar with 50¢
// rounding up, employee share's cents dropped, employer = total − employee);
// the low-wage helper computeCpfContributions stays cent-precise.
//
// ≤55 rates: employee 20% / employer 17%. OW ceiling $8,000/mo.

describe("getCPFRatesByAge — age bands", () => {
  it.each([
    [30, 0.2, 0.17],
    [55, 0.2, 0.17],
    [56, 0.18, 0.16], // first age past the 55 boundary
    [58, 0.18, 0.16], // above 55–60 (CPF-10, senior band, 2026 rates)
    [60, 0.18, 0.16], // last age in the 55–60 band
    [61, 0.125, 0.125], // first age in the 60–65 band (9-point total cliff)
    [62, 0.125, 0.125], // above 60–65 (2026 rates)
    [65, 0.125, 0.125], // last age in the 60–65 band
    [66, 0.075, 0.09], // first age in the 65–70 band
    [68, 0.075, 0.09], // above 65–70
    [70, 0.075, 0.09], // last age in the 65–70 band
    [71, 0.05, 0.075], // first age above 70
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

  it("CPF-04: $7,999 (just below ceiling) → statutory rounding: EE $1,599, ER $1,361", () => {
    const r = calculateCPF(7999, 35);
    // Raw: EE 1,599.80 / ER 1,359.83 / total 2,959.63. Statutory: total → $2,960,
    // employee cents dropped → $1,599, employer = 2,960 − 1,599 = $1,361.
    expect(r.employeeCpfContribution).toBe(1599);
    expect(r.employerCpfContribution).toBe(1361);
    expect(r.totalCpfContribution).toBe(2960);
    expect(r.netTakeHome).toBe(6400); // 7,999 − 1,599
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

  it("senior worker (age 58, $5,000) → 2026 above-55 rates: EE $900 (18%), ER $800 (16%)", () => {
    const r = calculateCPF(5000, 58);
    expect(r.employeeCpfContribution).toBe(900);
    expect(r.employerCpfContribution).toBe(800);
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

  it("CPF-15: bonus CPF uses the 2026 senior rates (age 58 → 18%/16%)", () => {
    // $4,000/mo → annual OW $48,000; AW room $54,000 → whole $8,000 bonus attracts CPF.
    const r = calculateBonusCPF(4000, 8000, 58);
    expect(r.bonusCpfApplicableAmount).toBe(8000);
    expect(r.bonusEmployeeCpf).toBe(1440); // 8,000 × 0.18
    expect(r.bonusEmployerCpf).toBe(1280); // 8,000 × 0.16
  });

  it("computeBonusCPF applies the 2026 60–65 rates (age 63 → 12.5%/12.5%)", () => {
    // $7,000/mo → annual OW $84,000; AW room $18,000 → whole $10,000 bonus attracts CPF.
    const r = computeBonusCPF(7000, 10000, 63);
    expect(r.cpfApplicableBonus).toBe(10000);
    expect(r.employee).toBeCloseTo(1250, 2);
    expect(r.employer).toBeCloseTo(1250, 2);
  });
});

describe("statutory rounding + 2026 senior bands (CPF-05/10)", () => {
  it("$2,500 @73 → total $312.50 rounds UP to $313; EE $125, ER $188", () => {
    // The case the official CPF calculator answers $188 for — total to the
    // nearest dollar, employee cents dropped, employer takes the difference.
    const r = calculateCPF(2500, 73);
    expect(r.employeeCpfContribution).toBe(125);
    expect(r.employerCpfContribution).toBe(188);
    expect(r.totalCpfContribution).toBe(313);
    expect(r.netTakeHome).toBe(2375);
  });

  it("$700 @30 (low-wage phase-in) matches the official figures: EE $120, ER $119, total $239", () => {
    const r = calculateCPF(700, 30);
    expect(r.employeeCpfContribution).toBe(120);
    expect(r.employerCpfContribution).toBe(119);
    expect(r.totalCpfContribution).toBe(239);
  });

  it("$4,000 @58 → 2026 senior rates: EE $720 (18%), ER $640 (16%), take-home $3,280", () => {
    const r = calculateCPF(4000, 58);
    expect(r.employeeCpfContribution).toBe(720);
    expect(r.employerCpfContribution).toBe(640);
    expect(r.netTakeHome).toBe(3280);
  });

  it("$7,000 @63 → EE $875 / ER $875 (12.5% each, 2026 rates)", () => {
    const r = calculateCPF(7000, 63);
    expect(r.employeeCpfContribution).toBe(875);
    expect(r.employerCpfContribution).toBe(875);
  });

  it("float-dust guard: $700 @68 phase-in floors to EE $45, not $44", () => {
    // Raw employee share is 44.99999999999999 (0.075 × 3 × 200 in IEEE 754).
    // Without the epsilon guard, Math.floor would drop a whole dollar.
    const r = calculateCPF(700, 68);
    expect(r.employeeCpfContribution).toBe(45);
    expect(r.employerCpfContribution).toBe(63);
    expect(r.totalCpfContribution).toBe(108);
  });

  it("$5,001 @35 → total $1,850.37 rounds DOWN to $1,850; EE $1,000, ER $850", () => {
    // Pins the round-down direction so a Math.round→Math.ceil regression can't pass.
    const r = calculateCPF(5001, 35);
    expect(r.totalCpfContribution).toBe(1850);
    expect(r.employeeCpfContribution).toBe(1000);
    expect(r.employerCpfContribution).toBe(850);
    expect(r.netTakeHome).toBe(4001);
  });

  it.each([753, 3333, 5001, 7999, 1234.56])(
    "wage $%s → all contribution outputs are whole dollars",
    (wage) => {
      // The pad's live preview and every display surface round with Math.round;
      // statutory outputs being integers makes that rounding a no-op, so the
      // preview can never disagree with the committed row.
      const r = calculateCPF(wage, 35);
      expect(Number.isInteger(r.employeeCpfContribution)).toBe(true);
      expect(Number.isInteger(r.employerCpfContribution)).toBe(true);
      expect(Number.isInteger(r.totalCpfContribution)).toBe(true);
      expect(r.employeeCpfContribution + r.employerCpfContribution).toBe(
        r.totalCpfContribution
      );
    }
  );
});

describe("CPF_RATE_BRACKETS stay in sync with CPF_RATES", () => {
  // The quick-adjust pad derives its LIVE preview math from the display
  // brackets, so bracket drift would make the preview disagree with the
  // committed engine values.
  it.each([30, 55, 56, 58, 60, 61, 63, 65, 66, 68, 70, 71, 72])(
    "age %i: bracket percentages match engine rates",
    (age) => {
      const bracket = CPF_RATE_BRACKETS[getCPFBracketIndex(age)];
      const rates = getCPFRatesByAge(age);
      expect(bracket.employee).toBeCloseTo(rates.employee * 100, 10);
      expect(bracket.employer).toBeCloseTo(rates.employer * 100, 10);
      expect(bracket.total).toBeCloseTo((rates.employee + rates.employer) * 100, 10);
    }
  );
});

describe("CPF_ALLOCATION_BRACKETS stay in sync with CPF_ALLOCATION_RATES", () => {
  // Same drift hazard as the contribution brackets — both tables are
  // hand-updated each January and the display brackets feed the pad's
  // allocation table.
  it.each([30, 40, 48, 53, 58, 63, 70])(
    "age %i: allocation bracket matches engine rates",
    (age) => {
      const bracket = CPF_ALLOCATION_BRACKETS[getCPFAllocationBracketIndex(age)];
      const rates = getCPFAllocationByAge(age);
      expect(bracket.oa).toBeCloseTo(rates.oa, 10);
      expect(bracket.sa).toBeCloseTo(rates.sa, 10);
      expect(bracket.ma).toBeCloseTo(rates.ma, 10);
    }
  );
});

describe("constants pinned to 2026", () => {
  it("OW ceiling $8,000, AW ceiling $102,000", () => {
    expect(OW_CEILING_AMOUNT).toBe(8000);
    expect(ANNUAL_WAGE_CEILING_AMOUNT).toBe(102000);
  });

  it("FRS for the 55-in-2026 cohort is $220,400", () => {
    expect(FRS_2026).toBe(220_400);
  });
});

describe("AnnualBonusCpf — cumulative AW ceiling + $37,740 cap (PR 4)", () => {
  it("two $6k bonuses in one year SHARE the $6k AW room (the headline fix)", () => {
    // $8,000/mo OW → annual OW $96,000 → AW room $102,000 − $96,000 = $6,000.
    const acc = new AnnualBonusCpf(8000, 35);
    const first = acc.addBonus(6000);
    expect(first.cpfApplicableBonus).toBe(6000);
    expect(first.employee).toBe(1200); // 6000 × 0.20
    expect(first.employer).toBe(1020); // 6000 × 0.17
    expect(first.total).toBe(2220);

    const second = acc.addBonus(6000);
    expect(second.cpfApplicableBonus).toBe(0); // room already consumed
    expect(second.total).toBe(0);

    // Contrast: the legacy per-call helper would tax BOTH (the bug).
    expect(calculateBonusCPF(8000, 6000, 35).bonusCpfApplicableAmount).toBe(6000);
    expect(calculateBonusCPF(8000, 6000, 35).bonusCpfApplicableAmount).toBe(6000);
  });

  it("statutory-rounds each step (employee cents dropped, employer takes remainder)", () => {
    // $2,000/mo OW → AW room $78,000; a $3,333 bonus is fully applicable.
    // EE raw 666.60 → floor 666; total raw 1,233.21 → 1,233; ER = 1,233 − 666 = 567.
    const step = new AnnualBonusCpf(2000, 35).addBonus(3333);
    expect(step.cpfApplicableBonus).toBe(3333);
    expect(step.employee).toBe(666);
    expect(step.employer).toBe(567);
    expect(step.total).toBe(1233);
    expect(step.employee + step.employer).toBe(step.total);
  });

  it("OA/SA/MA allocations match total × the age allocation rates", () => {
    // (The CPF allocation fractions sum to ~1.0001 by table approximation, so
    // they don't sum to exactly the total — assert each against its rate.)
    const step = new AnnualBonusCpf(5000, 35).addBonus(10000);
    const a = getCPFAllocationByAge(35);
    expect(step.oaAllocation).toBeCloseTo(step.total * a.oa, 2);
    expect(step.saAllocation).toBeCloseTo(step.total * a.sa, 2);
    expect(step.maAllocation).toBeCloseTo(step.total * a.ma, 2);
  });

  it("never lets cumulative contributions exceed the $37,740 annual limit", () => {
    // Max possible: annual OW $0 → AW room $102,000; whole bonus at 37% = $37,740.
    const acc = new AnnualBonusCpf(0, 35);
    const step = acc.addBonus(102000);
    expect(step.total).toBe(37740); // exactly the limit
    expect(step.annualLimitRemaining).toBe(0);
    // A further bonus attracts nothing (AW room and limit both exhausted).
    expect(acc.addBonus(50000).total).toBe(0);
  });

  it("computeAnnualBonusCpf equals a single-step accumulator + exposes rate pcts", () => {
    const oneShot = computeAnnualBonusCpf(5000, 10000, 35);
    const step = new AnnualBonusCpf(5000, 35).addBonus(10000);
    expect(oneShot.employee).toBe(step.employee);
    expect(oneShot.employer).toBe(step.employer);
    expect(oneShot.total).toBe(step.total);
    expect(oneShot.employeeRatePct).toBe(20);
    expect(oneShot.employerRatePct).toBe(17);
    expect(oneShot.annualOrdinaryWage).toBe(60000);
  });

  it("senior rates flow through (age 58 → 18%/16%)", () => {
    const step = new AnnualBonusCpf(4000, 58).addBonus(8000); // AW room $54k, full
    expect(step.employee).toBe(1440); // 8000 × 0.18
    expect(step.employer).toBe(1280); // 8000 × 0.16
  });
});
