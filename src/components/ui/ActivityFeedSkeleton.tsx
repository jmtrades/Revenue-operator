"use client";

/** Skeleton for activity feed: filter chips + card-shaped placeholders. */
export function ActivityFeedSkeleton() {
  const bar = (width: string) => (
    <div
      className="animate-pulse rounded"
      style={{ background: "var(--border-default)", minHeight: 12, width }}
      aria-hidden
    />
  );
  return (
    <div className="space-y-6" aria-hidden>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-8 rounded-full animate-pulse shrink-0"
            style={{ width: 80, background: "var(--border-default)" }}
          />
        ))}
      </div>
      <ul className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <li
            key={i}
            className="rounded-xl border-l-4 overflow-hidden p-4"
            style={{ borderColor: "var(--card-info)", background: "var(--bg-elevated)" }}
          >
            <div className="flex justify-between items-start gap-2">
              {bar("64px")}
              {bar("48px")}
            </div>
            <div className="mt-3">{bar("75%")}</div>
            <div className="mt-2">{bar("100%")}</div>
            <div className="mt-1.5">{bar("50%")}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
