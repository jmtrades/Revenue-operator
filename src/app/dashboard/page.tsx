"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";

interface CommandCenterData {
  operator_status: string;
  last_action: string | null;
  next_action: string | null;
  today_booked: number;
  today_recovered: number;
  hot_leads: Array<{ lead_id: string; name?: string; email?: string; company?: string; probability: number; value_cents: number }>;
  at_risk: Array<{ id: string; name?: string; company?: string; state?: string }>;
  activity: Array<{ what: string; who: string; when: string; why?: string }>;
}

export default function HomePage() {
  const { workspaceId, workspaces, loadWorkspaces } = useWorkspace();
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (!workspaceId || workspaces.length === 0) return;
    setLoading(true);
    fetch(`/api/command-center?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [workspaceId, workspaces.length]);

  if (workspaces.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-semibold text-stone-50">Your AI operator is ready.</h1>
          <p className="text-stone-400 mt-2">
            Connect a lead source and it will start replying and following up automatically.
          </p>
          <ul className="mt-6 text-left space-y-2 text-stone-300">
            <li>• Replies instantly to every lead</li>
            <li>• Follows up until they answer</li>
            <li>• Recovers ghosted prospects</li>
          </ul>
          <Link
            href="/dashboard/settings"
            className="mt-8 inline-block px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium text-stone-950"
          >
            Connect your first lead source
          </Link>
        </div>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-semibold text-stone-50">Your AI operator is ready.</h1>
          <p className="text-stone-400 mt-2">
            Select an account to view your command center.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-50">Command Center</h1>
        <p className="text-stone-400 mt-1">
          What it&apos;s doing · Why · What&apos;s next
        </p>
      </header>

      <div className="mb-8 p-4 rounded-xl bg-stone-900/80 border border-stone-800 flex flex-wrap items-center gap-4">
        <div>
          <p className="text-xs text-stone-500">Operator</p>
          <p className={`font-medium ${data.operator_status === "Running" ? "text-emerald-400" : data.operator_status === "Paused" ? "text-amber-400" : "text-stone-400"}`}>
            {data.operator_status}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Last action</p>
          <p className="text-stone-300">{data.last_action ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Next</p>
          <p className="text-stone-300">{data.next_action ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Today</p>
          <p className="text-stone-300">{data.today_booked} booked · {data.today_recovered} recovered</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-medium text-stone-300 mb-3">Hot now</h2>
          <p className="text-sm text-stone-500 mb-3">Leads likely to book</p>
          {data.hot_leads.length === 0 ? (
            <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800">
              <p className="text-stone-500 text-sm">No hot leads yet.</p>
              <Link href="/dashboard/leads" className="mt-2 inline-block text-amber-400 text-sm hover:underline">
                View all leads →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {data.hot_leads.map((l) => (
                <div key={l.lead_id} className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-stone-200">{l.name || l.email || l.company || "Unknown"}</p>
                    <p className="text-xs text-stone-500">{Math.round(l.probability * 100)}% likely</p>
                  </div>
                  <Link
                    href={`/dashboard/leads/${l.lead_id}`}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-sm font-medium"
                  >
                    Run plan
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-medium text-stone-300 mb-3">At risk</h2>
          <p className="text-sm text-stone-500 mb-3">Going quiet — recover before they ghost</p>
          {data.at_risk.length === 0 ? (
            <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800">
              <p className="text-stone-500 text-sm">No at-risk leads.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.at_risk.map((l) => (
                <div key={l.id} className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-stone-200">{l.name || "Unknown"}</p>
                    <p className="text-xs text-stone-500">{l.state ?? "—"}</p>
                  </div>
                  <Link
                    href={`/dashboard/leads/${l.id}`}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-sm font-medium"
                  >
                    Recover
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-stone-300 mb-3">Activity</h2>
        <p className="text-sm text-stone-500 mb-3">Recent operator actions</p>
        {data.activity.length === 0 ? (
          <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800">
            <p className="text-stone-500 text-sm">No recent activity.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.activity.map((a, i) => (
              <div key={i} className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 text-sm">
                <span className="font-medium text-amber-400">{a.what}</span>
                <span className="text-stone-500"> · {a.who}</span>
                <span className="text-stone-500"> · {new Date(a.when).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
