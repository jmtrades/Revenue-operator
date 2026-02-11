"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";

interface DiagnosisItem {
  problem: string;
  evidence: string;
  recommended_fix: string;
}

interface ProtectionStandard {
  id: string;
  label: string;
  description: string;
  status: "met" | "violated";
  violations: Array<{ when: string; detail: string; lead_id?: string }>;
}

interface Miss {
  type: string;
  lead_id: string;
  lead_name?: string;
  when: string;
  detail: string;
  recovery_scheduled: boolean;
}

export default function ReportsPage() {
  const { workspaceId } = useWorkspace();
  const [standards, setStandards] = useState<{ standards: ProtectionStandard[]; summary?: { total_violations: number } } | null>(null);
  const [misses, setMisses] = useState<{ misses: Miss[]; summary?: { total_misses: number; recovery_scheduled: number } } | null>(null);
  const [weekly, setWeekly] = useState<{
    calls_booked?: number;
    revenue_influenced_cents?: number;
    recoveries?: number;
    weekly_recap?: { secured: number; expected_without_intervention: number; delta: number };
    removal_impact?: { lost_conversations_estimate: number; lost_attendance_estimate: number; lost_opportunities_estimate: number; message: string };
  } | null>(null);
  const [diagnosis, setDiagnosis] = useState<{ diagnosis: DiagnosisItem[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/reports/weekly?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      fetch(`/api/reports/diagnosis?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      fetch(`/api/assurance/protection-standards?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      fetch(`/api/assurance/misses?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
    ])
      .then(([w, d, s, m]) => {
        setWeekly(w);
        setDiagnosis(d);
        setStandards(s.error ? null : s);
        setMisses(m.error ? null : m);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Select an account.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-50">Reports</h1>
        <p className="text-stone-400 mt-1">
          Booked calls · Recovered revenue · Response speed
        </p>
      </header>

      {loading ? (
        <p className="text-stone-500">Loading…</p>
      ) : (
        <>
          {weekly?.weekly_recap && (
            <section className="mb-8 p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
              <h2 className="text-sm font-medium text-emerald-300 mb-3">Weekly recap: your performance with preparation</h2>
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-2xl font-semibold text-stone-200">{weekly.weekly_recap.secured}</p>
                  <p className="text-xs text-stone-500">secured (7d)</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-stone-500">{weekly.weekly_recap.expected_without_intervention}</p>
                  <p className="text-xs text-stone-500">expected without intervention</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-emerald-400">+{weekly.weekly_recap.delta}</p>
                  <p className="text-xs text-stone-500">from prepared outreach</p>
                </div>
              </div>
            </section>
          )}
          <section className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
              <p className="text-sm text-stone-500">Booked calls (7d)</p>
              <p className="text-2xl font-semibold text-stone-50 mt-1">{weekly?.calls_booked ?? 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
              <p className="text-sm text-stone-500">Recovered revenue (7d)</p>
              <p className="text-2xl font-semibold text-emerald-400 mt-1">
                £{((weekly?.revenue_influenced_cents ?? 0) / 100).toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
              <p className="text-sm text-stone-500">Recovered leads (7d)</p>
              <p className="text-2xl font-semibold text-stone-50 mt-1">{weekly?.recoveries ?? 0}</p>
            </div>
          </section>

          {standards && (
            <section className="mb-8 p-4 rounded-xl bg-stone-900/80 border border-stone-800">
              <h2 className="text-sm font-medium text-stone-400 mb-3">Protection standards</h2>
              <p className="text-stone-500 text-xs mb-4">Operational guarantees. Violations surface immediately.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {standards.standards?.map((s) => (
                  <div
                    key={s.id}
                    className={`p-3 rounded-lg ${
                      s.status === "violated" ? "bg-amber-950/30 border border-amber-800/50" : "bg-stone-800/60"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={s.status === "violated" ? "text-amber-400" : "text-emerald-500"}>
                        {s.status === "violated" ? "⚠" : "✓"}
                      </span>
                      <div>
                        <p className={`text-sm font-medium ${s.status === "violated" ? "text-amber-200" : "text-stone-200"}`}>
                          {s.label}
                        </p>
                        {s.violations?.length > 0 && (
                          <ul className="mt-1 space-y-0.5 text-xs text-amber-300/90">
                            {s.violations.slice(0, 2).map((v, i) => (
                              <li key={i}>
                                {v.detail}
                                {v.lead_id && (
                                  <Link href={`/dashboard/leads/${v.lead_id}`} className="ml-1 text-amber-400 hover:underline">View</Link>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {misses && misses.misses?.length > 0 && (
            <section className="mb-8 p-4 rounded-xl bg-amber-950/20 border border-amber-800/50">
              <h2 className="text-sm font-medium text-amber-300 mb-3">Miss reporting</h2>
              <p className="text-stone-500 text-xs mb-4">Missed protections. Recovery automatically scheduled where possible.</p>
              <div className="space-y-2">
                {misses.misses.slice(0, 8).map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-amber-950/30 text-sm">
                    <div>
                      <p className="text-amber-200 font-medium">{m.lead_name ?? "Unknown"}</p>
                      <p className="text-amber-300/80 text-xs">{m.detail}</p>
                      <p className="text-stone-500 text-xs">{new Date(m.when).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.recovery_scheduled && (
                        <span className="px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-300 text-xs">Recovery scheduled</span>
                      )}
                      <Link href={`/dashboard/leads/${m.lead_id}`} className="text-amber-400 hover:underline text-xs">View</Link>
                    </div>
                  </div>
                ))}
              </div>
              {misses.summary?.recovery_scheduled != null && misses.summary.recovery_scheduled > 0 && (
                <p className="mt-3 text-emerald-400 text-xs">
                  {misses.summary.recovery_scheduled} recovery path{misses.summary.recovery_scheduled !== 1 ? "s" : ""} in progress
                </p>
              )}
            </section>
          )}

          {weekly?.removal_impact && (weekly.removal_impact.lost_conversations_estimate > 0 || weekly.removal_impact.lost_attendance_estimate > 0) && (
            <section className="mb-8 p-4 rounded-xl bg-amber-950/20 border border-amber-800/50">
              <h2 className="text-sm font-medium text-amber-300 mb-2">Removal impact (this week)</h2>
              <p className="text-xs text-stone-500 mb-3">{weekly.removal_impact.message}</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xl font-semibold text-amber-200">{weekly.removal_impact.lost_conversations_estimate}</p>
                  <p className="text-xs text-stone-500">Conversations likely lost</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-amber-200">{weekly.removal_impact.lost_attendance_estimate}</p>
                  <p className="text-xs text-stone-500">Attendance would not have occurred</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-amber-200">{weekly.removal_impact.lost_opportunities_estimate}</p>
                  <p className="text-xs text-stone-500">Opportunities at risk</p>
                </div>
              </div>
            </section>
          )}

          <section>
            <h2 className="text-lg font-medium text-stone-300 mb-3">Weekly diagnosis</h2>
            {diagnosis?.diagnosis?.length ? (
              <div className="space-y-3">
                {diagnosis.diagnosis.map((d, i) => (
                  <div key={i} className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
                    <p className="font-medium text-amber-400">Your biggest leak: {d.problem}</p>
                    <p className="text-sm text-stone-400 mt-1">{d.evidence}</p>
                    <p className="text-sm text-stone-300 mt-2">
                      Fix: {d.recommended_fix}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800">
                <p className="text-stone-500 text-sm">No bottlenecks detected in the last 7 days.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
