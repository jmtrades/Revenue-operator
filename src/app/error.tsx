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
          Something went wrong
        </h2>
        <p className="text-[var(--text-secondary)] mb-2">
          We encountered an unexpected error. Please try again.
        </p>
        {error.message && (
          <p className="text-sm text-[var(--text-tertiary)] mb-8 font-mono break-words">
            {error.message}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-6 py-2.5 bg-[var(--accent-primary)] hover:opacity-90 text-[var(--text-on-accent)] font-medium rounded-lg transition-colors"
          >
            Try again
          </button>
          <Link
            href="/app/dashboard"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] text-[var(--text-primary)] font-medium rounded-lg transition-colors border border-[var(--border-default)]"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
