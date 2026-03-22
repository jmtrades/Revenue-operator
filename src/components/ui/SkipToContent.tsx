"use client";

import { useTranslations } from "next-intl";

export default function SkipToContent() {
  const t = useTranslations("accessibility");
  return (
    <a
      href="#main"
      className="absolute top-0 left-0 -translate-y-full focus:translate-y-0 px-4 py-2 bg-[var(--accent-primary)] text-white font-medium text-sm rounded-b-md z-50 transition-transform duration-150"
    >
      {t("skipToContent")}
    </a>
  );
}
