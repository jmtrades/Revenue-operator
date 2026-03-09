"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("[Error Boundary]", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--bg-base)]">
      <div className="max-w-md w-full text-center">
        <p className="text-4xl mb-4" aria-hidden>⚡</p>
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Something went wrong.</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          We couldn’t load this page. You can try again or go back home.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            type="button"
            onClick={() => reset()}
            className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 transition focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
