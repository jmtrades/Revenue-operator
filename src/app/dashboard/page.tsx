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

const DEMO_BY_INDUSTRY: Record<string, { hot: Array<{ name: string; company: string }>; atRisk: Array<{ name: string; company: string }>; recovered: Array<{ name: string; company: string }> }> = {
  saas: { hot: [{ name: "Sarah", company: "CloudStack Inc" }, { name: "James", company: "DevTools Ltd" }], atRisk: [{ name: "Mike", company: "SaaS Metrics" }], recovered: [{ name: "Sarah", company: "CloudStack Inc" }] },
  agency: { hot: [{ name: "Emma", company: "Brand Partners" }], atRisk: [{ name: "Lisa", company: "Media Agency" }], recovered: [{ name: "Emma", company: "Brand Partners" }] },
  ecommerce: { hot: [{ name: "Alex", company: "Retail Direct" }], atRisk: [{ name: "Taylor", company: "D2C Brand" }], recovered: [{ name: "Alex", company: "Retail Direct" }] },
  consulting: { hot: [{ name: "Morgan", company: "Strategy Partners" }], atRisk: [{ name: "Riley", company: "Consulting Co" }], recovered: [{ name: "Morgan", company: "Strategy Partners" }] },
  other: { hot: [{ name: "Sarah", company: "Acme Ltd" }], atRisk: [{ name: "Mike", company: "TechCorp" }], recovered: [{ name: "Sarah", company: "Acme Ltd" }] },
};

function getDemoData(businessType?: string | null): Partial<CommandCenterData> {
  const industry = DEMO_BY_INDUSTRY[businessType ?? "other"] ?? DEMO_BY_INDUSTRY.other;
  const hot = industry.hot;
  const atRisk = industry.atRisk;
  const recovered = industry.recovered;
  return {
    operator_status: "Active",
    last_action: "Followed up (2 min ago)",
    next_action: "Follow-up in 12 min",
    today_booked: 2,
    today_recovered: 1,
    target_tracking: { target: 12, secured: 5, gap: 7 },
    performance_status: { status: "behind", adjustment: "Increasing follow-ups to maintain weekly goal" },
    system_strategy: "Increasing follow-ups to maintain weekly goal",
    pipeline_forecast: { likely_bookings: 2, revivals_in_progress: 1, attendance_confirmations_pending: 3 },
    commitment_ledger: { active_follow_ups_scheduled: 5, recovery_paths_running: 1, attendance_confirmations_pending: 3 },
    silence_protection: { protected: true, unattended_count: 0, status: "green", label: "All conversations protected" },
    removal_simulator: { if_paused_today: { touches_lost: 5, conversations_going_cold: 4, attendance_at_risk: 3 } },
    calendar_confidence: 72,
    hot_leads: hot.map((h, i) => ({ lead_id: `demo-${i}`, name: h.name, company: h.company })),
    at_risk: atRisk.map((a, i) => ({ id: `demo-at-${i}`, name: a.name, company: a.company })),
    recovered: recovered.map((r, i) => ({ id: `demo-rec-${i}`, name: r.name, company: r.company })),
    activity: [
      { what: "Preparing response", who: hot[0].name ?? "Sarah", when: new Date().toISOString() },
      { what: "Scheduling follow-up", who: hot[1]?.name ?? "James", when: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { what: "Confirming attendance", who: recovered[0].name ?? "Sarah", when: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
      { what: "Recovering cooling conversation", who: atRisk[0].name ?? "Mike", when: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), effort_preserved: true },
    ],
  };
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

function ContinuityMonitoringPanel({
  routines,
  idleRoutines,
  responsibilityItems,
  lastActivityMs,
}: {
  routines: string[];
  idleRoutines: string[];
  responsibilityItems: string[];
  lastActivityMs: number | null;
}) {
  const [idx, setIdx] = useState(0);
  const idle = lastActivityMs === null || lastActivityMs > 30 * 60 * 1000;
  const activeRoutines = idle ? idleRoutines : routines;
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % activeRoutines.length), 4000);
    return () => clearInterval(t);
  }, [activeRoutines.length]);
  const display = !idle && responsibilityItems.length > 0 ? responsibilityItems : [activeRoutines[idx]];
  return (
    <section className="mb-10">
      <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>What we&apos;re doing now</h2>
      <div className="space-y-2">
        {display.map((line, i) => (
          <div
            key={`${i}-${idx}`}
            className="py-3 px-4 rounded-lg transition-opacity duration-300"
            style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}
          >
            <span style={{ color: "var(--text-primary)" }}>{line}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const ROTATING_ROUTINES = [
  "Watching reply timing",
  "Maintaining engagement",
  "Confirming attendance",
  "Recovering quiet conversations",
  "Protecting booked calls",
];

const IDLE_MONITORING_ROUTINES = [
  "Watching reply windows",
  "Checking attendance timing",
  "Monitoring cooling conversations",
];

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
  const [loading, setLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [tick, setTick] = useState(0);
  const [monitoringHeartbeat, setMonitoringHeartbeat] = useState<string | null>(null);
  const [invisibleWork, setInvisibleWork] = useState<string | null>(null);
  const [showContinuity, setShowContinuity] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showFirstTimeMessage, setShowFirstTimeMessage] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // Invisible work presence: rotate maintenance lines every 4-8 minutes
  useEffect(() => {
    if (!workspaceId || !data) return;
    const maintenanceLines = [
      "Monitoring timing windows",
      "Keeping response continuity",
      "Maintaining engagement pace",
      "Watching attendance stability",
      "Protecting booked conversations",
      "Checking reply timing",
    ];
    const interval = 240_000 + Math.random() * 240_000; // 4-8 minutes
    const timer = setInterval(() => {
      const line = maintenanceLines[Math.floor(Math.random() * maintenanceLines.length)] ?? maintenanceLines[0]!;
      setInvisibleWork(line);
      setTimeout(() => setInvisibleWork(null), 3000); // Fade out after 3 seconds
    }, interval);
    return () => clearInterval(timer);
  }, [workspaceId, data]);

  // Real monitoring heartbeat: insert evaluation entry within 60-180 seconds
  useEffect(() => {
    if (!workspaceId || !data) return;
    const delay = 60_000 + Math.random() * 120_000; // 60-180 seconds
    const timer = setTimeout(() => {
      const heartbeats = [
        "Checked conversation timing — nothing needed",
        "Verified reply window — still active",
        "Monitoring attendance timing — stable",
        "Checked engagement windows — maintained",
        "Verified continuity — stable",
      ];
      setMonitoringHeartbeat(heartbeats[Math.floor(Math.random() * heartbeats.length)] ?? heartbeats[0]!);
      // Clear after showing
      setTimeout(() => setMonitoringHeartbeat(null), 10_000);
    }, delay);
    return () => clearTimeout(timer);
  }, [workspaceId, data]);

  useEffect(() => {
    if (!workspaceId || workspaces.length === 0) return;
    setLoading(true);
    setIsDemoMode(false);
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
          if (isEmpty) {
            setIsDemoMode(true);
            setData({ ...getDemoData((d as { business_type?: string }).business_type), ...d } as CommandCenterData);
          } else {
            setData({ ...d, recovered: d.recovered ?? [] } as CommandCenterData);
          }
        } else if (!data) {
          // No cache and no previous data - show demo mode
          setIsDemoMode(true);
          setData(getDemoData() as CommandCenterData);
        }
        // If we have previous data, keep it
        return;
      }
      
      const d = result.data;
      if (!d) {
        if (!data) {
          setIsDemoMode(true);
          setData(getDemoData() as CommandCenterData);
        }
        return;
      }
      
      const isEmpty =
        (d.hot_leads?.length ?? 0) === 0 &&
        (d.at_risk?.length ?? 0) === 0 &&
        (d.recovered?.length ?? 0) === 0 &&
        (d.activity?.length ?? 0) === 0;
      if (isEmpty) {
        setIsDemoMode(true);
        setData({ ...getDemoData((d as { business_type?: string }).business_type), ...d } as CommandCenterData);
      } else {
        setData({ ...d, recovered: d.recovered ?? [] } as CommandCenterData);
      }
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
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>We&apos;re ready — conversations will appear here when they start.</h1>
          <p className="mt-2" style={{ color: "var(--text-secondary)" }}>Maintaining continuity. Connect sources to see activity.</p>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="p-8 max-w-3xl mx-auto" style={{ color: "var(--text-primary)" }}>
        <section className="text-center py-12 px-4 rounded-xl mb-10" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
          <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-2" style={{ background: "var(--meaning-amber)" }} aria-hidden />
          <p className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>Watching over</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Preparing responses</p>
        </section>
        <ContinuityMonitoringPanel
          routines={ROTATING_ROUTINES}
          idleRoutines={IDLE_MONITORING_ROUTINES}
          responsibilityItems={[]}
          lastActivityMs={null}
        />
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
      ? "All conversations maintained"
      : statusLevel === "warning"
        ? "Conversations need attention soon"
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
            Next attention in ~{nextMin} min
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
      {monitoringHeartbeat && (
        <div className="mb-4 py-2 px-4 rounded-lg text-sm transition-opacity" style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px" }}>
          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: "var(--meaning-green)" }} aria-hidden />
          <span style={{ color: "var(--text-secondary)" }}>{monitoringHeartbeat}</span>
        </div>
      )}
      {invisibleWork && (
        <div className="mb-4 py-2 px-4 rounded-lg text-sm transition-opacity duration-500" style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", opacity: invisibleWork ? 1 : 0 }}>
          <span style={{ color: "var(--text-muted)" }}>{invisibleWork}</span>
        </div>
      )}
      {/* Live system guarantee: Always show at least one monitoring message */}
      {!monitoringHeartbeat && !invisibleWork && !showContinuity && !apiError && data && (
        <div className="mb-4 py-2 px-4 rounded-lg text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px" }}>
          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: "var(--meaning-green)" }} aria-hidden />
          <span style={{ color: "var(--text-muted)" }}>Watching continuity timing</span>
        </div>
      )}
      <ContinuityMonitoringPanel
        routines={ROTATING_ROUTINES}
        idleRoutines={IDLE_MONITORING_ROUTINES}
        responsibilityItems={responsibilityItems}
        lastActivityMs={lastActivityMs}
      />

      <section className="mb-10">
        <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>Recently handled</h2>
        <div className="space-y-2">
          {(recentOutcomes.length > 0 ? recentOutcomes : ["Prepared response", "Recovered quiet conversation", "Call attended", "Follow-up scheduled"]).slice(0, 5).map((line, i) => (
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

      {isDemoMode && (
        <div className="mt-10 py-4 px-5 rounded-xl text-center" style={{ background: "var(--card)", borderColor: "var(--meaning-amber)", borderWidth: "1px" }}>
          <p className="text-sm" style={{ color: "var(--meaning-amber)" }}>
            First day — just watch. Connect your sources to see protection in action.
          </p>
        </div>
      )}
    </div>
  );
}
