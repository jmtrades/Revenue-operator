"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("[Error Boundary]", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--bg-base)]">
      <div className="max-w-md w-full text-center">
        <svg className="w-10 h-10 mx-auto mb-4 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-3">{t("heading")}</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {t("loadPageError")}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            type="button"
            onClick={() => reset()}
            className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 transition focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
          >
            {t("tryAgain")}
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
          >
            {t("goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
