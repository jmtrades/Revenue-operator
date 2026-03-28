"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

interface AdminStats {
  users?: {
    total: number;
    today: number;
    this_week: number;
    this_month: number;
    recent: User[];
  };
}

function MetricCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </p>
    </div>
  );
}

export default function SignupsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setStats(data);
        setError(null);
      })
      .catch((err) => {
        console.error("[admin/signups]", err);
        setError("Failed to load signup statistics. Please try again.");
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const userStats = stats?.users ?? {
    total: 0,
    today: 0,
    this_week: 0,
    this_month: 0,
    recent: [],
  };

  const filteredUsers = searchEmail
    ? userStats.recent.filter((u) => u.email.toLowerCase().includes(searchEmail.toLowerCase()))
    : userStats.recent;

  const handleExportCSV = async () => {
    try {
      const response = await fetch("/api/admin/export/signups", { credentials: "include" });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Failed to export CSV");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl space-y-8">
        <h1 className="text-3xl font-bold">Users & Signups</h1>
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl space-y-8">
        <h1 className="text-3xl font-bold">Users & Signups</h1>
        <div className="p-4 rounded-lg border" style={{ borderColor: "var(--meaning-red)", background: "var(--bg-surface)" }}>
          <p style={{ color: "var(--meaning-red)" }}>Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 rounded text-sm font-medium border"
            style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Users & Signups</h1>
        <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-1">
          User registration and signup metrics
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard value={userStats.total} label="Total Users" />
        <MetricCard value={userStats.today} label="Users Today" />
        <MetricCard value={userStats.this_week} label="Users This Week" />
        <MetricCard value={userStats.this_month} label="Users This Month" />
      </div>

      {/* Search and Export Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by email…"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border text-sm"
            style={{
              borderColor: "var(--border-default)",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:opacity-80"
          style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Users Table */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          {searchEmail ? `Results (${filteredUsers.length})` : `All Users (${userStats.recent.length})`}
        </h2>
        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          {filteredUsers.length === 0 ? (
            <p className="p-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
              {searchEmail ? "No users matching your search" : "No users yet"}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)" }}>
                  <th className="p-3 text-left font-medium">Email</th>
                  <th className="p-3 text-left font-medium">Full Name</th>
                  <th className="p-3 text-left font-medium text-xs">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, i) => (
                  <tr
                    key={user.id}
                    className="border-b hover:opacity-80 transition-opacity"
                    style={{
                      borderColor: "var(--border-default)",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <td className="p-3 font-mono text-xs" style={{ color: "var(--text-primary)" }}>
                      {user.email}
                    </td>
                    <td className="p-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {user.name || "—"}
                    </td>
                    <td className="p-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {new Date(user.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

