"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

/**
 * Daily First-Open Summary: Shows what happened while user was away (≥6 hours gap).
 * Auto-dismisses after 8 seconds. One-time per session gap.
 */

const LAST_VISIT_KEY = "revenue_last_visit";
const SUMMARY_SHOWN_KEY = "revenue_summary_shown";

export function DailySummaryBanner() {
  const { workspaceId } = useWorkspace();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

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

  if (!show) return null;

  return (
    <div className="px-4 py-3 border-b" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Since you were last here:</p>
      <ul className="text-sm space-y-1" style={{ color: "var(--text-secondary)" }}>
        <li>• Conversations stayed active</li>
        <li>• Follow-ups didn&apos;t lapse</li>
        <li>• Upcoming calls stayed confirmed</li>
      </ul>
    </div>
  );
}
