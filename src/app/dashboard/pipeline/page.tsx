"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import Link from "next/link";

interface PipelineItem {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  state: string;
  last_activity_at: string;
  deals: Array<{ id: string; value_cents: number; status: string }>;
}

export default function PipelinePage() {
  const { workspaceId } = useWorkspace();
  const [byState, setByState] = useState<Record<string, PipelineItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setByState({});
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/pipeline?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((d) => setByState(d.by_state ?? {}))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const states = ["NEW", "CONTACTED", "ENGAGED", "QUALIFIED", "BOOKED", "SHOWED", "WON", "LOST", "REACTIVATE"];

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Select a workspace.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-50">Pipeline</h1>
        <p className="text-stone-400 mt-1">Leads by lifecycle state</p>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-300">{error}</div>
      )}

      {loading ? (
        <p className="text-stone-500">Loading…</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {states.map((state) => (
            <div
              key={state}
              className="w-72 shrink-0 rounded-xl bg-stone-900/80 border border-stone-800 flex flex-col max-h-[70vh]"
            >
              <div className="p-3 border-b border-stone-800">
                <h2 className="font-medium text-stone-200">{state}</h2>
                <p className="text-xs text-stone-500">{(byState[state] ?? []).length} leads</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {(byState[state] ?? []).map((p) => (
                  <Link
                    key={p.id}
                    href={`/dashboard/leads/${p.id}`}
                    className="block p-3 rounded-lg bg-stone-800/60 hover:bg-stone-800 border border-stone-700/50"
                  >
                    <p className="font-medium text-stone-200 text-sm truncate">{p.name ?? p.email ?? "—"}</p>
                    <p className="text-xs text-stone-500 truncate">{p.company ?? ""}</p>
                    {p.deals.length > 0 && (
                      <p className="text-xs text-amber-400 mt-0.5">
                        ${(p.deals[0].value_cents / 100).toLocaleString()}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
