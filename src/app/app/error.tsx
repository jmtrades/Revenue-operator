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
    <div className="min-h-[40vh] flex flex-col items-center justify-center p-8 bg-black">
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-semibold mb-3 text-white">
          Something went wrong
        </h1>
        <p className="text-sm mb-6 text-zinc-400">
          This page could not be loaded. Try again or go back to the dashboard.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-200 transition"
          >
            Try again
          </button>
          <Link
            href="/app/activity"
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
