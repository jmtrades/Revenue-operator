"use client";

/** Skeleton for contacts list: search bar + rows. */
export function ContactsListSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div
        className="h-10 rounded-lg skeleton-shimmer max-w-md"
        style={{ background: "var(--border-default)" }}
      />
      <ul className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-lg border p-3"
            style={{ borderColor: "var(--border-default)", background: "var(--surface-card)" }}
          >
            <div
              className="h-8 w-8 rounded-full skeleton-shimmer shrink-0"
              style={{ background: "var(--border-default)" }}
            />
            <div className="flex-1 space-y-1.5 min-w-0">
              <div
                className="h-4 skeleton-shimmer rounded"
                style={{ background: "var(--border-default)", width: "40%" }}
              />
              <div
                className="h-3 skeleton-shimmer rounded"
                style={{ background: "var(--border-default)", width: "60%" }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
