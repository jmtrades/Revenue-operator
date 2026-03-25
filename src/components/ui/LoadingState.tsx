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
      <style>{`
        @keyframes spin-fast {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <span
        className="mb-4 inline-block h-5 w-5 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent"
        style={{ animation: 'spin-fast 0.6s linear infinite' }}
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
      <style>{`
        @keyframes spin-fast {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      {!showFallback ? (
        <>
          <span
            className="inline-block h-5 w-5 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent"
            style={{ animation: 'spin-fast 0.6s linear infinite' }}
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
                className="inline-flex items-center justify-center rounded-[var(--radius-btn)] bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-medium text-white transition-[background-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:bg-[var(--accent-primary-hover)] shadow-[var(--shadow-sm)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
              >
                Retry
              </button>
            )}
            <Link href="/" className="inline-flex items-center justify-center rounded-[var(--radius-btn)] border border-[var(--border-default)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:bg-[var(--bg-hover)]">
              Back to home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
