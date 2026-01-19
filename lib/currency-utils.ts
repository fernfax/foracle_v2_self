// Supported currencies with their symbols
export const SUPPORTED_CURRENCIES = {
  SGD: { symbol: "S$", name: "Singapore Dollar" },
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  JPY: { symbol: "¥", name: "Japanese Yen" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
  CNY: { symbol: "¥", name: "Chinese Yuan" },
  MYR: { symbol: "RM", name: "Malaysian Ringgit" },
  THB: { symbol: "฿", name: "Thai Baht" },
  IDR: { symbol: "Rp", name: "Indonesian Rupiah" },
  KRW: { symbol: "₩", name: "South Korean Won" },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

/**
 * Format currency amount with proper symbol
 */
export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const currencyInfo = SUPPORTED_CURRENCIES[currency];

  // Handle special cases for formatting
  if (currency === "JPY" || currency === "KRW" || currency === "IDR") {
    // These currencies don't use decimal places
    return `${currencyInfo.symbol}${Math.round(amount).toLocaleString()}`;
  }

  return `${currencyInfo.symbol}${amount.toLocaleString("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
