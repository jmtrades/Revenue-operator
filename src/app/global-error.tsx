"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Global error boundary — catches errors in the root layout itself.
 * IMPORTANT: Cannot use useTranslations or any provider-dependent hooks
 * because this renders when the root layout (which provides those
 * providers) has failed. All strings must be hardcoded.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error Boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: "#000000",
          color: "#fafafa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "1.5rem",
        }}
      >
        <main style={{ textAlign: "center", maxWidth: "28rem" }}>
          <p
            style={{
              fontSize: "0.875rem",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#DC2626",
              marginBottom: "1rem",
            }}
          >
            Temporary issue
          </p>
          <h1
            style={{
              fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              margin: "0 0 0.75rem",
            }}
          >
            We hit a snag loading this page
          </h1>
          <p
            style={{
              color: "#a1a1aa",
              lineHeight: 1.6,
              marginBottom: "2rem",
            }}
          >
            Try refreshing the page. If the problem persists, contact support.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#ffffff",
                color: "#000000",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#5E6270",
                border: "1px solid rgba(0,0,0,0.08)",
                textDecoration: "none",
              }}
            >
              Go home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
