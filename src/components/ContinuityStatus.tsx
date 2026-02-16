"use client";

import { useState, useEffect } from "react";

/**
 * Shows calm continuity message when API requests are slow (>1200ms).
 * Used for network latency masking.
 */

export function ContinuityStatus({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="px-4 py-2 text-sm text-center" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--text-muted)" }}>Continuity remains in place.</span>
    </div>
  );
}
