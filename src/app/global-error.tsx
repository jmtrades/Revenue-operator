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
              Normal conditions are not present.
            </h1>
            <p className="text-sm mb-6" style={{ color: "#9ca3af" }}>
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/activate"
                className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                style={{ background: "#1f2937", borderColor: "#374151", borderWidth: "1px", color: "#e5e7eb" }}
              >
                Access
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
