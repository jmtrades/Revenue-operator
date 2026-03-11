/**
 * Multi-currency formatting and conversion.
 * Workspace currency preference is stored in revenue_operator.workspaces.currency.
 */

export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "BRL",
  "MXN",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** Static rates relative to USD (1 USD = rate). For production, use a rates API. */
const RATES_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.53,
  JPY: 149.5,
  BRL: 4.97,
  MXN: 17.15,
};

export function formatCurrency(
  amount: number,
  currency: string,
  locale: string,
  options?: { compact?: boolean; minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const safeCurrency = SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency)
    ? currency
    : "USD";
  const safeLocale = locale || "en-US";
  if (options?.compact && amount >= 1000) {
    return new Intl.NumberFormat(safeLocale, {
      style: "currency",
      currency: safeCurrency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return new Intl.NumberFormat(safeLocale, {
    style: "currency",
    currency: safeCurrency,
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(amount);
}

/** Format amount in cents for display (amount is in cents). */
export function formatCurrencyCents(
  amountCents: number,
  currency: string,
  locale: string,
  options?: { compact?: boolean }
): string {
  const amount = amountCents / 100;
  return formatCurrency(amount, currency, locale, options);
}

export function convertCurrency(
  amount: number,
  from: string,
  to: string
): number {
  const fromRate = RATES_TO_USD[from] ?? 1;
  const toRate = RATES_TO_USD[to] ?? 1;
  const inUsd = from === "USD" ? amount : amount / fromRate;
  return to === "USD" ? inUsd : inUsd * toRate;
}

export function formatCurrencyCompact(amountCents: number, currency: string, locale: string): string {
  const amount = amountCents / 100;
  return formatCurrency(amount, currency, locale, { compact: true });
}
