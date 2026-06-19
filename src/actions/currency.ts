"use server"

import { SUPPORTED_CURRENCIES, type ExchangeRates } from "@/lib/currency-utils"

// NOTE: a "use server" module must export only async server actions — do NOT
// re-export types here. Turbopack mis-compiles a type re-export into a runtime
// reference (ReferenceError). Import CurrencyCode/ExchangeRates from
// "@/lib/currency-utils" directly.

// Cache for exchange rates (server-side)
let cachedRates: ExchangeRates | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 1000 * 60 * 60 // 1 hour cache

/**
 * Fetch exchange rates from Frankfurter API
 * Base currency is SGD - rates show how much 1 unit of foreign currency equals in SGD
 */
export async function getExchangeRates(): Promise<ExchangeRates | null> {
  // Check cache
  if (cachedRates && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedRates
  }

  try {
    // Frankfurter API - get rates with SGD as base
    // We need to invert the rates since we want "1 foreign = X SGD"
    const currencies = Object.keys(SUPPORTED_CURRENCIES)
      .filter((c) => c !== "SGD")
      .join(",")
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=SGD&to=${currencies}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )

    if (!response.ok) {
      console.error("Failed to fetch exchange rates:", response.statusText)
      return null
    }

    const data = await response.json()

    // Invert rates: Frankfurter gives us "1 SGD = X foreign"
    // We want "1 foreign = X SGD" for easier calculation
    const invertedRates: Record<string, number> = { SGD: 1 }
    for (const [currency, rate] of Object.entries(data.rates)) {
      invertedRates[currency] = 1 / (rate as number)
    }

    cachedRates = {
      base: "SGD",
      date: data.date,
      rates: invertedRates
    }
    cacheTimestamp = Date.now()

    return cachedRates
  } catch (error) {
    console.error("Error fetching exchange rates:", error)
    return null
  }
}
