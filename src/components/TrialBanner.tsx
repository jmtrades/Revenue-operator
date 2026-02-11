"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

export function TrialBanner() {
  const { workspaceId } = useWorkspace();
  const [day, setDay] = useState(1);
  const [projectedRevenue, setProjectedRevenue] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const start = typeof window !== "undefined" ? localStorage.getItem("trial_start") : null;
    if (!start) {
      const now = new Date().toISOString();
      if (typeof window !== "undefined") localStorage.setItem("trial_start", now);
      setDay(1);
    } else {
      const elapsed = (Date.now() - new Date(start).getTime()) / (24 * 60 * 60 * 1000);
      setDay(Math.min(14, Math.max(1, Math.floor(elapsed) + 1)));
    }
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/reports/weekly?workspace_id=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => setProjectedRevenue((d.revenue_influenced_cents ?? 0) / 100))
      .catch(() => {});
  }, [workspaceId]);

  if (dismissed || day > 14) return null;

  return (
    <div className="bg-amber-950/50 border-b border-amber-800/50 px-4 py-2 flex items-center justify-between text-sm">
      <span className="text-amber-200">
        Day {day} of 14 · Projected recovered: £{projectedRevenue.toLocaleString()}
      </span>
      {day >= 10 && (
        <span className="text-amber-300 font-medium">
          Operator stops in {14 - day} days
        </span>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="text-stone-400 hover:text-stone-200"
      >
        ×
      </button>
    </div>
  );
}
