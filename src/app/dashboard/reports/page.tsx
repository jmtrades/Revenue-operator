"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

interface DiagnosisItem {
  problem: string;
  evidence: string;
  recommended_fix: string;
}

export default function ReportsPage() {
  const { workspaceId } = useWorkspace();
  const [weekly, setWeekly] = useState<{
    calls_booked?: number;
    revenue_influenced_cents?: number;
    recoveries?: number;
  } | null>(null);
  const [diagnosis, setDiagnosis] = useState<{ diagnosis: DiagnosisItem[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/reports/weekly?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      fetch(`/api/reports/diagnosis?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
    ])
      .then(([w, d]) => {
        setWeekly(w);
        setDiagnosis(d);
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
