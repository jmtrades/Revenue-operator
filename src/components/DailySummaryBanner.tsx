"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

/**
 * Daily First-Open Summary: Shows after user absence (≥6 hours gap).
 * Optionally shows 1–3 handled-situation imprints (factual, no totals).
 * Auto-dismisses after 8 seconds. One-time per session gap.
 */

const LAST_VISIT_KEY = "revenue_last_visit";
const SUMMARY_SHOWN_KEY = "revenue_summary_shown";

export function DailySummaryBanner() {
  const { workspaceId } = useWorkspace();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [imprints, setImprints] = useState<string[]>([]);

  useEffect(() => {
    if (!workspaceId || dismissed) return;

    const lastVisit = typeof window !== "undefined" ? localStorage.getItem(LAST_VISIT_KEY) : null;
    const summaryShown = typeof window !== "undefined" ? sessionStorage.getItem(SUMMARY_SHOWN_KEY) : null;

    if (summaryShown) return; // Already shown this session

    const now = Date.now();
    const sixHours = 6 * 60 * 60 * 1000;

    if (!lastVisit || (now - parseInt(lastVisit, 10)) >= sixHours) {
      setShow(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(SUMMARY_SHOWN_KEY, "true");
        setTimeout(() => {
          setShow(false);
          setDismissed(true);
        }, 8000);
      }
    }

    // Update last visit
    if (typeof window !== "undefined") {
      localStorage.setItem(LAST_VISIT_KEY, now.toString());
    }
  }, [workspaceId, dismissed]);

  useEffect(() => {
    if (!show || !workspaceId) return;
    fetch(`/api/handled-situations?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d: { imprints?: string[] }) => {
        const list = d.imprints ?? [];
        setImprints(list.slice(0, 3)); // Show at most 3, sparingly
      })
      .catch((e) => { console.warn("[DailySummaryBanner] fetch failed:", e instanceof Error ? e.message : String(e)); });
  }, [show, workspaceId]);

  if (!show) return null;

  return (
    <div className="px-4 py-3 border-b" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Everything remains in progress.</p>
      {imprints.length > 0 && (
        <ul className="text-xs mt-2 space-y-0.5" style={{ color: "var(--text-muted)" }}>
          {imprints.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
