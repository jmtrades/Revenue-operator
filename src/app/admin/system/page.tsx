"use client";

import { useEffect, useState } from "react";

interface HealthState {
  ok?: boolean;
  db_reachable?: boolean;
  core_recent?: boolean;
  public_corridor_ok?: boolean;
  voice_server_ok?: boolean;
  voice_hf_hub_token_configured?: boolean | null;
}

interface AdminStats {
  health?: {
    voice_server: string;
    voice_server_details: {
      ok: boolean;
      latency_ms: number | null;
      active_sessions: number | null;
      max_concurrent: number | null;
      tts_engine: string | null;
      stt_engine: string | null;
    };
  };
}

function ServiceIndicator({ name, status }: { name: string; status: "online" | "offline" | "degraded" }) {
  const colors = {
    online: "var(--meaning-green)",
    offline: "var(--meaning-red)",
    degraded: "var(--accent-primary)",
  };

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
      <div
        className="w-3 h-3 rounded-full"
        style={{ background: colors[status] }}
      />
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {name}
        </p>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </p>
      </div>
    </div>
  );
}

export default function SystemPage() {
  const [health, setHealth] = useState<HealthState | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/system/health", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/stats", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([healthData, statsData]) => {
        setHealth(healthData);
        setStats(statsData);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl space-y-8">
        <h1 className="text-3xl font-bold">System Status</h1>
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl space-y-8">
        <h1 className="text-3xl font-bold">System Status</h1>
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

  const voiceDetails = stats?.health?.voice_server_details ?? { ok: false, latency_ms: null, active_sessions: null, max_concurrent: null, tts_engine: null, stt_engine: null };
  const voiceStatus = voiceDetails.ok ? "online" : "offline";

  return (
    <div className="max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">System Status</h1>
        <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-1">
          Core service health and system metrics
        </p>
      </div>

      {/* Overall Status */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Overall Status</h2>
        <div
          className="rounded-lg border p-6"
          style={{
            borderColor: "var(--border-default)",
            background: health?.ok ? "rgba(34, 197, 94, 0.05)" : "rgba(239, 68, 68, 0.05)",
          }}
        >
          <p
            className="text-2xl font-bold"
            style={{
              color: health?.ok ? "var(--meaning-green)" : "var(--meaning-red)",
            }}
          >
            {health?.ok ? "All Systems Operational" : "System Degraded"}
          </p>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-2">
            Last checked: {new Date().toLocaleString()}
          </p>
        </div>
      </section>

      {/* Service Status */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Service Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ServiceIndicator name="Database (Supabase)" status={health?.db_reachable ? "online" : "offline"} />
          <ServiceIndicator name="Core API" status={health?.core_recent ? "online" : "offline"} />
          <ServiceIndicator name="Voice Server" status={voiceStatus} />
          <ServiceIndicator name="Public Corridor" status={health?.public_corridor_ok ? "online" : "degraded"} />
        </div>
      </section>

      {/* Voice Server Details */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Voice Server Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border p-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
            <p style={{ color: "var(--text-tertiary)" }} className="text-xs uppercase tracking-wider">
              Latency
            </p>
            <p className="text-3xl font-bold mt-1">
              {voiceDetails.latency_ms ?? "—"}
              {voiceDetails.latency_ms != null && <span className="text-lg">ms</span>}
            </p>
          </div>

          <div className="rounded-lg border p-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
            <p style={{ color: "var(--text-tertiary)" }} className="text-xs uppercase tracking-wider">
              Active Sessions
            </p>
            <p className="text-3xl font-bold mt-1">{voiceDetails.active_sessions ?? "—"}</p>
          </div>

          <div className="rounded-lg border p-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
            <p style={{ color: "var(--text-tertiary)" }} className="text-xs uppercase tracking-wider">
              TTS Engine
            </p>
            <p className="text-sm font-medium mt-2" style={{ color: "var(--text-primary)" }}>
              {voiceDetails.tts_engine ?? "Not configured"}
            </p>
          </div>

          <div className="rounded-lg border p-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
            <p style={{ color: "var(--text-tertiary)" }} className="text-xs uppercase tracking-wider">
              STT Engine
            </p>
            <p className="text-sm font-medium mt-2" style={{ color: "var(--text-primary)" }}>
              {voiceDetails.stt_engine ?? "Not configured"}
            </p>
          </div>

          <div className="rounded-lg border p-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
            <p style={{ color: "var(--text-tertiary)" }} className="text-xs uppercase tracking-wider">
              Max Concurrent
            </p>
            <p className="text-3xl font-bold mt-1">{voiceDetails.max_concurrent ?? "—"}</p>
          </div>

          <div className="rounded-lg border p-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
            <p style={{ color: "var(--text-tertiary)" }} className="text-xs uppercase tracking-wider">
              Status
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: voiceStatus === "online" ? "var(--meaning-green)" : "var(--meaning-red)" }}
              />
              <p className="text-sm font-medium">{voiceStatus === "online" ? "Connected" : "Disconnected"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Configuration Summary */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Configuration</h2>
        <div
          className="rounded-lg border p-6 space-y-3"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          <div className="flex items-center justify-between">
            <p style={{ color: "var(--text-secondary)" }}>Voice Server URL</p>
            <p className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
              {voiceDetails.ok ? "Configured" : "Not configured"}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p style={{ color: "var(--text-secondary)" }}>HF Hub Token</p>
            <p className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
              {health?.voice_hf_hub_token_configured === true
                ? "Set"
                : health?.voice_hf_hub_token_configured === false
                  ? "Not set"
                  : "Unknown"}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p style={{ color: "var(--text-secondary)" }}>Database Connection</p>
            <p className="text-xs font-mono" style={{ color: health?.db_reachable ? "var(--meaning-green)" : "var(--meaning-red)" }}>
              {health?.db_reachable ? "Connected" : "Disconnected"}
            </p>
          </div>
        </div>
      </section>

      {/* System Alerts */}
      <section>
        <h2 className="text-lg font-semibold mb-4">System Alerts</h2>
        <div
          className="rounded-lg border p-6"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          {health?.ok ? (
            <p style={{ color: "var(--meaning-green)" }} className="text-sm font-medium">
              No active alerts
            </p>
          ) : (
            <div className="space-y-2">
              {!health?.db_reachable && (
                <div
                  className="p-3 rounded border-l-4"
                  style={{
                    borderColor: "var(--meaning-red)",
                    background: "rgba(239, 68, 68, 0.05)",
                  }}
                >
                  <p style={{ color: "var(--meaning-red)" }} className="text-sm font-medium">
                    Database Unreachable
                  </p>
                  <p style={{ color: "var(--text-tertiary)" }} className="text-xs mt-1">
                    The Supabase database connection is down.
                  </p>
                </div>
              )}

              {!health?.core_recent && (
                <div
                  className="p-3 rounded border-l-4"
                  style={{
                    borderColor: "var(--meaning-red)",
                    background: "rgba(239, 68, 68, 0.05)",
                  }}
                >
                  <p style={{ color: "var(--meaning-red)" }} className="text-sm font-medium">
                    Core API Not Responding
                  </p>
                  <p style={{ color: "var(--text-tertiary)" }} className="text-xs mt-1">
                    The core API has not responded to recent health checks.
                  </p>
                </div>
              )}

              {!voiceDetails.ok && (
                <div
                  className="p-3 rounded border-l-4"
                  style={{
                    borderColor: "var(--meaning-red)",
                    background: "rgba(239, 68, 68, 0.05)",
                  }}
                >
                  <p style={{ color: "var(--meaning-red)" }} className="text-sm font-medium">
                    Voice Server Offline
                  </p>
                  <p style={{ color: "var(--text-tertiary)" }} className="text-xs mt-1">
                    The voice server is not accessible. Calls may fail.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
