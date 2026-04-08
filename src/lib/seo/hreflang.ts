import { locales, type AppLocale } from "@/i18n/shared";

const BASE = "https://www.recall-touch.com";

/**
 * Alternate locale URLs for hreflang. Locales are selected via `?locale=` (cookie is set client-side).
 */
export function hreflangAlternateLanguages(path: string): Record<string, string> {
  const normalized =
    !path || path === "/"
      ? "/"
      : path.startsWith("/")
        ? path
        : `/${path}`;
  const out: Record<string, string> = {};
  for (const loc of locales) {
    const u = new URL(normalized, BASE);
    u.searchParams.set("locale", loc);
    out[loc] = u.toString();
  }
  const enUrl = new URL(normalized, BASE);
  enUrl.searchParams.set("locale", "en" satisfies AppLocale);
  out["x-default"] = enUrl.toString();
  return out;
}
