"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface LoadingStateProps {
  message?: string;
  submessage?: string;
  className?: string;
}

export function LoadingState({ message = "In progress.", submessage, className = "" }: LoadingStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border py-12 px-6 text-center ${className}`}
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        borderWidth: "1px",
      }}
    >
      <span
        className="mb-3 inline-block h-3 w-3 rounded-full animate-pulse"
        style={{ background: "var(--accent)" }}
        aria-hidden
      />
      <p className="font-medium" style={{ color: "var(--text-primary)" }}>
        {message}
      </p>
      {submessage && (
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {submessage}
        </p>
      )}
    </div>
  );
}

const LOADING_FALLBACK_MS = 6000;

export function LoadingScreen({ message = "One moment…", onRetry }: { message?: string; onRetry?: () => void }) {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowFallback(true), LOADING_FALLBACK_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6" style={{ background: "var(--background)" }}>
      {!showFallback ? (
        <>
          <span
            className="inline-block h-4 w-4 rounded-full border-2 animate-spin"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            aria-hidden
          />
          <p className="text-base font-medium" style={{ color: "var(--text-primary)" }}>
            {message}
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            This is taking longer than usual.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="btn-primary px-5 py-2.5 text-sm"
              >
                Retry
              </button>
            )}
            <Link href="/" className="btn-secondary px-5 py-2.5 text-sm inline-block">
              Back to home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
