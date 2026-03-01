"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface BusinessRow {
  id: string;
  name: string;
  owner_id: string | null;
  created_at: string;
}

export default function AdminBusinessesPage() {
  const [list, setList] = useState<BusinessRow[]>([]);

  useEffect(() => {
    fetch("/api/admin/businesses", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { businesses: [] }))
      .then((d) => setList(d.businesses ?? []))
      .catch(() => setList([]));
  }, []);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-sm" style={{ color: "var(--text-tertiary)" }}>← Overview</Link>
        <h1 className="text-xl font-semibold">Businesses</h1>
      </div>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        All workspaces (businesses). Name, owner, created date.
      </p>
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
        {list.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: "var(--text-tertiary)" }}>No businesses yet. Data appears when workspaces exist.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: "var(--border-default)" }}>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">ID</th>
                <th className="p-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr key={row.id} className="border-b" style={{ borderColor: "var(--border-default)" }}>
                  <td className="p-3">{row.name}</td>
                  <td className="p-3 font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>{row.id.slice(0, 8)}…</td>
                  <td className="p-3">{row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
