import { locales } from "./shared";

export const routing = {
  locales,
  defaultLocale: "en",
  localePrefix: "never" as const,
} as const;

