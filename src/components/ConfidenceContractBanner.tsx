"use client";

export function ConfidenceContractBanner() {
  return (
    <div className="px-4 py-2 flex items-center gap-2 text-sm" style={{ background: "rgba(77, 163, 255, 0.08)", borderBottom: "1px solid var(--border)" }}>
      <span className="shrink-0" style={{ color: "var(--meaning-blue)" }}>Accountability:</span>
      <span style={{ color: "var(--text-secondary)" }}>
        If protection fails, you will see it.
      </span>
    </div>
  );
}
