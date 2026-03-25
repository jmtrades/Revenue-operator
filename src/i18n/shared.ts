export const locales = ["en", "es", "fr", "de", "pt", "ja"] as const;

export type AppLocale = (typeof locales)[number];

