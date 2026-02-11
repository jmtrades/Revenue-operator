"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

interface DiagnosisItem {
  problem: string;
  evidence: string;
  recommended_fix: string;
}

interface PerfItem {
  user_id: string;
  show_rate: number;
  close_rate: number;
  avg_deal_risk: number;
  avg_follow_up_delay_hours: number;
  deals_assigned: number;
}

interface Guarantees {
  response_sla_pct: number;
  followup_sla_pct: number;
  booking_accuracy_pct: number;
  safety_compliance_pct: number;
}

export default function ReportsPage() {
  const { workspaceId } = useWorkspace();
  const [diagnosis, setDiagnosis] = useState<{ diagnosis: DiagnosisItem[]; period_start: string; period_end: string } | null>(null);
  const [performance, setPerformance] = useState<{ performance: PerfItem[] } | null>(null);
  const [guarantees, setGuarantees] = useState<Guarantees | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/reports/diagnosis?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      fetch(`/api/team/performance?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      fetch(`/api/reports/guarantees?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
    ])
      .then(([d, p, g]) => {
        setDiagnosis(d);
        setPerformance(p);
        setGuarantees(g);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Select a workspace.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-50">Reports</h1>
        <p className="text-stone-400 mt-1">
          Pipeline diagnosis · Rep performance
        </p>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-300">{error}</div>
      )}

      {loading ? (
        <p className="text-stone-500">Loading…</p>
      ) : (
        <>
          {guarantees && (
            <section className="mb-10 p-4 rounded-xl bg-stone-900/80 border border-stone-800">
              <h2 className="text-lg font-medium text-stone-300 mb-4">Operational Guarantees</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-stone-500">Response SLA (&lt;60s)</p>
                  <p className="text-xl font-semibold text-emerald-400">{guarantees.response_sla_pct?.toFixed(1) ?? "—"}%</p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Follow-up SLA</p>
                  <p className="text-xl font-semibold text-emerald-400">{guarantees.followup_sla_pct?.toFixed(1) ?? "—"}%</p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Booking Accuracy</p>
                  <p className="text-xl font-semibold text-emerald-400">{guarantees.booking_accuracy_pct?.toFixed(1) ?? "—"}%</p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Safety Compliance</p>
                  <p className="text-xl font-semibold text-emerald-400">{guarantees.safety_compliance_pct?.toFixed(1) ?? "—"}%</p>
                </div>
              </div>
            </section>
          )}
          <section className="mb-10">
            <h2 className="text-lg font-medium text-stone-300 mb-4">Weekly Bottleneck Diagnosis</h2>
            {diagnosis?.diagnosis?.length ? (
              <div className="space-y-3">
                {diagnosis.diagnosis.map((d, i) => (
                  <div key={i} className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
                    <p className="font-medium text-amber-400">{d.problem}</p>
                    <p className="text-sm text-stone-400 mt-1">{d.evidence}</p>
                    <p className="text-sm text-stone-300 mt-2">
                      <span className="text-stone-500">Fix: </span>
                      {d.recommended_fix}
                    </p>
                  </div>
                ))}
                <p className="text-xs text-stone-500 mt-2">
                  Period: {diagnosis.period_start && new Date(diagnosis.period_start).toLocaleDateString()} – {diagnosis.period_end && new Date(diagnosis.period_end).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <p className="text-stone-500 text-sm">No bottlenecks detected in the last 7 days.</p>
            )}
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-300 mb-4">Rep Performance</h2>
            {performance?.performance?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-700">
                      <th className="text-left py-3 px-4 text-stone-400 font-medium">Closer</th>
                      <th className="text-right py-3 px-4 text-stone-400 font-medium">Deals</th>
                      <th className="text-right py-3 px-4 text-stone-400 font-medium">Show Rate</th>
                      <th className="text-right py-3 px-4 text-stone-400 font-medium">Close Rate</th>
                      <th className="text-right py-3 px-4 text-stone-400 font-medium">Avg Deal Risk</th>
                      <th className="text-right py-3 px-4 text-stone-400 font-medium">Avg Follow-up (h)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performance.performance.map((p, i) => (
                      <tr key={i} className="border-b border-stone-800">
                        <td className="py-3 px-4 text-stone-300">{p.user_id.slice(0, 8)}…</td>
                        <td className="py-3 px-4 text-right text-stone-300">{p.deals_assigned}</td>
                        <td className="py-3 px-4 text-right text-stone-300">{(p.show_rate * 100).toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right text-stone-300">{(p.close_rate * 100).toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right text-stone-300">{p.avg_deal_risk.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-stone-300">{p.avg_follow_up_delay_hours.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-stone-500 text-sm">No closers with assigned leads yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
