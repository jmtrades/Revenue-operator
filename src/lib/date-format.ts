/**
 * Locale-aware date and time formatting.
 * Use these instead of .toLocaleDateString() / .toLocaleTimeString() / date-fns format().
 */

export function formatDate(
  date: Date | string,
  locale: string,
  style: "short" | "medium" | "long" = "medium"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, { dateStyle: style }).format(d);
}

export function formatTime(date: Date | string, locale: string, hour12?: boolean): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    timeStyle: "short",
    hour12: hour12 ?? locale.startsWith("en"),
  }).format(d);
}

const RELATIVE_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: "second", ms: 1000 },
  { unit: "minute", ms: 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
];

export function formatRelativeTime(date: Date | string, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = d.getTime() - Date.now();
  const absMs = Math.abs(diff);
  for (let i = RELATIVE_UNITS.length - 1; i >= 0; i--) {
    const { unit, ms } = RELATIVE_UNITS[i];
    if (absMs >= ms) {
      const value = Math.round(diff / ms);
      return rtf.format(value, unit);
    }
  }
  return rtf.format(0, "second");
}
