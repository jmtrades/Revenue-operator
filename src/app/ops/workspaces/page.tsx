"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Workspace {
  id: string;
  name?: string;
  status?: string;
  health_score?: number | null;
  reason_codes?: string[];
  last_seen_at?: string | null;
  integration_status?: { zoom?: boolean };
}

export default function OpsWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ops/workspaces", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setWorkspaces(d.workspaces ?? []))
      .catch(() => setWorkspaces([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-stone-500">Loading…</div>;

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-stone-50 mb-2">Workspaces</h1>
      <p className="text-stone-400 text-sm mb-8">Workspace health monitoring</p>

      <div className="space-y-2">
        {workspaces.map((w) => (
          <div
            key={w.id}
            className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-stone-200">{w.name ?? w.id}</p>
              <p className="text-xs text-stone-500 mt-0.5">
                Status: {w.status ?? "—"} · Health: {w.health_score ?? "—"}
                {w.reason_codes?.length ? ` · ${w.reason_codes.join(", ")}` : ""}
              </p>
            </div>
            <Link href={`/dashboard?workspace=${w.id}`} className="text-amber-400 text-sm hover:underline">
              View
            </Link>
          </div>
        ))}
        {workspaces.length === 0 && <p className="text-stone-500">No workspaces</p>}
      </div>
    </div>
  );
}
