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
          Normal conditions are not present.
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/activate"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
          >
            Access
          </Link>
        </div>
      </div>
    </div>
  );
}
