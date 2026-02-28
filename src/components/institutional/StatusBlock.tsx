"use client";

/**
 * Silent status card. No numbers. Labels only.
 */
export function StatusBlock({
  items,
  title = "Status",
  className = "",
}: {
  items: { label: string; value: string }[];
  title?: string;
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
        {title}
      </p>
      <dl className="grid gap-3 sm:grid-cols-2">
        {items.map((item, i) => (
          <div key={i}>
            <dt className="text-sm" style={{ color: "var(--text-muted)" }}>{item.label}</dt>
            <dd className="font-medium" style={{ color: "var(--text-primary)" }}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
