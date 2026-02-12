"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
              Something went wrong
            </h1>
            <p className="text-sm mb-6" style={{ color: "#9ca3af" }}>
              We encountered an issue. This has been logged and we'll look into it.
            </p>
            {error.digest && (
              <p className="text-xs mb-4 font-mono" style={{ color: "#6b7280" }}>
                Reference: {error.digest}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                style={{ background: "#10b981", color: "#0c0f13" }}
              >
                Try again
              </button>
              <Link
                href="/activate"
                className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                style={{ background: "#1f2937", borderColor: "#374151", borderWidth: "1px", color: "#e5e7eb" }}
              >
                Return to activation
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
