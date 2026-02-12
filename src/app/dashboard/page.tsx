"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";

interface CommandCenterData {
  operator_status: string;
  last_action: string | null;
  next_action: string | null;
  today_booked: number;
  today_recovered: number;
  hot_leads: Array<{ lead_id: string; name?: string; email?: string; company?: string }>;
  at_risk: Array<{ id: string; name?: string; company?: string }>;
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

function ContinuityMonitoringPanel({ routines, responsibilityItems }: { routines: string[]; responsibilityItems: string[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % routines.length), 5000);
    return () => clearInterval(t);
  }, [routines.length]);
  const display = responsibilityItems.length > 0 ? responsibilityItems : [routines[idx]];
  return (
    <section className="mb-10">
      <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>Continuity monitoring</h2>
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
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>A living process. Not history.</p>
      </div>
    </section>
  );
}

const ROTATING_ROUTINES = [
  "Watching new conversations",
  "Checking reply windows",
  "Maintaining engagement intervals",
  "Confirming upcoming attendance",
  "Scanning cooling conversations",
  "Protecting booked calls",
  "Verifying response timing",
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
  const [pipelineHealth, setPipelineHealth] = useState<{ tomorrow_calls_count?: number; tomorrow_attendance_probability?: number } | null>(null);
  const [riskSurface, setRiskSurface] = useState<RiskSurfaceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!workspaceId || workspaces.length === 0) return;
    setLoading(true);
    setIsDemoMode(false);
    fetch(`/api/command-center?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d: Record<string, unknown> & Partial<CommandCenterData>) => {
        if (d?.error) { setData(null); return; }
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
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [workspaceId, workspaces.length, tick]);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/command-center/pipeline-health?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => setPipelineHealth(d))
      .catch(() => setPipelineHealth(null));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/risk-surface?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => (d?.error ? null : setRiskSurface(d)))
      .catch(() => setRiskSurface(null));
  }, [workspaceId, tick]);

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
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Select an account</h1>
          <p className="mt-2" style={{ color: "var(--text-secondary)" }}>Select an account to view status.</p>
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
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Continuity monitoring in progress</p>
        </section>
        <ContinuityMonitoringPanel routines={ROTATING_ROUTINES} responsibilityItems={[]} />
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
  const pipelineForecast = data.pipeline_forecast ?? data.commitment_ledger;
  const todayCalls = (pipelineForecast && "likely_bookings" in pipelineForecast ? pipelineForecast.likely_bookings : null) ?? pipelineHealth?.tomorrow_calls_count ?? 0;
  const tomorrowConfirmations = pipelineForecast?.attendance_confirmations_pending ?? 0;
  const weekStatus = data.performance_status?.status ?? "on_track";
  const weekStatusLabel = weekStatus === "ahead" ? "Ahead" : weekStatus === "behind" ? "Behind" : "On track";

  const humanStrategy = (() => {
    const adj = data.performance_status?.adjustment ?? data.system_strategy ?? "";
    if (adj.includes("Increasing") || adj.includes("increasing")) return adj;
    if (adj.includes("Reducing") || adj.includes("reducing")) return adj;
    if (data.performance_status?.status === "ahead") return "Reducing outreach — ahead of target";
    if (data.performance_status?.status === "behind") return "Increasing follow-ups to maintain weekly goal";
    if (data.system_strategy) {
      const s = String(data.system_strategy);
      if (s.includes("Balanced") || s.includes("On pace")) return "Maintaining steady pace";
      return s;
    }
    return "Maintaining steady pace";
  })();

  const responsibilityItems = (data.activity ?? []).slice(0, 8).map((a) => {
    const { text, recency } = toResponsibilityItem(a);
    return `${text} — ${recency}`;
  });

  const pulseColor = statusLevel === "healthy" ? "var(--meaning-green)" : statusLevel === "warning" ? "var(--meaning-amber)" : "var(--meaning-red)";

  return (
    <div className="p-8 max-w-3xl mx-auto" style={{ color: "var(--text-primary)" }}>
      <section className="text-center py-12 px-4 rounded-xl mb-10" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
        <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
          Conversations currently maintained: {isPaused ? "0" : displayMaintained}
        </p>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span
            className="inline-block w-3 h-3 rounded-full animate-pulse"
            style={{ background: pulseColor }}
            aria-hidden
          />
          <h1 className="text-2xl font-semibold tracking-tight">{statusMessage}</h1>
        </div>
        {!isPaused && nextMin != null && nextMin > 0 && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Next attention in ~{nextMin} minutes
          </p>
        )}
      </section>

      <ContinuityMonitoringPanel routines={ROTATING_ROUTINES} responsibilityItems={responsibilityItems} />

      {riskSurface && (riskSurface.conversations_at_risk.length > 0 || riskSurface.calendar_at_risk.some((c) => c.rescue_needed || c.missing_confirmation)) && (
        <section className="mb-10">
          <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>Risk surface</h2>
          <div
            className="p-5 rounded-xl space-y-3"
            style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}
          >
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{riskSurface.risk_surface_summary}</p>
            <div className="space-y-2">
              {riskSurface.conversations_at_risk.slice(0, 3).map((r) => (
                <div key={r.lead_id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: "var(--surface)" }}>
                  <span style={{ color: "var(--text-primary)" }}>{r.name}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{r.risk_reason} · {r.recommended_protection}</span>
                </div>
              ))}
              {riskSurface.calendar_at_risk.filter((c) => c.rescue_needed || c.missing_confirmation).slice(0, 2).map((c) => (
                <div key={c.call_id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: "var(--surface)" }}>
                  <span style={{ color: "var(--text-primary)" }}>{c.lead_name}</span>
                  <span className="text-xs" style={{ color: "var(--meaning-amber)" }}>{c.rescue_needed ? "Rescue in progress" : "Confirmation needed"}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>Calendar impact</h2>
        <div
          className="p-5 rounded-xl"
          style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}
        >
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{todayCalls}</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Today — calls likely to attend</p>
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{tomorrowConfirmations}</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Tomorrow — confirmations pending</p>
            </div>
            <div>
              <p
                className="text-lg font-semibold"
                style={{
                  color: weekStatus === "ahead" ? "var(--meaning-green)" : weekStatus === "behind" ? "var(--meaning-amber)" : "var(--meaning-blue)",
                }}
              >
                {weekStatusLabel}
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>This week</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>Strategy today</h2>
        <p
          className="py-3 px-4 rounded-lg"
          style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
        >
          {humanStrategy.startsWith("Maintaining") ? "Balanced" : humanStrategy.startsWith("Increasing") ? "Increasing recovery" : humanStrategy.startsWith("Reducing") ? "Reducing pressure" : humanStrategy}
        </p>
      </section>

      {data.removal_simulator && !isPaused && (
        <section className="mt-10">
          <div
            className="py-4 px-5 rounded-xl"
            style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-secondary)" }}
          >
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>If protection stopped today</p>
            <p className="text-sm">
              {(data.removal_simulator.if_paused_today.conversations_going_cold ?? 0)} conversations likely go cold · {(data.removal_simulator.if_paused_today.attendance_at_risk ?? 0)} attendance at risk
            </p>
          </div>
        </section>
      )}

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
