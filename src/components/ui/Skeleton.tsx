"use client";

interface SkeletonProps {
  className?: string;
  /** Optional: number of lines (for list skeletons) */
  lines?: number;
}

export function Skeleton({ className = "", lines = 1 }: SkeletonProps) {
  if (lines <= 1) {
    return (
      <div
        className={`animate-pulse rounded ${className}`}
        style={{ background: "var(--border)", minHeight: "1rem" }}
        aria-hidden
      />
    );
  }
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded ${className}`}
          style={{
            background: "var(--border)",
            minHeight: "1rem",
            width: i === lines - 1 && lines > 1 ? "75%" : "100%",
          }}
        />
      ))}
    </div>
  );
}
