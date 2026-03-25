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
      className={`flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-card)] py-12 px-6 text-center ${className}`}
    >
      <span
        className="mb-4 inline-block h-5 w-5 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin"
        aria-hidden
      />
      <p className="text-sm font-medium text-[var(--text-primary)]">
        {message}
      </p>
      {submessage && (
        <p className="mt-1.5 text-[13px] text-[var(--text-secondary)]">
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 bg-[var(--bg-base)]">
      {!showFallback ? (
        <>
          <span
            className="inline-block h-5 w-5 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin"
            aria-hidden
          />
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {message}
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-5 text-center max-w-sm">
          <p className="text-[13px] text-[var(--text-secondary)]">
            This is taking longer than usual.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center justify-center rounded-[var(--radius-btn)] bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-primary-hover)] shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-all duration-150"
              >
                Retry
              </button>
            )}
            <Link href="/" className="inline-flex items-center justify-center rounded-[var(--radius-btn)] border border-[var(--border-default)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all duration-150">
              Back to home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
