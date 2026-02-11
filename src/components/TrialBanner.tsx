"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import Link from "next/link";

export function TrialBanner() {
  const { workspaceId } = useWorkspace();
  const [day, setDay] = useState(1);
  const [projectedRevenue, setProjectedRevenue] = useState(0);
  const [conversationsRecovered, setConversationsRecovered] = useState(0);
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
      .then((d) => {
        setProjectedRevenue((d.revenue_influenced_cents ?? 0) / 100);
        setConversationsRecovered(d.recoveries ?? 0);
      })
      .catch(() => {});
  }, [workspaceId]);

  if (dismissed) return null;

  // Day 14: require upgrade
  if (day >= 14) {
    return (
      <div className="bg-red-950/60 border-b border-red-900 px-4 py-3 flex items-center justify-between text-sm">
        <span className="text-red-200 font-medium">Your trial has ended. Upgrade to keep the operator running.</span>
        <Link
          href="/dashboard/settings"
          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium text-stone-950"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  // Day 10-13: projected lost revenue if disabled
  if (day >= 10) {
    return (
      <div className="bg-amber-950/50 border-b border-amber-800/50 px-4 py-2 flex items-center justify-between text-sm">
        <span className="text-amber-200">
          Day {day} of 14 · If you stop now: £{projectedRevenue.toLocaleString()} at risk
        </span>
        <span className="text-amber-300 font-medium">
          {14 - day} days left · Upgrade to keep it running
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="text-stone-400 hover:text-stone-200"
        >
          ×
        </button>
      </div>
    );
  }

  // Day 1-9: show recovered conversations
  return (
    <div className="bg-amber-950/50 border-b border-amber-800/50 px-4 py-2 flex items-center justify-between text-sm">
      <span className="text-amber-200">
        Day {day} of 14 · Conversations recovered: {conversationsRecovered}
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="text-stone-400 hover:text-stone-200"
      >
        ×
      </button>
    </div>
  );
}
