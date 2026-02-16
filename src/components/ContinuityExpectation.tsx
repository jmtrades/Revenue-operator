"use client";

/**
 * Continuity expectation: one calm line. No rotation, no timers.
 * UI changes only on navigation.
 */

const CALM_LINE = "Decisions remain on track.";

export function ContinuityExpectation({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
      {CALM_LINE}
    </p>
  );
}
