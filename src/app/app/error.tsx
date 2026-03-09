"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[App Error Boundary]", error);
    }
  }, [error]);

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center p-8 bg-[var(--bg-base)]">
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-semibold mb-3 text-[var(--text-primary)]">Something went wrong</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          This page could not be loaded. Try again or go back to the dashboard.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            type="button"
            onClick={() => reset()}
            aria-label="Try again"
            className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-gray-900 hover:bg-gray-100 transition focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
          >
            Try again
          </button>
          <Link
            href="/app/activity"
            aria-label="Go to dashboard"
            className="px-6 py-3 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
