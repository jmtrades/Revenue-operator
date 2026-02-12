"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";

interface CalendarCall {
  session_id: string;
  lead_id: string;
  probability: number;
  call_started_at: string;
  lead?: { name?: string; company?: string };
}

interface CalendarRiskData {
  next_48h?: {
    likely_no_shows: CalendarCall[];
    confirmation_needed: CalendarCall[];
    high_confidence: CalendarCall[];
  };
  total_calls?: number;
}

export default function CalendarPage() {
  const { workspaceId } = useWorkspace();
  const [data, setData] = useState<CalendarRiskData | null>(null);
  const [riskSurface, setRiskSurface] = useState<{ calendar_at_risk: Array<{ call_id: string; rescue_needed: boolean }> } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workspaceId) {
      setData(null);
      setRiskSurface(null);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`/api/calendar-risk?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      fetch(`/api/risk-surface?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
    ])
      .then(([d, risk]) => {
        setData(d?.next_48h ? { next_48h: d.next_48h, total_calls: d.total_calls } : null);
        setRiskSurface(risk?.error ? null : risk);
      })
      .catch(() => { setData(null); setRiskSurface(null); })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const noShows = data?.next_48h?.likely_no_shows ?? [];
  const confirmationNeeded = data?.next_48h?.confirmation_needed ?? [];
  const highConfidence = data?.next_48h?.high_confidence ?? [];
  const rescueIds = new Set((riskSurface?.calendar_at_risk ?? []).filter((c) => c.rescue_needed).map((c) => c.call_id));
  const allCalls = [...noShows, ...confirmationNeeded, ...highConfidence].sort(
    (a, b) => new Date(a.call_started_at).getTime() - new Date(b.call_started_at).getTime()
  );

  function callStability(c: CalendarCall): "Low" | "Medium" | "High" {
    if (noShows.some((n) => n.session_id === c.session_id)) return "Low";
    if (confirmationNeeded.some((n) => n.session_id === c.session_id)) return "Medium";
    return "High";
  }

  function stabilityPct(c: CalendarCall): number {
    const s = callStability(c);
    return s === "High" ? 100 : s === "Medium" ? 60 : 25;
  }

  function preparationState(c: CalendarCall): "Prepared" | "Confirming" | "Monitoring" | "Recovering" {
    if (noShows.some((n) => n.session_id === c.session_id)) return "Recovering";
    if (confirmationNeeded.some((n) => n.session_id === c.session_id)) return "Confirming";
    if (highConfidence.some((h) => h.session_id === c.session_id)) return "Prepared";
    return "Monitoring";
  }

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p style={{ color: "var(--text-muted)" }}>Select an account.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Calendar</h1>
        <p className="mt-1" style={{ color: "var(--text-secondary)" }}>Calls arrive prepared. We maintain attendance confidence.</p>
      </header>

      {loading ? (
        <div className="py-12 px-6 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
          <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-2" style={{ background: "var(--meaning-amber)" }} aria-hidden />
          <p style={{ color: "var(--text-primary)" }}>Watching over</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Protecting booked calls. Continuity monitoring in progress.</p>
        </div>
      ) : allCalls.length === 0 ? (
        <div
          className="py-12 px-6 rounded-xl"
          style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}
        >
          <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-2" style={{ background: "var(--meaning-green)" }} aria-hidden />
          <p style={{ color: "var(--text-primary)" }}>Protecting booked calls</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>No calls in the next 48 hours. We prepare each one when booked.</p>
          <Link href="/dashboard/settings" className="mt-4 inline-block text-sm" style={{ color: "var(--meaning-blue)" }}>
            Connect calendar →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {allCalls.map((c) => {
            const stability = callStability(c);
            const prep = preparationState(c);
            const pct = stabilityPct(c);
            const barColor = stability === "High" ? "var(--meaning-green)" : stability === "Medium" ? "var(--meaning-amber)" : "var(--meaning-red)";
            const name = c.lead?.name ?? c.lead?.company ?? "—";
            return (
              <div
                key={c.session_id}
                className="p-5 rounded-xl"
                style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium" style={{ color: "var(--text-primary)" }}>{name}</p>
                    {c.lead?.company && c.lead?.company !== name && (
                      <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{c.lead.company}</p>
                    )}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1 flex-wrap gap-1" style={{ color: "var(--text-muted)" }}>
                        <span>Call stability: {stability}</span>
                        <span className="flex items-center gap-1">
                          {rescueIds.has(c.session_id) && (
                            <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(243, 156, 18, 0.2)", color: "var(--meaning-amber)" }}>Rescue in progress</span>
                          )}
                          {prep}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                    </div>
                    <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                      {new Date(c.call_started_at).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/leads/${c.lead_id}`}
                    className="text-sm font-medium shrink-0"
                    style={{ color: "var(--meaning-blue)" }}
                  >
                    View details
                  </Link>
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                  Calls arrive prepared. We maintain attendance confidence.
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
