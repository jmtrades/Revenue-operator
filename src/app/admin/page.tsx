"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AdminStats {
  signupsToday?: number;
  signupsTotal?: number;
  mrr?: string;
  recentSignups?: { name: string; business_name: string; email: string; plan?: string; created_at?: string }[];
  health?: { vapi?: string; twilio?: string; supabase?: string };
  activeCalls?: number;
  callsToday?: number;
  textsToday?: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([data]) => setStats(data ?? {}))
      .catch(() => setStats({}));
  }, []);

  const signupsToday = stats?.signupsToday ?? "—";
  const signupsTotal = stats?.signupsTotal ?? "—";
  const mrr = stats?.mrr ?? "—";
  const recent = stats?.recentSignups ?? [];
  const health = stats?.health ?? {};
  const activeCalls = stats?.activeCalls ?? "—";
  const callsToday = stats?.callsToday ?? "—";
  const textsToday = stats?.textsToday ?? "—";

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-semibold">RECALL TOUCH ADMIN</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <p className="text-2xl font-semibold">{signupsToday}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Signups today</p>
        </div>
        <div className="rounded-lg border p-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <p className="text-2xl font-semibold">{signupsTotal}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Total signups</p>
        </div>
        <div className="rounded-lg border p-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <p className="text-2xl font-semibold">{mrr}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>MRR</p>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-medium mb-3">Recent signups</h2>
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          {recent.length === 0 ? (
            <p className="p-4 text-sm" style={{ color: "var(--text-tertiary)" }}>No signups yet. Data appears when signups exist and API is wired.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: "var(--border-default)" }}>
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Business</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Plan</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: "var(--border-default)" }}>
                    <td className="p-3">{row.name}</td>
                    <td className="p-3">{row.business_name}</td>
                    <td className="p-3">{row.email}</td>
                    <td className="p-3">{row.plan ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-2">
          <Link href="/admin/signups" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>View all signups</Link>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">System health</h2>
        <div className="flex flex-wrap gap-4">
          <span className="inline-flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden /> Vapi: {health.vapi ?? "—"}
          </span>
          <span className="inline-flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden /> Twilio: {health.twilio ?? "—"}
          </span>
          <span className="inline-flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden /> Supabase: {health.supabase ?? "—"}
          </span>
        </div>
        <p className="text-sm mt-2" style={{ color: "var(--text-tertiary)" }}>Active calls right now: {activeCalls}</p>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Calls today: {callsToday} · Texts today: {textsToday}</p>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/signups" className="px-3 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}>View all signups</Link>
          <a href="/api/admin/export/signups" className="px-3 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }} download="signups.csv">Export signups CSV</a>
          <Link href="/admin/calls" className="px-3 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}>View all calls</Link>
          <Link href="/admin/revenue" className="px-3 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}>View revenue</Link>
          <Link href="/admin/system" className="px-3 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}>System logs</Link>
        </div>
      </section>
    </div>
  );
}
