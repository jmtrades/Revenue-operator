import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import type { AppLocale } from "./shared";
import { locales } from "./shared";
const LOCALE_COOKIE = "rt_locale";

export default getRequestConfig(async () => {
  const locale = await detectLocaleFromRequest();
  const messages = (await import(`./messages/${locale}.json`)).default as Record<string, unknown>;
  return {
    locale,
    messages,
    timeZone: "UTC",
  };
});

export async function detectLocaleFromRequest(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale as AppLocale;
  }

  const h = await headers();
  const acceptLanguage = h.get("accept-language") || "";
  const accepted = acceptLanguage
    .split(",")
    .map((part: string) => part.split(";")[0]?.trim())
    .filter(Boolean);

  for (const lang of accepted) {
    const base = lang.split("-")[0];
    const match = (locales as readonly string[]).find(
      (locale) => locale === lang || locale === base,
    );
    if (match) return match as AppLocale;
  }

  return "en";
}

export async function setLocaleCookie(locale: AppLocale): Promise<void> {
  "use server";
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}
