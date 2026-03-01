"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface HealthState {
  ok?: boolean;
  db_reachable?: boolean;
  core_recent?: boolean;
  public_corridor_ok?: boolean;
}

export default function AdminSystemPage() {
  const [health, setHealth] = useState<HealthState | null>(null);

  useEffect(() => {
    fetch("/api/system/health", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-sm" style={{ color: "var(--text-tertiary)" }}>← Overview</Link>
        <h1 className="text-xl font-semibold">System</h1>
      </div>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        API health and core status.
      </p>
      <div className="rounded-lg border p-6 space-y-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
        {health == null ? (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Checking…</p>
        ) : (
          <>
            <p className="text-sm font-medium" style={{ color: health.ok ? "var(--meaning-green)" : "var(--text-secondary)" }}>
              Overall: {health.ok ? "OK" : "Degraded"}
            </p>
            <ul className="text-sm space-y-1" style={{ color: "var(--text-secondary)" }}>
              <li>DB reachable: {health.db_reachable ? "Yes" : "No"}</li>
              <li>Core recent: {health.core_recent ? "Yes" : "No"}</li>
              <li>Public corridor: {health.public_corridor_ok ? "OK" : "—"}</li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
