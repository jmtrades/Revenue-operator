"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-6xl font-bold text-white mb-4">Oops</h1>
        <h2 className="text-2xl font-semibold text-white mb-4">
          We hit a temporary issue
        </h2>
        <p className="text-zinc-400 mb-2">
          This page ran into an issue. Try refreshing, or return to the homepage.
        </p>
        {error.digest && (
          <p className="text-sm text-zinc-500 mb-8 font-mono break-words">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-100 transition-colors"
          >
            Try again
          </button>
          <Link
            href={ROUTES.APP_HOME}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-900/50 transition-colors"
          >
            Open app
          </Link>
        </div>
      </div>
    </div>
  );
}
