"use client";

/**
 * 7-Day guidance strip. No progress bar. No gamification.
 */
export function GuidanceStrip({
  items,
  className = "",
}: {
  items: { period: string; line: string }[];
  className?: string;
}) {
  return (
    <div
      className={`rounded-[12px] border p-6 ${className}`}
      style={{ background: "var(--surface-card)", borderColor: "var(--border)" }}
    >
      <p
        className="text-[13px] font-medium uppercase tracking-[0.08em] mb-4"
        style={{ color: "var(--text-muted)" }}
      >
        7-Day guidance
      </p>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <span style={{ color: "var(--text-muted)" }}>{item.period}:</span> {item.line}
          </li>
        ))}
      </ul>
    </div>
  );
}
