"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, LoadingState } from "@/components/ui";

interface Miss {
  lead_id: string;
  lead_name?: string;
  when: string;
  detail: string;
  recovery_scheduled: boolean;
}

export default function ReportsPage() {
  const { workspaceId } = useWorkspace();
  const [riskSurface, setRiskSurface] = useState<{ risk_incidents_prevented_this_week?: number } | null>(null);
  const [weekly, setWeekly] = useState<{
    calls_booked?: number;
    revenue_influenced_cents?: number;
    recoveries?: number;
    weekly_recap?: { secured: number; expected_without_intervention: number; delta: number };
    removal_impact?: { lost_conversations_estimate: number; lost_attendance_estimate: number; lost_opportunities_estimate: number };
  } | null>(null);
  const [misses, setMisses] = useState<{ misses: Miss[]; summary?: { recovery_scheduled: number } } | null>(null);
  const [handledImprints, setHandledImprints] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/reports/weekly?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      fetch(`/api/assurance/misses?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      fetch(`/api/risk-surface?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      fetch(`/api/handled-situations?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
    ])
      .then(([w, m, risk, situations]) => {
        setWeekly(w);
        setMisses(m.error ? null : m);
        setRiskSurface(risk?.error ? null : risk);
        setHandledImprints((situations as { imprints?: string[] }).imprints?.slice(0, 5) ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p style={{ color: "var(--text-muted)" }}>Follow-through in progress appears here.</p>
      </div>
    );
  }

  const prevented = weekly?.weekly_recap?.delta ?? 0;
  const recovered = weekly?.recoveries ?? 0;
  const revenue = (weekly?.revenue_influenced_cents ?? 0) / 100;
  const secured = weekly?.weekly_recap?.secured ?? weekly?.calls_booked ?? 0;
  const riskIncidentsPrevented = riskSurface?.risk_incidents_prevented_this_week ?? 0;

  return (
    <div className="p-8 max-w-3xl">
      <PageHeader title="Protection scope" subtitle="What continues here" />

      {loading ? (
        <LoadingState message="Preparing…" submessage="" />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>This week</h2>
            <div className="space-y-4">
              <ProofStatement
                statement="Decisions that remained on track"
                detail={prevented > 0 ? `${prevented} decision${prevented !== 1 ? "s" : ""} remained on track under protection.` : "Decision completion is in scope."}
                value={prevented}
              />
              <ProofStatement
                statement="Return timing"
                detail={recovered > 0 ? `${recovered} return${recovered !== 1 ? "s" : ""} in our responsibility this week.` : "Return timing is in scope when needed."}
                value={recovered}
              />
              <ProofStatement
                statement="Attendance stability"
                detail={secured > 0 ? `${secured} call${secured !== 1 ? "s" : ""} confirmed under protection.` : "Attendance stability is in scope."}
                value={secured}
              />
              <ProofStatement
                statement="Revenue in scope"
                detail={revenue > 0 ? `$${revenue.toLocaleString()} from decisions under handling.` : "—"}
                value={revenue > 0 ? `$${revenue.toLocaleString()}` : "—"}
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>Assurance</h2>
            <div className="space-y-4">
              <ProofStatement
                statement="Exposures contained"
                detail={riskIncidentsPrevented > 0 ? `${riskIncidentsPrevented} exposure${riskIncidentsPrevented !== 1 ? "s" : ""} did not become losses under protection.` : "No exposures this week."}
                value={riskIncidentsPrevented}
              />
            </div>
          </section>

          {handledImprints.length > 0 && (
            <section>
              <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>Handled situations</h2>
              <ul className="space-y-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                {handledImprints.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
          )}

          {misses?.misses && misses.misses.length > 0 && (
            <section>
              <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>Decisions we kept on track</h2>
              <div className="space-y-3">
                {misses.misses.slice(0, 5).map((m, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl flex items-start justify-between gap-4"
                    style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}
                  >
                    <div>
                      <p className="font-medium" style={{ color: "var(--text-primary)" }}>{m.lead_name ?? "—"}</p>
                      <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{m.detail}</p>
                      {m.recovery_scheduled && (
                        <span className="inline-block mt-2 text-xs" style={{ color: "var(--meaning-green)" }}>Follow-through in progress</span>
                      )}
                    </div>
                    <Link href={`/dashboard/leads/${m.lead_id}`} className="text-sm shrink-0" style={{ color: "var(--meaning-blue)" }}>
                      Access context
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {weekly?.removal_impact && (weekly.removal_impact.lost_conversations_estimate > 0 || weekly.removal_impact.lost_opportunities_estimate > 0) && (
            <section
              className="p-5 rounded-xl"
              style={{ background: "var(--card)", borderColor: "var(--meaning-amber)", borderWidth: "1px" }}
            >
              <p className="text-sm font-medium" style={{ color: "var(--meaning-amber)" }}>If protection stops</p>
              <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
                Response continuity, decision completion, and attendance stability will no longer be protected for in-progress work. Some decisions may stall. Attendance may no longer be stabilized.
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ProofStatement({
  statement,
  detail,
  value,
}: {
  statement: string;
  detail: string;
  value: number | string;
}) {
  return (
    <div
      className="p-5 rounded-xl"
      style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}
    >
      <p className="font-medium" style={{ color: "var(--text-primary)" }}>{statement}</p>
      <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{detail}</p>
      {typeof value === "number" && value >= 0 && (
        <p className="mt-2 text-xl font-semibold" style={{ color: "var(--meaning-green)" }}>{value}</p>
      )}
      {typeof value === "string" && value !== "—" && (
        <p className="mt-2 text-xl font-semibold" style={{ color: "var(--meaning-green)" }}>{value}</p>
      )}
    </div>
  );
}
