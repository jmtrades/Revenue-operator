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
    <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Something went wrong
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          We encountered an issue. This has been logged and we'll look into it.
        </p>
        {error.digest && (
          <p className="text-xs mb-4 font-mono" style={{ color: "var(--text-muted)" }}>
            Reference: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--meaning-green)", color: "#0c0f13" }}
          >
            Try again
          </button>
          <Link
            href="/activate"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
          >
            Return to activation
          </Link>
        </div>
      </div>
    </div>
  );
}
