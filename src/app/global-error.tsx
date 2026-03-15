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
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("[Global Error Boundary]", error);
    }
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "#0c0f13", color: "#e5e7eb" }}>
          <div className="max-w-md w-full text-center">
            <h1 className="text-xl font-semibold mb-3" style={{ color: "#e5e7eb" }}>
              {t("heading")}
            </h1>
            <p className="text-sm mb-6" style={{ color: "#9ca3af" }}>
              {t("loadPageError")}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                type="button"
                onClick={() => reset()}
                className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 transition"
              >
                {t("tryAgain")}
              </button>
              <Link
                href="/"
                className="px-6 py-3 rounded-xl text-sm font-medium border border-zinc-700 text-zinc-300 hover:text-white transition"
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
