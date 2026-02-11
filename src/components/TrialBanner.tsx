"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import Link from "next/link";

export function TrialBanner() {
  const { workspaceId } = useWorkspace();
  const [day, setDay] = useState(0);
  const [conversationsAtRisk, setConversationsAtRisk] = useState<Array<{ id: string; name?: string; company?: string }>>([]);
  const [futureCalls, setFutureCalls] = useState<Array<{ deal_id: string; lead_id: string; name?: string; company?: string; value_cents?: number }>>([]);
  const [commandCenter, setCommandCenter] = useState<{
    active_protections?: { conversations_being_warmed: number; followups_scheduled_24h: number; attendance_protections: number; recoveries_running: number };
    expected_weekly?: { low: number; high: number } | null;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const start = typeof window !== "undefined" ? localStorage.getItem("trial_start") : null;
    if (!start) {
      const now = new Date().toISOString();
      if (typeof window !== "undefined") localStorage.setItem("trial_start", now);
      setDay(0);
    } else {
      const elapsed = (Date.now() - new Date(start).getTime()) / (24 * 60 * 60 * 1000);
      setDay(Math.min(14, Math.max(0, Math.floor(elapsed))));
    }
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/command-center?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => setCommandCenter(d))
      .catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId && day >= 6) {
      fetch(`/api/trial/conversations-at-risk?workspace_id=${workspaceId}`)
        .then((r) => r.json())
        .then((d) => {
          setConversationsAtRisk(d.conversations ?? []);
          setFutureCalls(d.future_calls ?? []);
        })
        .catch(() => {});
    }
  }, [workspaceId, day]);

  if (dismissed) return null;

  const ap = commandCenter?.active_protections;
  const ew = commandCenter?.expected_weekly;
  const hasProtections = ap && (ap.conversations_being_warmed > 0 || ap.followups_scheduled_24h > 0 || ap.attendance_protections > 0 || ap.recoveries_running > 0);
  const hasExpectation = ew && (ew.low > 0 || ew.high > 0);

  if (day >= 11) {
    return (
      <div className="bg-amber-950/50 border-b border-amber-800/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
        <div>
          <span className="text-amber-200 font-medium">Ongoing work and current protections</span>
          <p className="text-amber-300/90 mt-0.5 text-xs">
            {hasProtections && `Protecting ${ap!.conversations_being_warmed + ap!.followups_scheduled_24h + ap!.attendance_protections + ap!.recoveries_running} tasks. `}
            {hasExpectation && `Expected ${ew!.low}–${ew!.high} conversations per week. `}
            Interruption changes this projection.
          </p>
          {(futureCalls.length > 0 || conversationsAtRisk.length > 0) && (
            <p className="text-amber-300/90 mt-0.5 text-xs">
              {futureCalls.length > 0 && `${futureCalls.length} scheduled call${futureCalls.length !== 1 ? "s" : ""} depend on protection. `}
              {conversationsAtRisk.length > 0 && futureCalls.length === 0 && `${conversationsAtRisk.length} conversation${conversationsAtRisk.length !== 1 ? "s" : ""} will stop. `}
            </p>
          )}
        </div>
        <Link
          href="/dashboard/continue-protection"
          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium text-stone-950 shrink-0"
        >
          Keep protection active
        </Link>
      </div>
    );
  }

  if (day >= 6) {
    return (
      <div className="bg-amber-950/50 border-b border-amber-800/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
        <div>
          <span className="text-amber-200 font-medium">Current protections active</span>
          <p className="text-amber-300/90 mt-0.5 text-xs">
            {hasProtections
              ? `${ap!.conversations_being_warmed + ap!.followups_scheduled_24h + ap!.attendance_protections + ap!.recoveries_running} protection${(ap!.conversations_being_warmed + ap!.followups_scheduled_24h + ap!.attendance_protections + ap!.recoveries_running) !== 1 ? "s" : ""} running. Pause protection anytime.`
              : "Protection continues when configured. Pause protection anytime."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/continue-protection"
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium text-stone-950 shrink-0"
          >
            Keep protection active
          </Link>
          <button onClick={() => setDismissed(true)} className="text-stone-400 hover:text-stone-200">×</button>
        </div>
      </div>
    );
  }

  if (day >= 3) {
    return (
      <div className="bg-amber-950/50 border-b border-amber-800/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
        <div>
          <span className="text-amber-200 font-medium">Expected weekly conversations</span>
          <p className="text-amber-300/90 mt-0.5 text-xs">
            {hasExpectation
              ? `Based on current pipeline behaviour you should expect ${ew!.low}–${ew!.high} conversations per week.`
              : "Pipeline behaviour builds your weekly expectation. Check the dashboard for the projection."}
          </p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-stone-400 hover:text-stone-200 shrink-0">×</button>
      </div>
    );
  }

  if (day <= 2) {
    return (
      <div className="bg-amber-950/50 border-b border-amber-800/50 px-4 py-2 flex items-center justify-between text-sm">
        <span className="text-amber-200">
          Ongoing work visible in the activity feed. Check the command center.
        </span>
        <button onClick={() => setDismissed(true)} className="text-stone-400 hover:text-stone-200">×</button>
      </div>
    );
  }

  return null;
}
