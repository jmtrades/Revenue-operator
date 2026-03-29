"use client";

/** Skeleton for analytics/metrics: row of metric cards. */
export function MetricsSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-hidden>
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--border-default)", background: "var(--surface-card)" }}
        >
          <div
            className="h-3 rounded skeleton-shimmer mb-3"
            style={{ background: "var(--border-default)", width: "50%" }}
          />
          <div
            className="h-8 rounded skeleton-shimmer"
            style={{ background: "var(--border-default)", width: "40%" }}
          />
        </div>
      ))}
    </div>
  );
}
