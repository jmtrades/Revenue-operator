"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  useEffect(() => {
    console.error("[Global Error Boundary]", error);
    if (typeof window !== "undefined" && (window as unknown as { Sentry?: { captureException: (e: Error) => void } }).Sentry) {
      (window as unknown as { Sentry: { captureException: (e: Error) => void } }).Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
          <div className="max-w-md w-full text-center">
            <h1 className="text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              {t("heading")}
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              {t("loadPageError")}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                type="button"
                onClick={() => reset()}
                className="px-6 py-3 rounded-xl text-sm font-semibold bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition"
              >
                {t("tryAgain")}
              </button>
              <Link
                href="/"
                className="px-6 py-3 rounded-xl text-sm font-medium border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              >
                {t("goHome")}
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
