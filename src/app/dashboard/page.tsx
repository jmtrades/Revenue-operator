"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";
import { ContinuityStatus } from "@/components/ContinuityStatus";

interface CommandCenterData {
  operator_status: string;
  last_action: string | null;
  next_action: string | null;
  today_booked: number;
  today_recovered: number;
  hot_leads: Array<{ lead_id: string; name?: string; email?: string; company?: string }>;
  at_risk?: Array<{ id: string; name?: string; company?: string }>;
  coverage?: { active_conversations: number };
  active_protections?: {
    conversations_being_warmed: number;
    followups_scheduled_24h: number;
    attendance_protections: number;
    recoveries_running: number;
  };
  pipeline_forecast?: { likely_bookings: number; revivals_in_progress: number; attendance_confirmations_pending: number };
  commitment_ledger?: { active_follow_ups_scheduled: number; recovery_paths_running: number; attendance_confirmations_pending: number };
  removal_simulator?: { if_paused_today: { touches_lost: number; conversations_going_cold: number; attendance_at_risk: number } };
  silence_protection?: { protected: boolean; unattended_count: number; status: "green" | "warning"; label: string };
  calendar_confidence?: number;
  recovered: Array<{ id: string; name?: string; company?: string }>;
  activity: Array<{
    what: string;
    who: string;
    when: string;
    effort_preserved?: boolean;
    is_monitoring?: boolean;
  }>;
  target_tracking?: { target: number; secured: number; gap: number } | null;
  performance_status?: { status: "ahead" | "on_track" | "behind"; adjustment?: string } | null;
  system_strategy?: string | null;
  revenue_trajectory?: "On track" | "At risk";
  live_risk_feed?: Array<{ lead_id: string; name?: string; company?: string }>;
  pipeline_health?: { tomorrow_calls_count?: number; tomorrow_attendance_probability?: number };
}

interface RiskSurfaceData {
  conversations_at_risk: Array<{ lead_id: string; name: string; risk_type: string; risk_reason: string; time_remaining_min: number | null; recommended_protection: string }>;
  calendar_at_risk: Array<{ call_id: string; lead_name: string; start_at: string; attendance_prob: number; missing_confirmation: boolean; rescue_needed: boolean }>;
  risk_surface_summary: string;
}


function toResponsibilityItem(a: CommandCenterData["activity"][0]): { text: string; recency: string } {
  const who = a.who && a.who !== "System" ? a.who : "";
  const w = (a.what || "").toLowerCase();
  const ms = Date.now() - new Date(a.when || 0).getTime();
  const recency = ms < 5 * 60_000 ? "currently" : ms < 60 * 60_000 ? "moments ago" : "recently";
  let text: string;
  if (a.effort_preserved || w.includes("secured") || w.includes("revival") || w.includes("recovery"))
    text = who ? `Recovering cooling conversation with ${who}` : "Recovering cooling conversation";
  else if (w.includes("booked") || w.includes("booking") || w.includes("scheduled"))
    text = who ? `Confirming attendance for ${who}` : "Confirming upcoming attendance";
  else if (w.includes("follow") || w.includes("followed"))
    text = who ? `Preparing response for ${who}` : "Preparing response";
  else if (w.includes("confirmed"))
    text = who ? `Confirming attendance for ${who}` : "Confirming attendance";
  else if (a.is_monitoring || w.includes("watching"))
    text = who ? `Keeping engagement with ${who}` : "Keeping conversations active";
  else
    text = who ? `${a.what} for ${who}` : a.what;
  return { text, recency };
}


function parseNextOutreachMinutes(nextAction: string | null): number | null {
  if (!nextAction) return null;
  const m = nextAction.match(/(\d+)\s*min/i);
  if (m) return parseInt(m[1], 10);
  const h = nextAction.match(/(\d+)\s*h/i);
  if (h) return parseInt(h[1], 10) * 60;
  return null;
}

export default function OverviewPage() {
  const { workspaceId, workspaces } = useWorkspace();
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [riskSurface, setRiskSurface] = useState<RiskSurfaceData | null>(null);
  const [revenueSignals, setRevenueSignals] = useState<{
    conversations_likely_quiet: number;
    follow_ups_missed: number;
    calls_unconfirmed: number;
    quiet_time_sensitivity: string | null;
    missed_time_sensitivity: string | null;
    unconfirmed_time_sensitivity: string | null;
    has_data: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const [showContinuity, setShowContinuity] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showFirstTimeMessage, setShowFirstTimeMessage] = useState(false);
  const [monitoringState, setMonitoringState] = useState<string>("");

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // Fetch revenue signals
  useEffect(() => {
    if (!workspaceId) return;
    fetchWithFallback<{
      conversations_likely_quiet: number;
      follow_ups_missed: number;
      calls_unconfirmed: number;
      quiet_time_sensitivity: string | null;
      missed_time_sensitivity: string | null;
      unconfirmed_time_sensitivity: string | null;
      has_data: boolean;
    }>(`/api/revenue-signals`)
      .then((result) => {
        if (result.data && !result.error) {
          // Ensure all fields are present
          setRevenueSignals({
            conversations_likely_quiet: result.data.conversations_likely_quiet ?? 0,
            follow_ups_missed: result.data.follow_ups_missed ?? 0,
            calls_unconfirmed: result.data.calls_unconfirmed ?? 0,
            quiet_time_sensitivity: result.data.quiet_time_sensitivity ?? null,
            missed_time_sensitivity: result.data.missed_time_sensitivity ?? null,
            unconfirmed_time_sensitivity: result.data.unconfirmed_time_sensitivity ?? null,
            has_data: result.data.has_data ?? false,
          });
        }
      })
      .catch(() => {});
    
    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetchWithFallback<{
        conversations_likely_quiet: number;
        follow_ups_missed: number;
        calls_unconfirmed: number;
        quiet_time_sensitivity: string | null;
        missed_time_sensitivity: string | null;
        unconfirmed_time_sensitivity: string | null;
        has_data: boolean;
      }>(`/api/revenue-signals`)
        .then((result) => {
          if (result.data && !result.error) {
            // Ensure all fields are present
            setRevenueSignals({
              conversations_likely_quiet: result.data.conversations_likely_quiet ?? 0,
              follow_ups_missed: result.data.follow_ups_missed ?? 0,
              calls_unconfirmed: result.data.calls_unconfirmed ?? 0,
              quiet_time_sensitivity: result.data.quiet_time_sensitivity ?? null,
              missed_time_sensitivity: result.data.missed_time_sensitivity ?? null,
              unconfirmed_time_sensitivity: result.data.unconfirmed_time_sensitivity ?? null,
              has_data: result.data.has_data ?? false,
            });
          }
        })
        .catch(() => {});
    }, 5 * 60_000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  // Rotating monitoring state (slow - every 6+ seconds)
  useEffect(() => {
    if (!workspaceId || !data) return;
    const states = [
      "We're watching reply timing",
      "We're protecting upcoming calls",
      "We're checking conversation gaps",
    ];
    let currentIdx = 0;
    const interval = setInterval(() => {
      setMonitoringState(states[currentIdx] ?? states[0]!);
      currentIdx = (currentIdx + 1) % states.length;
    }, 6000 + Math.random() * 2000); // 6-8 seconds
    return () => clearInterval(interval);
  }, [workspaceId, data]);


  useEffect(() => {
    if (!workspaceId || workspaces.length === 0) return;
    setLoading(true);
    setShowContinuity(false);
    setApiError(null);
    
    const startTime = Date.now();
    const latencyTimer = setTimeout(() => setShowContinuity(true), 1200);
    
    fetchWithFallback<Record<string, unknown> & Partial<CommandCenterData>>(
      `/api/command-center?workspace_id=${encodeURIComponent(workspaceId)}`,
      { cacheKey: `command-center-${workspaceId}`, showContinuityOnSlow: true }
    ).then((result) => {
      clearTimeout(latencyTimer);
      setShowContinuity(false);
      
      if (result.error) {
        setApiError(result.error);
        // Keep last known data if we have cache
        if (result.fromCache && result.data) {
          const d = result.data;
          const isEmpty =
            (d.hot_leads?.length ?? 0) === 0 &&
            (d.at_risk?.length ?? 0) === 0 &&
            (d.recovered?.length ?? 0) === 0 &&
            (d.activity?.length ?? 0) === 0;
          setData({ ...d, recovered: d.recovered ?? [] } as CommandCenterData);
        } else if (!data) {
          // No cache and no previous data - keep null, show monitoring state
        }
        // If we have previous data, keep it
        return;
      }
      
      const d = result.data;
      if (!d) {
        // Keep previous data or null
        return;
      }
      
      setData({ ...d, recovered: d.recovered ?? [] } as CommandCenterData);
    }).finally(() => {
      clearTimeout(latencyTimer);
      setShowContinuity(false);
      setLoading(false);
    });
  }, [workspaceId, workspaces.length, tick]);

  useEffect(() => {
    if (!workspaceId) return;
    fetchWithFallback<RiskSurfaceData>(`/api/risk-surface?workspace_id=${encodeURIComponent(workspaceId)}`, {
      cacheKey: `risk-surface-${workspaceId}`,
    }).then((result) => {
      if (result.data && !(result.data as { error?: unknown }).error) {
        setRiskSurface(result.data);
      }
      // Keep previous riskSurface on error
    });
  }, [workspaceId, tick]);

  // First-time overview message (once per workspace)
  useEffect(() => {
    if (!workspaceId || !data) return;
    const key = `first_overview_${workspaceId}`;
    const shown = typeof window !== "undefined" ? sessionStorage.getItem(key) : null;
    if (!shown) {
      setShowFirstTimeMessage(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(key, "true");
        setTimeout(() => setShowFirstTimeMessage(false), 6000);
      }
    }
  }, [workspaceId, data]);

  if (workspaces.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Your conversations, protected</h1>
          <p className="mt-3" style={{ color: "var(--text-secondary)" }}>
            Connect your sources. We maintain continuity. You take the calls.
          </p>
          <Link
            href="/activate"
            className="mt-8 inline-block px-6 py-3 rounded-lg font-medium"
            style={{ background: "var(--meaning-green)", color: "#0E1116" }}
          >
            Start protection
          </Link>
        </div>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-2" style={{ background: "var(--meaning-green)" }} aria-hidden />
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>We&apos;re watching for conversations.</h1>
          <p className="mt-2" style={{ color: "var(--text-secondary)" }}>This usually takes a few seconds once activity exists.</p>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="p-8 max-w-3xl mx-auto" style={{ color: "var(--text-primary)" }}>
        <section className="text-center py-12 px-4 rounded-xl mb-10" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
          <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-2" style={{ background: "var(--meaning-green)" }} aria-hidden />
          <p className="text-lg font-medium mb-1" style={{ color: "var(--text-primary)" }}>Checking conversations…</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Updating status…</p>
        </section>
      </div>
    );
  }

  const isPaused = data.operator_status === "Paused";
  const atRiskCount = (data.at_risk?.length ?? 0) + (data.live_risk_feed?.length ?? 0);
  const dealDeathCount = 0;
  const hasRisk = atRiskCount > 0 || dealDeathCount > 0;
  const hasUrgency = data.revenue_trajectory === "At risk" || (data.performance_status?.status === "behind" && atRiskCount > 0);

  type StatusLevel = "healthy" | "warning" | "risk";
  let statusLevel: StatusLevel = "healthy";
  if (isPaused || hasUrgency) statusLevel = "risk";
  else if (hasRisk) statusLevel = "warning";

  const statusMessage =
    statusLevel === "healthy"
      ? "All conversations stable"
      : statusLevel === "warning"
        ? "Some conversations need attention soon"
        : "Conversations at risk";

  const nextMin = parseNextOutreachMinutes(data.next_action);
  const maintainedCount =
    (data.hot_leads?.length ?? 0) +
    (data.at_risk?.length ?? 0) +
    (data.recovered?.length ?? 0) +
    (data.active_protections
      ? data.active_protections.conversations_being_warmed +
        data.active_protections.followups_scheduled_24h +
        data.active_protections.attendance_protections +
        data.active_protections.recoveries_running
      : 0);
  const displayMaintained = Math.max(
    (data.hot_leads?.length ?? 0) + (data.at_risk?.length ?? 0) + (data.recovered?.length ?? 0),
    (data.coverage?.active_conversations ?? 0) || maintainedCount || 1
  );
  const activityList = data.activity ?? [];
  const responsibilityItems = activityList.slice(0, 8).map((a) => {
    const { text, recency } = toResponsibilityItem(a);
    return `${text} — ${recency}`;
  });
  const lastActivityMs =
    activityList.length > 0
      ? Date.now() - Math.max(...activityList.map((a) => new Date(a.when || 0).getTime()))
      : null;

  const pulseColor = statusLevel === "healthy" ? "var(--meaning-green)" : statusLevel === "warning" ? "var(--meaning-amber)" : "var(--meaning-red)";

  const recentOutcomes = activityList.slice(0, 5).map((a) => {
    const { text } = toResponsibilityItem(a);
    return text;
  });

  return (
    <div className="p-8 max-w-3xl mx-auto" style={{ color: "var(--text-primary)" }}>
      <section className="text-center py-12 px-4 rounded-xl mb-10" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          We are maintaining {isPaused ? 0 : displayMaintained} conversation{displayMaintained !== 1 ? "s" : ""} for you
        </h1>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          Nothing will be sent without fitting the conversation.
        </p>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span
            className="inline-block w-3 h-3 rounded-full animate-pulse"
            style={{ background: pulseColor }}
            aria-hidden
          />
          <p className="text-lg" style={{ color: "var(--text-secondary)" }}>{statusMessage}</p>
        </div>
        <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
          We only surface conversations where money may slip.
        </p>
        {/* Forward-looking state sentence */}
        {!isPaused && (
          <p className="text-sm mt-3 font-medium" style={{ color: "var(--text-primary)" }}>
            {(() => {
              const atRisk = (data.at_risk?.length ?? 0);
              const upcomingCalls = data.activity?.filter((a) => /call|attend|book/i.test(a.what)).length ?? 0;
              if (atRisk > 0) return "We're keeping conversations from going quiet";
              if (upcomingCalls > 0) return "We're protecting upcoming attendance";
              if (data.activity && data.activity.length > 0) return "We may need to act later today";
              return "Everything stable for now";
            })()}
          </p>
        )}
        {!isPaused && nextMin != null && nextMin > 0 && (
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Next check in ~{nextMin} min
          </p>
        )}
      </section>

      <ContinuityStatus show={showContinuity} />
      {showFirstTimeMessage && (
        <div className="mb-4 py-2.5 px-4 rounded-lg text-sm transition-opacity duration-500" style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px" }}>
          <span style={{ color: "var(--text-secondary)" }}>You can close this tab — protection keeps running.</span>
        </div>
      )}
      {apiError && (
        <div className="mb-4 py-2 px-4 rounded-lg text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px" }}>
          <span className="inline-block w-2 h-2 rounded-full animate-pulse mr-2" style={{ background: "var(--meaning-amber)" }} aria-hidden />
          <span style={{ color: "var(--text-secondary)" }}>{apiError}</span>
        </div>
      )}

      {/* SECTION 1 — Needs your attention (signal engine output) */}
      {revenueSignals && (
        <section className="mb-10">
          <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>Needs your attention</h2>
          {revenueSignals.has_data && (
            revenueSignals.conversations_likely_quiet > 0 ||
            revenueSignals.follow_ups_missed > 0 ||
            revenueSignals.calls_unconfirmed > 0
          ) ? (
            <div className="space-y-3">
              {revenueSignals.conversations_likely_quiet > 0 && (
                <div className="py-3 px-4 rounded-lg" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p style={{ color: "var(--text-primary)" }} className="mb-1">
                        {revenueSignals.conversations_likely_quiet} conversation{revenueSignals.conversations_likely_quiet !== 1 ? "s" : ""} likely went quiet
                      </p>
                      <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                        Suggested: Send a short reply or close the loop
                      </p>
                      {revenueSignals.quiet_time_sensitivity && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {revenueSignals.quiet_time_sensitivity}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {revenueSignals.follow_ups_missed > 0 && (
                <div className="py-3 px-4 rounded-lg" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p style={{ color: "var(--text-primary)" }} className="mb-1">
                        {revenueSignals.follow_ups_missed} follow-up{revenueSignals.follow_ups_missed !== 1 ? "s" : ""} may have been missed
                      </p>
                      <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                        Suggested: Check if they still want help
                      </p>
                      {revenueSignals.missed_time_sensitivity && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {revenueSignals.missed_time_sensitivity}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {revenueSignals.calls_unconfirmed > 0 && (
                <div className="py-3 px-4 rounded-lg" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p style={{ color: "var(--text-primary)" }} className="mb-1">
                        {revenueSignals.calls_unconfirmed} call{revenueSignals.calls_unconfirmed !== 1 ? "s" : ""} may not have been confirmed
                      </p>
                      <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                        Suggested: Send a quick confirmation message
                      </p>
                      {revenueSignals.unconfirmed_time_sensitivity && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {revenueSignals.unconfirmed_time_sensitivity}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : revenueSignals.has_data ? (
            <div className="py-3 px-4 rounded-lg" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
              <span style={{ color: "var(--text-muted)" }}>Everything stable — no signals detected</span>
            </div>
          ) : (
            <div className="py-3 px-4 rounded-lg" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
              <span style={{ color: "var(--text-muted)" }}>We&apos;ll begin watching conversations as they happen.</span>
            </div>
          )}
        </section>
      )}

      {/* SECTION 2 — Conversations list */}
      {recentOutcomes.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>Recently handled</h2>
          <div className="space-y-2">
            {recentOutcomes.slice(0, 5).map((line, i) => (
              <div
                key={i}
                className="py-3 px-4 rounded-lg"
                style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}
              >
                <span style={{ color: "var(--text-primary)" }}>{line}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 3 — Active monitoring state (last) */}
      {monitoringState && (
        <section className="mb-10">
          <div className="py-3 px-4 rounded-lg" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <span style={{ color: "var(--text-primary)" }}>{monitoringState}</span>
          </div>
        </section>
      )}

    </div>
  );
}
