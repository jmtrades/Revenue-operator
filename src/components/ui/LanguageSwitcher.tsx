"use client";

import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { locales, type AppLocale } from "@/i18n/shared";

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  ja: "日本語",
};

const LOCALE_FLAGS: Record<AppLocale, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  pt: "🇧🇷",
  ja: "🇯🇵",
};

function setLocaleCookie(locale: string) {
  if (typeof document === "undefined") return;
  document.cookie = `rt_locale=${locale};path=/;max-age=31536000;SameSite=Lax`;
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const currentLocale = useLocale() as AppLocale;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (redirectTo) {
      window.location.href = redirectTo;
    }
  }, [redirectTo]);

  function selectLocale(locale: AppLocale) {
    setLocaleCookie(locale);
    setOpen(false);
    const base = pathname?.replace(/^\/(en|es|fr|de|pt|ja)(\/|$)/, "$2") || "/";
    const newPath = locale === "en" ? base || "/" : `/${locale}${base === "/" ? "" : base}`;
    setRedirectTo(newPath);
  }

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none"
        aria-label="Language"
        aria-expanded={open}
      >
        <Globe className="h-4 w-4 text-[var(--text-secondary)]" />
        <span className="hidden sm:inline">{LOCALE_FLAGS[currentLocale]}</span>
        <span className="hidden sm:inline">{LOCALE_LABELS[currentLocale]}</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-48 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] py-1 shadow-lg z-50">
          {(locales as readonly AppLocale[]).map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => selectLocale(locale)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                locale === currentLocale
                  ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                  : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              )}
            >
              <span>{LOCALE_FLAGS[locale]}</span>
              <span>{LOCALE_LABELS[locale]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
