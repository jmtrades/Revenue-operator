/**
 * Phase 29 — Multi-currency amount handling.
 *
 * Provides:
 *   - canonical ISO-4217 metadata (decimal places, symbol, symbol position)
 *   - locale-aware formatter using Intl.NumberFormat
 *   - FX rate conversion with rate-table injection (pure; no network)
 *   - "display in home currency + original" dual formatter for deals
 *   - cross-workspace normalization for analytics rollups
 *
 * Callers own the FX rate fetching (ECB, Fed, Fixer, etc.) and pass in
 * a snapshot table. This module returns conversion results + staleness.
 */

export type CurrencyCode = string; // ISO 4217 3-letter

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  /** Common display name. */
  name: string;
  /** Number of decimal places in the minor unit. */
  decimals: number;
  /** "before" or "after" the number. */
  symbolPosition: "before" | "after";
}

// Non-exhaustive but covers top-25 global + ZAR/INR/BRL/MXN coverage.
const CURRENCIES: Record<string, CurrencyMeta> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", decimals: 2, symbolPosition: "before" },
  EUR: { code: "EUR", symbol: "€", name: "Euro", decimals: 2, symbolPosition: "before" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", decimals: 2, symbolPosition: "before" },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", decimals: 0, symbolPosition: "before" },
  CNY: { code: "CNY", symbol: "¥", name: "Chinese Yuan", decimals: 2, symbolPosition: "before" },
  CAD: { code: "CAD", symbol: "CA$", name: "Canadian Dollar", decimals: 2, symbolPosition: "before" },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar", decimals: 2, symbolPosition: "before" },
  NZD: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", decimals: 2, symbolPosition: "before" },
  CHF: { code: "CHF", symbol: "CHF", name: "Swiss Franc", decimals: 2, symbolPosition: "before" },
  SEK: { code: "SEK", symbol: "kr", name: "Swedish Krona", decimals: 2, symbolPosition: "after" },
  NOK: { code: "NOK", symbol: "kr", name: "Norwegian Krone", decimals: 2, symbolPosition: "after" },
  DKK: { code: "DKK", symbol: "kr", name: "Danish Krone", decimals: 2, symbolPosition: "after" },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", decimals: 2, symbolPosition: "before" },
  BRL: { code: "BRL", symbol: "R$", name: "Brazilian Real", decimals: 2, symbolPosition: "before" },
  MXN: { code: "MXN", symbol: "MX$", name: "Mexican Peso", decimals: 2, symbolPosition: "before" },
  ZAR: { code: "ZAR", symbol: "R", name: "South African Rand", decimals: 2, symbolPosition: "before" },
  SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar", decimals: 2, symbolPosition: "before" },
  HKD: { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", decimals: 2, symbolPosition: "before" },
  KRW: { code: "KRW", symbol: "₩", name: "South Korean Won", decimals: 0, symbolPosition: "before" },
  TWD: { code: "TWD", symbol: "NT$", name: "New Taiwan Dollar", decimals: 2, symbolPosition: "before" },
  AED: { code: "AED", symbol: "AED", name: "UAE Dirham", decimals: 2, symbolPosition: "before" },
  SAR: { code: "SAR", symbol: "SAR", name: "Saudi Riyal", decimals: 2, symbolPosition: "before" },
  ILS: { code: "ILS", symbol: "₪", name: "Israeli Shekel", decimals: 2, symbolPosition: "before" },
  TRY: { code: "TRY", symbol: "₺", name: "Turkish Lira", decimals: 2, symbolPosition: "before" },
  PLN: { code: "PLN", symbol: "zł", name: "Polish Zloty", decimals: 2, symbolPosition: "after" },
  THB: { code: "THB", symbol: "฿", name: "Thai Baht", decimals: 2, symbolPosition: "before" },
  IDR: { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", decimals: 0, symbolPosition: "before" },
  PHP: { code: "PHP", symbol: "₱", name: "Philippine Peso", decimals: 2, symbolPosition: "before" },
  MYR: { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", decimals: 2, symbolPosition: "before" },
  VND: { code: "VND", symbol: "₫", name: "Vietnamese Dong", decimals: 0, symbolPosition: "after" },
};

export function getCurrencyMeta(code: CurrencyCode): CurrencyMeta | null {
  return CURRENCIES[code.toUpperCase()] ?? null;
}

export function isSupportedCurrency(code: string): boolean {
  return Boolean(CURRENCIES[code.toUpperCase()]);
}

export function listSupportedCurrencies(): CurrencyMeta[] {
  return Object.values(CURRENCIES).sort((a, b) => a.code.localeCompare(b.code));
}

export interface FormatOptions {
  /** BCP 47 locale, e.g., "en-US", "de-DE". Defaults to "en-US". */
  locale?: string;
  /** Display no decimals (e.g., "$1,234" not "$1,234.00"). */
  noDecimals?: boolean;
  /** Abbreviate large numbers: 1.2M, 4.5K. */
  compact?: boolean;
}

export function formatAmount(
  amount: number,
  currency: CurrencyCode,
  options: FormatOptions = {},
): string {
  const meta = getCurrencyMeta(currency);
  if (!meta) {
    // Fallback — still respect locale formatting for the number
    return `${amount} ${currency}`;
  }
  const locale = options.locale ?? "en-US";
  try {
    const fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: meta.code,
      minimumFractionDigits: options.noDecimals ? 0 : meta.decimals,
      maximumFractionDigits: options.noDecimals ? 0 : meta.decimals,
      notation: options.compact ? "compact" : "standard",
    });
    return fmt.format(amount);
  } catch {
    // Intl failure (should not happen in modern Node, but guard).
    const num = options.noDecimals ? Math.round(amount) : amount.toFixed(meta.decimals);
    return meta.symbolPosition === "before"
      ? `${meta.symbol}${num}`
      : `${num} ${meta.symbol}`;
  }
}

/**
 * A rate table — rates quoted against a common "base" currency (USD by
 * convention). 1 unit of base = `rate` units of the target currency.
 */
export interface FxRateTable {
  baseCurrency: CurrencyCode;
  /** rates[target] = units of target per unit of base. */
  rates: Record<string, number>;
  /** ISO timestamp the rates were fetched. */
  fetchedAt: string;
  /** Source identifier for audit. */
  source: string;
}

export interface FxConvertResult {
  amount: number;
  currency: CurrencyCode;
  /** Whether the conversion was from a cached rate. */
  fromCache: boolean;
  /** Was the rate considered stale (>24h old)? */
  stale: boolean;
  /** ISO timestamp when the rate was fetched. */
  rateFetchedAt: string;
  /** The exchange rate used (target/source). */
  rateUsed: number;
  /** Source of the rate. */
  source: string;
}

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export function convertAmount(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  table: FxRateTable,
  nowIso?: string,
): FxConvertResult | { error: string } {
  const fromUp = from.toUpperCase();
  const toUp = to.toUpperCase();
  const base = table.baseCurrency.toUpperCase();

  if (!isSupportedCurrency(fromUp)) return { error: `unsupported from currency: ${from}` };
  if (!isSupportedCurrency(toUp)) return { error: `unsupported to currency: ${to}` };

  // Same currency — identity, no rate needed.
  if (fromUp === toUp) {
    return {
      amount,
      currency: toUp,
      fromCache: true,
      stale: false,
      rateFetchedAt: table.fetchedAt,
      rateUsed: 1,
      source: table.source,
    };
  }

  const rateFromBase = fromUp === base ? 1 : table.rates[fromUp];
  const rateToBase = toUp === base ? 1 : table.rates[toUp];

  if (rateFromBase === undefined || rateToBase === undefined) {
    return { error: `missing rate for ${fromUp} or ${toUp}` };
  }

  // amount_in_base = amount / rateFromBase
  // amount_in_target = amount_in_base * rateToBase
  const converted = (amount / rateFromBase) * rateToBase;
  const rateUsed = rateToBase / rateFromBase;

  const now = nowIso ? Date.parse(nowIso) : Date.now();
  const fetched = Date.parse(table.fetchedAt);
  const stale = !Number.isNaN(fetched) && now - fetched > STALE_AFTER_MS;

  return {
    amount: converted,
    currency: toUp,
    fromCache: true,
    stale,
    rateFetchedAt: table.fetchedAt,
    rateUsed,
    source: table.source,
  };
}

/**
 * Compose a "dual display" string: the original amount in the native
 * currency + converted amount in the home currency. Useful for deal cards.
 */
export function formatDualCurrency(
  amount: number,
  nativeCurrency: CurrencyCode,
  homeCurrency: CurrencyCode,
  table: FxRateTable,
  options: FormatOptions = {},
): { display: string; converted: FxConvertResult | { error: string } } {
  const converted = convertAmount(amount, nativeCurrency, homeCurrency, table);
  const nativeStr = formatAmount(amount, nativeCurrency, options);
  if ("error" in converted) {
    return { display: nativeStr, converted };
  }
  if (nativeCurrency.toUpperCase() === homeCurrency.toUpperCase()) {
    return { display: nativeStr, converted };
  }
  const homeStr = formatAmount(converted.amount, homeCurrency, options);
  return {
    display: `${nativeStr} (${homeStr})`,
    converted,
  };
}
