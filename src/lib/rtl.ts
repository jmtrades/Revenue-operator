/**
 * RTL (right-to-left) locale detection for future Arabic/Hebrew support.
 */

const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"]);

export function isRTL(locale: string): boolean {
  const base = locale.split("-")[0].toLowerCase();
  return RTL_LOCALES.has(base);
}
