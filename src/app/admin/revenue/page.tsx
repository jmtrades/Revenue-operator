"use client";

import Link from "next/link";

export default function AdminRevenuePage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-sm" style={{ color: "var(--text-tertiary)" }}>← Overview</Link>
        <h1 className="text-xl font-semibold">Revenue</h1>
      </div>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        MRR, plan distribution, churn, growth chart.
      </p>
      <div className="rounded-lg border p-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Revenue data will appear when billing and subscriptions are wired.</p>
      </div>
    </div>
  );
}
