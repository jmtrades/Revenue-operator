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
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-black" style={{ color: "var(--text-primary)" }}>
      <div className="max-w-md w-full text-center">
        <p className="text-4xl mb-4" aria-hidden>⚡</p>
        <h1 className="text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Something went wrong.
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          We couldn’t load this page. You can try again or go back home.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 border border-zinc-700 text-white hover:border-zinc-500 transition"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 border border-zinc-700 text-white hover:border-zinc-500 transition"
          >
            Go home →
          </Link>
        </div>
      </div>
    </div>
  );
}
