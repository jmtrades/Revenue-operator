"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CallRow {
  id: string;
  workspace_id: string | null;
  summary: string | null;
  created_at: string;
}

export default function AdminCallsPage() {
  const [list, setList] = useState<CallRow[]>([]);

  useEffect(() => {
    fetch("/api/admin/calls", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { calls: [] }))
      .then((d) => setList(d.calls ?? []))
      .catch(() => setList([]));
  }, []);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-sm" style={{ color: "var(--text-tertiary)" }}>← Overview</Link>
        <h1 className="text-xl font-semibold">Calls</h1>
      </div>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Recent calls across all businesses (for QA and support).
      </p>
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
        {list.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: "var(--text-tertiary)" }}>No calls yet. Data appears when call_sessions exist.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: "var(--border-default)" }}>
                <th className="p-3 font-medium">Workspace</th>
                <th className="p-3 font-medium">Summary</th>
                <th className="p-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr key={row.id} className="border-b" style={{ borderColor: "var(--border-default)" }}>
                  <td className="p-3 font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>{row.workspace_id ? `${row.workspace_id.slice(0, 8)}…` : "—"}</td>
                  <td className="p-3 max-w-md truncate" title={row.summary ?? undefined}>{row.summary ?? "—"}</td>
                  <td className="p-3">{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
