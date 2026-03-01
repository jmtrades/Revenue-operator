"use client";

import Link from "next/link";

export default function AdminCallsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-sm" style={{ color: "var(--text-tertiary)" }}>← Overview</Link>
        <h1 className="text-xl font-semibold">Calls</h1>
      </div>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        All calls across businesses (for QA and support).
      </p>
      <div className="rounded-lg border p-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No calls to display yet.</p>
      </div>
    </div>
  );
}
