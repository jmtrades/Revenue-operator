"use client";

import { useTranslations } from "next-intl";

/**
 * Continuity expectation: one calm line. No rotation, no timers.
 * UI changes only on navigation.
 */
export function ContinuityExpectation({ visible }: { visible: boolean }) {
  const t = useTranslations("continuity");
  if (!visible) return null;

  return (
    <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
      {t("calmLine")}
    </p>
  );
}
