"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const [retryCount, setRetryCount] = useState(0);
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[App Error Boundary]", error);
    }
  }, [error]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    reset();
  };

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center p-8 bg-[var(--bg-base)]">
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-semibold mb-3 text-[var(--text-primary)]">{t("generic.title")}</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {t("pageLoadBody")}
        </p>
        <div className="flex flex-col gap-3 items-center">
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              type="button"
              onClick={handleRetry}
              aria-label={t("retry")}
              className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-gray-900 hover:bg-gray-100 transition focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
            >
              {t("tryAgain")}
              {retryCount > 0 && ` (${retryCount})`}
            </button>
            <Link
              href="/app/activity"
              aria-label={t("goToDashboard")}
              className="px-6 py-3 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
            >
              {t("goToDashboard")}
            </Link>
          </div>
          {retryCount >= 3 && (
            <a
              href="mailto:support@recall-touch.com"
              className="text-sm text-[var(--accent-primary)] hover:underline"
            >
              {t("support")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
