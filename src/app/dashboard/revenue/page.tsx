"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

interface RevenueMetrics {
  leads_handled: number;
  bookings_created: number;
  revenue_influenced_cents: number;
  recoveries: number;
}

export default function PerformancePage() {
  const { workspaceId } = useWorkspace();
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [commandCenter, setCommandCenter] = useState<{
    active_protections?: { conversations_being_warmed: number; attendance_protections: number; recoveries_running: number };
    shift_summary?: { replies_sent: number; follow_ups_scheduled: number; calls_booked: number; calls_completed: number; recovered: number };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setMetrics(null);
      setCommandCenter(null);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/revenue?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      fetch(`/api/command-center?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
    ])
      .then(([rev, cc]) => {
        setMetrics(cc?.error ? null : rev);
        setCommandCenter(cc?.error ? null : cc);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p style={{ color: "var(--text-muted)" }}>Watching for new conversations. Maintaining continuity.</p>
      </div>
    );
  }

  const ap = commandCenter?.active_protections;
  const ss = commandCenter?.shift_summary;
  const conversationsProtected = ap
    ? ap.conversations_being_warmed + (ap.attendance_protections ?? 0) + (ap.recoveries_running ?? 0)
    : metrics?.leads_handled ?? 0;

  return (
    <div className="p-8 max-w-3xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Performance</h1>
        <p className="mt-1" style={{ color: "var(--text-secondary)" }}>Business outcomes — what we&apos;re securing for you</p>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-lg" style={{ background: "rgba(231, 76, 60, 0.1)", borderColor: "var(--meaning-red)", borderWidth: "1px", color: "var(--meaning-red)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 px-6 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
          <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-2" style={{ background: "var(--meaning-amber)" }} aria-hidden />
          <p style={{ color: "var(--text-primary)" }}>Watching over</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Preparing outcomes. Continuity monitoring in progress.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <OutcomeCard
            label="Conversations protected"
            value={conversationsProtected}
          />
          <OutcomeCard
            label="Calls secured"
            value={metrics?.bookings_created ?? ss?.calls_booked ?? 0}
          />
          <OutcomeCard
            label="Attendance secured"
            value={ss?.calls_completed ?? 0}
          />
          <OutcomeCard
            label="Recoveries secured"
            value={metrics?.recoveries ?? ss?.recovered ?? 0}
          />
        </div>
      )}
    </div>
  );
}

function OutcomeCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="p-6 rounded-xl"
      style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}
    >
      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{value}</p>
    </div>
  );
}
