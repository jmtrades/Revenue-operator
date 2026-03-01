"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SignupRow {
  name: string;
  business_name: string;
  email: string;
  plan?: string;
  created_at?: string;
}

export default function AdminSignupsPage() {
  const [list, setList] = useState<SignupRow[]>([]);

  useEffect(() => {
    fetch("/api/admin/stats", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setList(d?.recentSignups ?? []))
      .catch(() => setList([]));
  }, []);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-sm" style={{ color: "var(--text-tertiary)" }}>← Overview</Link>
        <h1 className="text-xl font-semibold">Signups</h1>
      </div>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        All signups from /activate. Export as CSV below.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        <a href="/api/admin/export/signups" className="px-3 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: "var(--accent-primary)", color: "var(--accent-primary)" }} download="signups.csv">Export CSV</a>
      </div>
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
        {list.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: "var(--text-tertiary)" }}>No signups yet. Data appears when signups exist and API is wired.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: "var(--border-default)" }}>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Business</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row, i) => (
                <tr key={i} className="border-b" style={{ borderColor: "var(--border-default)" }}>
                  <td className="p-3">{row.name}</td>
                  <td className="p-3">{row.business_name}</td>
                  <td className="p-3">{row.email}</td>
                  <td className="p-3">{row.plan ?? "—"}</td>
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

