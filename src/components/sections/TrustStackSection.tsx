"use client";

import { useTranslations } from "next-intl";

export function TrustStackSection() {
  const t = useTranslations("homepage.trust");

  return (
    <section
      className="py-8 border-t border-[var(--border-default)] bg-[var(--bg-base)]"
    >
      <div className="max-w-4xl mx-auto px-4 text-center">
        <p className="text-sm text-[var(--text-tertiary)]">
          {t("text")}
        </p>
      </div>
    </section>
  );
}
