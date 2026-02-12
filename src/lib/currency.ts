/**
 * Currency formatting utilities - USD only
 */

export function formatCurrency(amountCents: number, currency: string = "USD"): string {
  if (currency !== "USD") {
    console.warn(`[currency] Non-USD currency requested: ${currency}, defaulting to USD`);
  }
  
  const dollars = amountCents / 100;
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCurrencyCompact(amountCents: number, currency: string = "USD"): string {
  if (currency !== "USD") {
    console.warn(`[currency] Non-USD currency requested: ${currency}, defaulting to USD`);
  }
  
  const dollars = amountCents / 100;
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(1)}k`;
  }
  return `$${Math.round(dollars)}`;
}
