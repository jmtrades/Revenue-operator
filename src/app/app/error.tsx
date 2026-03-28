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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-6xl font-bold text-white mb-4">Oops</h1>
        <h2 className="text-2xl font-semibold text-gray-100 mb-4">
          Something went wrong
        </h2>
        <p className="text-gray-400 mb-2">
          An error occurred in your workspace. Please try again or return to the dashboard.
        </p>
        {error.message && (
          <p className="text-sm text-gray-500 mb-8 font-mono break-words">
            {error.message}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Try again
          </button>
          <Link
            href="/app/dashboard"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-gray-100 font-medium rounded-lg transition-colors border border-slate-700"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
