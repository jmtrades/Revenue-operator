"use client";

/**
 * Single muted operational line. No counters, no timestamps.
 */

interface StatusLineProps {
  children: React.ReactNode;
  className?: string;
}

export function StatusLine({ children, className = "" }: StatusLineProps) {
  return (
    <p
      className={`text-sm ${className}`}
      style={{ color: "var(--text-muted)" }}
    >
      {children}
    </p>
  );
}
