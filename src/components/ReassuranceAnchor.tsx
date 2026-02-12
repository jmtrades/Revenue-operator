"use client";

/**
 * Permanent reassurance anchor: "You only take calls. We maintain everything else."
 * Always visible, not dismissible, calm text. Eliminates "Now what?" anxiety.
 */

export function ReassuranceAnchor() {
  return (
    <div className="px-4 py-2.5 border-b" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
        You only take calls. We maintain everything else.
      </p>
      <p className="text-xs text-center mt-1" style={{ color: "var(--text-muted)" }}>
        If protection stops, conversations may quietly fade.
      </p>
    </div>
  );
}
