"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-6xl font-bold text-[var(--text-primary)] mb-4">Oops</h1>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">
          Temporary issue
        </h2>
        <p className="text-[var(--text-secondary)] mb-2">
          This page ran into an issue loading. Your data is safe — try refreshing, or go back to the dashboard.
        </p>
        {error.digest && (
          <p className="text-sm text-[var(--text-tertiary)] mb-8 font-mono break-words">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-6 py-2.5 bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium rounded-lg hover:opacity-90 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/app/dashboard"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium rounded-lg transition-colors border border-[var(--border-default)]"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
