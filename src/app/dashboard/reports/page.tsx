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
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/reports/weekly?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      fetch(`/api/assurance/misses?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      fetch(`/api/risk-surface?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
    ])
      .then(([w, m, risk]) => {
        setWeekly(w);
        setMisses(m.error ? null : m);
        setRiskSurface(risk?.error ? null : risk);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, tick]);

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p style={{ color: "var(--text-muted)" }}>Watching for new conversations. Maintaining continuity.</p>
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
      <PageHeader title="Outcomes" subtitle="What we're securing for you" />

      {loading ? (
        <LoadingState message="Watching over" submessage="Preparing. Monitoring in progress." />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>This week</h2>
            <div className="space-y-4">
              <ProofStatement
                statement="Missed opportunities prevented"
                detail={prevented > 0 ? `We secured ${prevented} conversation${prevented !== 1 ? "s" : ""} that would not have happened without continuity.` : "We are protecting your conversations from going cold."}
                value={prevented}
              />
              <ProofStatement
                statement="Recoveries secured"
                detail={recovered > 0 ? `Recovering ${recovered} cooling conversation${recovered !== 1 ? "s" : ""}.` : "Keeping conversations active. No recoveries needed."}
                value={recovered}
              />
              <ProofStatement
                statement="Attendance improved"
                detail={secured > 0 ? `${secured} call${secured !== 1 ? "s" : ""} secured.` : "Calls will appear as they&apos;re booked."}
                value={secured}
              />
              <ProofStatement
                statement="Revenue influenced"
                detail={revenue > 0 ? `£${revenue.toLocaleString()} from conversations we prepared.` : "Revenue builds as deals close."}
                value={revenue > 0 ? `£${revenue.toLocaleString()}` : "—"}
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>Assurance</h2>
            <div className="space-y-4">
              <ProofStatement
                statement="Incidents prevented this week"
                detail={riskIncidentsPrevented > 0 ? `Protecting ${riskIncidentsPrevented} exposure${riskIncidentsPrevented !== 1 ? "s" : ""} from becoming losses.` : "No exposures this week. Continuity maintained."}
                value={riskIncidentsPrevented}
              />
            </div>
          </section>

          {misses?.misses && misses.misses.length > 0 && (
            <section>
              <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>Missed opportunities we caught</h2>
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
                        <span className="inline-block mt-2 text-xs" style={{ color: "var(--meaning-green)" }}>Recovery in progress</span>
                      )}
                    </div>
                    <Link href={`/dashboard/leads/${m.lead_id}`} className="text-sm shrink-0" style={{ color: "var(--meaning-blue)" }}>
                      See context
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
              <p className="text-sm font-medium" style={{ color: "var(--meaning-amber)" }}>If protection were paused this week</p>
              <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
                ~{weekly.removal_impact.lost_conversations_estimate} conversations would go cold · ~{weekly.removal_impact.lost_opportunities_estimate} opportunities at risk
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
