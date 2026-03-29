"use client";

interface ListSkeletonProps {
  rows?: number;
  /** Optional: show a single line above the list (e.g. for primary action link) */
  header?: boolean;
}

/** Generic list skeleton: optional header bar + N rows with two lines each. */
export function ListSkeleton({ rows = 5, header }: ListSkeletonProps) {
  return (
    <div className="space-y-3" aria-hidden>
      {header && (
        <div
          className="h-5 w-24 rounded skeleton-shimmer"
          style={{ background: "var(--border-default)" }}
        />
      )}
      <ul className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border-default)", background: "var(--surface-card)" }}>
        {Array.from({ length: rows }).map((_, i) => (
          <li
            key={i}
            className="border-b last:border-b-0 px-4 py-3"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div
              className="h-4 rounded skeleton-shimmer mb-1.5"
              style={{ background: "var(--border-default)", width: i % 2 === 0 ? "60%" : "45%" }}
            />
            <div
              className="h-3 rounded skeleton-shimmer"
              style={{ background: "var(--border-default)", width: "35%" }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
