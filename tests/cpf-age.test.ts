import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { resolveCpfAge } from "@/lib/cpf-age"

// Pin "now" to 15 Jun 2026 (mid-month/year, so the Asia/Singapore parts are the
// same in any realistic test-runner timezone).
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
})
afterEach(() => {
  vi.useRealTimers()
})

describe("resolveCpfAge — DOB-derived age, null when unknown", () => {
  it("computes whole-year age from a YYYY-MM-DD string", () => {
    expect(resolveCpfAge("1991-01-01")).toBe(35)
    expect(resolveCpfAge("2000-06-15")).toBe(26) // birthday today → ticked over
  })

  it("has NOT had its birthday yet this year → one year younger", () => {
    expect(resolveCpfAge("1991-06-16")).toBe(34) // birthday tomorrow
    expect(resolveCpfAge("1991-12-31")).toBe(34)
  })

  it("returns null for absent / unparseable DOB (no age-30 fallback)", () => {
    expect(resolveCpfAge(null)).toBeNull()
    expect(resolveCpfAge(undefined)).toBeNull()
    expect(resolveCpfAge("")).toBeNull()
    expect(resolveCpfAge("not-a-date")).toBeNull()
  })

  it("returns null for out-of-range ages (garbage future/ancient dates)", () => {
    expect(resolveCpfAge("2030-01-01")).toBeNull() // not born yet → negative
    expect(resolveCpfAge("1850-01-01")).toBeNull() // 176 → out of range
  })

  it("reads YYYY-MM-DD by calendar parts (no UTC day-shift)", () => {
    // A Dec-31 DOB must not read as Dec-30 / Jan-1 due to UTC parsing — the age
    // is stable regardless of the runner's timezone.
    expect(resolveCpfAge("1970-12-31")).toBe(55)
  })

  it("accepts a Date object too", () => {
    expect(resolveCpfAge(new Date(1991, 0, 1))).toBe(35)
  })
})
