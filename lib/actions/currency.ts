"use server";

import {
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  type ExchangeRates,
} from "@/lib/currency-utils";

// Types can be re-exported from "use server" files
export type { CurrencyCode, ExchangeRates };

// Cache for exchange rates (server-side)
let cachedRates: ExchangeRates | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache

/**
 * Fetch exchange rates from Frankfurter API
 * Base currency is SGD - rates show how much 1 unit of foreign currency equals in SGD
 */
export async function getExchangeRates(): Promise<ExchangeRates | null> {
  // Check cache
  if (cachedRates && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    // Frankfurter API - get rates with SGD as base
    // We need to invert the rates since we want "1 foreign = X SGD"
    const currencies = Object.keys(SUPPORTED_CURRENCIES).filter(c => c !== "SGD").join(",");
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=SGD&to=${currencies}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      console.error("Failed to fetch exchange rates:", response.statusText);
      return null;
    }

    const data = await response.json();

    // Invert rates: Frankfurter gives us "1 SGD = X foreign"
    // We want "1 foreign = X SGD" for easier calculation
    const invertedRates: Record<string, number> = { SGD: 1 };
    for (const [currency, rate] of Object.entries(data.rates)) {
      invertedRates[currency] = 1 / (rate as number);
    }

    cachedRates = {
      base: "SGD",
      date: data.date,
      rates: invertedRates,
    };
    cacheTimestamp = Date.now();

    return cachedRates;
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return null;
  }
}

/**
 * Convert foreign currency amount to SGD
 */
export async function convertToSGD(
  amount: number,
  fromCurrency: CurrencyCode,
  customRate?: number
): Promise<{ sgdAmount: number; rateUsed: number }> {
  if (fromCurrency === "SGD") {
    return { sgdAmount: amount, rateUsed: 1 };
  }

  // Use custom rate if provided
  if (customRate !== undefined) {
    return {
      sgdAmount: amount * customRate,
      rateUsed: customRate,
    };
  }

  // Fetch current rates
  const rates = await getExchangeRates();
  if (!rates || !rates.rates[fromCurrency]) {
    throw new Error(`Exchange rate not available for ${fromCurrency}`);
  }

  const rate = rates.rates[fromCurrency];
  return {
    sgdAmount: amount * rate,
    rateUsed: rate,
  };
}

/**
 * Get the exchange rate for a specific currency to SGD
 */
export async function getExchangeRate(currency: CurrencyCode): Promise<number | null> {
  if (currency === "SGD") return 1;

  const rates = await getExchangeRates();
  if (!rates || !rates.rates[currency]) {
    return null;
  }

  return rates.rates[currency];
}

