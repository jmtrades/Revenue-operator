"use client";

/**
 * Permanent reassurance anchor. Institutional tone only. No "Calls remain manual" on main layout.
 */

export function ReassuranceAnchor() {
  return (
    <div className="px-4 py-2.5 border-b" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <p className="text-sm text-center" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
        Conditions are normal.
      </p>
    </div>
  );
}
