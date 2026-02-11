"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { ConversationProgressIndicator } from "@/components/ConversationProgressIndicator";
import { leadStateToProgress } from "@/lib/progress/conversation-progress";

interface CommandCenterData {
  operator_status: string;
  last_action: string | null;
  next_action: string | null;
  today_booked: number;
  today_recovered: number;
  hot_leads: Array<{ lead_id: string; name?: string; email?: string; company?: string; state?: string; probability: number; value_cents: number; contribution?: string; next_action_in_min?: number; warmth_score?: number; scheduled_intent?: string; handling_status?: string; responsibility_phase?: string }>;
  at_risk: Array<{ id: string; name?: string; company?: string; state?: string; contribution?: string; next_action_in_min?: number; warmth_score?: number; scheduled_intent?: string; handling_status?: string; responsibility_phase?: string }>;
  pipeline_forecast?: { likely_bookings: number; revivals_in_progress: number; attendance_confirmations_pending: number };
  commitment_ledger?: { active_follow_ups_scheduled: number; recovery_paths_running: number; attendance_confirmations_pending: number };
  performance_boost?: { warmer_conversations: number; reduced_ghosting: number; higher_preparedness: number; summary: string[] };
  removal_impact?: { lost_conversations_estimate: number; lost_attendance_estimate: number; lost_opportunities_estimate: number; message: string };
  daily_operational_cycles?: Array<{ cycle: string; label: string; completed: boolean; completed_at?: string; summary: string }>;
  silence_protection?: { protected: boolean; unattended_count: number; status: "green" | "warning"; label: string };
  calendar_confidence?: number;
  recovered: Array<{ id: string; name?: string; company?: string }>;
  activity: Array<{
    what: string;
    who: string;
    when: string;
    why?: string;
    expected?: string;
    role?: string;
    effort_preserved?: boolean;
    noticed?: string;
    decision?: string;
    confidence_label?: string;
    attributed_to?: string;
    is_monitoring?: boolean;
    counterfactual?: { probability_without_intervention: number; stall_reason: string; outcome_type: string };
    progress_stage?: string;
    progress_advances_toward?: string;
  }>;
  heartbeat_visible?: boolean;
  shift_summary?: { replies_sent: number; follow_ups_scheduled: number; calls_booked: number; calls_completed: number; recovered: number };
  target_tracking?: { target: number; secured: number; gap: number } | null;
  daily_plan?: Array<{ action: string; count: number; intent: string }>;
  coverage?: { active_conversations: number; level: "high" | "medium" | "low"; capacity_pct?: number };
  pipeline_stability?: "stable" | "rising" | "declining";
  intervention_summaries?: Array<{ adjustment: string; when: string }>;
  loss_clock?: { missed_this_week: number; stability_degradation?: string } | null;
  continuity_gap?: { time_since_last_outreach_min: number | null; next_outreach_missed_in_min: number | null };
  recovery_decay?: string | null;
  live_risk_feed?: Array<{ lead_id: string; name?: string; company?: string; risk: string; at_risk_since?: string | null }>;
  reply_windows?: Array<{ lead_id: string; reply_window_remaining_min: number }>;
  intervention_highlights?: Array<{ what: string; who: string; when: string; expected?: string; attributed_to?: string; effort_preserved?: boolean }>;
  daily_readiness?: { is_morning: boolean; overnight_protections: number; readiness_summary: string; pending_today: number; at_risk_count: number };
  removal_simulator?: { if_paused_today: { touches_lost: number; conversations_going_cold: number; attendance_at_risk: number }; message: string };
  business_type?: string | null;
  commitments?: Array<{ risk: string; handling: string }>;
  performance_status?: { status: "ahead" | "on_track" | "behind"; adjustment?: string } | null;
  role_ownership?: Array<{ lead_id: string; role: string; responsibility: string }>;
  weekly_recap?: { secured: number; expected_without_intervention: number; delta: number };
  active_protections?: {
    conversations_being_warmed: number;
    followups_scheduled_24h: number;
    attendance_protections: number;
    recoveries_running: number;
  };
  expected_weekly?: { low: number; high: number; confidence: number } | null;
  projection_impact?: {
    expected_with_protection: { low: number; high: number };
    expected_without_protection: { low: number; high: number };
    continuity_factor: number;
  } | null;
}

const DEMO_BY_INDUSTRY: Record<string, { hot: Array<{ name: string; company: string }>; atRisk: Array<{ name: string; company: string }>; recovered: Array<{ name: string; company: string }> }> = {
  saas: { hot: [{ name: "Sarah", company: "CloudStack Inc" }, { name: "James", company: "DevTools Ltd" }], atRisk: [{ name: "Mike", company: "SaaS Metrics" }], recovered: [{ name: "Sarah", company: "CloudStack Inc" }] },
  agency: { hot: [{ name: "Emma", company: "Brand Partners" }, { name: "David", company: "Creative Studio" }], atRisk: [{ name: "Lisa", company: "Media Agency" }], recovered: [{ name: "Emma", company: "Brand Partners" }] },
  ecommerce: { hot: [{ name: "Alex", company: "Retail Direct" }, { name: "Jordan", company: "Shopify Plus" }], atRisk: [{ name: "Taylor", company: "D2C Brand" }], recovered: [{ name: "Alex", company: "Retail Direct" }] },
  consulting: { hot: [{ name: "Morgan", company: "Strategy Partners" }, { name: "Casey", company: "Advisory Group" }], atRisk: [{ name: "Riley", company: "Consulting Co" }], recovered: [{ name: "Morgan", company: "Strategy Partners" }] },
  other: { hot: [{ name: "Sarah", company: "Acme Ltd" }, { name: "James", company: "UK Corp" }], atRisk: [{ name: "Mike", company: "TechCorp" }], recovered: [{ name: "Sarah", company: "Acme Ltd" }] },
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
  continuity_gap: { time_since_last_outreach_min: 45, next_outreach_missed_in_min: null },
  today_booked: 2,
  today_recovered: 1,
  target_tracking: { target: 12, secured: 5, gap: 7 },
  daily_plan: [
    { action: "Booking outreach", count: 3, intent: "Close gap of 7" },
    { action: "Follow-ups", count: 4, intent: "Secure existing pipeline" },
    { action: "Recovery outreach", count: 1, intent: "Prevent loss" },
  ],
  commitments: [
    { risk: "1 lead without contact 3+ days", handling: "Scheduling follow-ups to re-engage. Next outreach queued." },
    { risk: `${hot[0].name} (72% to book)`, handling: "Prioritising outreach. Booking link ready." },
  ],
  performance_status: { status: "behind", adjustment: "Increasing focus: 3 more bookings needed this week." },
  coverage: { active_conversations: 12, level: "medium", capacity_pct: 50 },
  pipeline_stability: "stable",
  intervention_summaries: [{ adjustment: "On pace. Executing daily plan.", when: "This shift" }],
  weekly_recap: { secured: 5, expected_without_intervention: 0, delta: 5 },
  active_protections: { conversations_being_warmed: 3, followups_scheduled_24h: 5, attendance_protections: 3, recoveries_running: 1 },
  expected_weekly: { low: 8, high: 14, confidence: 0.72 },
  projection_impact: { expected_with_protection: { low: 8, high: 14 }, expected_without_protection: { low: 3, high: 6 }, continuity_factor: 0.45 },
  pipeline_forecast: { likely_bookings: 2, revivals_in_progress: 1, attendance_confirmations_pending: 3 },
  commitment_ledger: { active_follow_ups_scheduled: 5, recovery_paths_running: 1, attendance_confirmations_pending: 3 },
  performance_boost: { warmer_conversations: 2, reduced_ghosting: 1, higher_preparedness: 2, summary: ["2 warmer conversations prepared", "Reduced ghosting: 1 recovered this week", "Higher preparedness: reminders and prep sent"] },
  removal_impact: { lost_conversations_estimate: 8, lost_attendance_estimate: 3, lost_opportunities_estimate: 6, message: "Reducing coverage reduces your ability to secure these outcomes." },
  live_risk_feed: [{ lead_id: "demo-1", name: atRisk[0].name, company: atRisk[0].company, risk: "Stale — no contact 3+ days", at_risk_since: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() }],
  reply_windows: [{ lead_id: "demo-2", reply_window_remaining_min: 540 }],
  intervention_highlights: [{ what: "Secured booking", who: atRisk[0].name, when: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), expected: "Effort preserved. Would have been lost without outreach.", attributed_to: "Recovery message", effort_preserved: true }],
  daily_readiness: { is_morning: true, overnight_protections: 1, readiness_summary: "1 touch sent overnight — conversations protected", pending_today: 5, at_risk_count: 1 },
  removal_simulator: { if_paused_today: { touches_lost: 5, conversations_going_cold: 4, attendance_at_risk: 3 }, message: "Pausing today removes protection immediately. These outcomes would not occur." },
  daily_operational_cycles: [
    { cycle: "morning_reengagement", label: "Morning re-engagement", completed: true, completed_at: new Date().toISOString(), summary: "Re-engagement routine completed" },
    { cycle: "midday_attendance", label: "Midday attendance protection", completed: true, summary: "Attendance protection routine completed" },
    { cycle: "evening_recovery", label: "Evening recovery", completed: false, summary: "Scheduled for evening window" },
  ],
  silence_protection: { protected: true, unattended_count: 0, status: "green", label: "All conversations protected" },
  calendar_confidence: 72,
  hot_leads: [
    { lead_id: "demo-1", name: hot[0].name, company: hot[0].company, state: "QUALIFIED", probability: 0.72, value_cents: 50000, contribution: "~72% toward weekly target (12)", warmth_score: 68, scheduled_intent: "Already preparing next outreach", handling_status: "preparing", responsibility_phase: "preparing for call" },
    { lead_id: "demo-2", name: hot[1].name, company: hot[1].company, state: "ENGAGED", probability: 0.61, value_cents: 25000, contribution: "~61% toward weekly target (12)", warmth_score: 45, scheduled_intent: "Sequence running", handling_status: "pacing", responsibility_phase: "keeping engaged" },
  ],
  at_risk: [
    { id: "demo-1", name: atRisk[0].name, company: atRisk[0].company, state: "CONTACTED", contribution: "Recovering to protect contribution toward target", warmth_score: 52, scheduled_intent: "Recovery scheduled if no reply", handling_status: "re-engaging", responsibility_phase: "recovering opportunity" },
  ],
  recovered: [
    { id: "demo-1", name: recovered[0].name, company: recovered[0].company },
  ],
  activity: [
    { what: "Watching over 3 active leads", who: "System", when: new Date().toISOString(), is_monitoring: true },
    { what: "Followed up", who: hot[0].name, when: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), why: "Prospect stopped replying after pricing question.", expected: "Regain engagement.", role: "Follow-up Manager" },
    { what: "Secured booking", who: atRisk[0].name, when: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), expected: "Effort preserved. Would have been lost without outreach.", role: "Revival Manager", attributed_to: "Recovery message", effort_preserved: true },
    { what: "Booked call", who: hot[1].name, when: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), why: "Responded to availability options.", expected: "Call scheduled.", role: "Setter" },
  ],
  };
}

const CONFIDENCE_LABELS: Record<string, string> = {
  confident: "Confident",
  monitoring: "Watching over",
  low_probability: "Low probability",
};

function ActivityEntry({ a, isDemo }: { a: CommandCenterData["activity"][0]; isDemo: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isMonitoring = a.is_monitoring;
  const hasNarrative = !isMonitoring && (a.noticed || a.decision || a.expected || a.why || a.role || a.attributed_to || a.effort_preserved || a.counterfactual);
  const confidenceLabel = a.confidence_label ? CONFIDENCE_LABELS[a.confidence_label] ?? a.confidence_label : null;
  const showEffortPreserved = a.effort_preserved;
  const progressStage = a.progress_stage as "cold" | "interested" | "scheduled" | "attended" | undefined;
  const progressAdvances = a.progress_advances_toward as "cold" | "interested" | "scheduled" | "attended" | undefined;
  return (
    <div className={`rounded-xl border overflow-hidden ${isMonitoring ? "border-sky-800/40 bg-sky-950/20" : showEffortPreserved ? "border-emerald-800/50 bg-emerald-950/20" : isDemo ? "border-amber-800/50 bg-amber-950/20" : "border-stone-800 bg-stone-900/80"}`}>
      <button
        onClick={() => hasNarrative && setExpanded(!expanded)}
        className="w-full p-3 text-left text-sm flex items-start justify-between gap-2"
      >
        <div className="flex-1 min-w-0">
          <span className={`font-medium ${isMonitoring ? "text-sky-400" : showEffortPreserved ? "text-emerald-400" : "text-amber-400"}`}>{a.what}</span>
          {isMonitoring && <span className="text-sky-500/80 text-xs ml-2">Watching over</span>}
          {showEffortPreserved && !isMonitoring && <span className="text-emerald-500/80 text-xs ml-2">Effort preserved</span>}
          {a.role && !isMonitoring && <span className="text-stone-400"> · {a.role}</span>}
          {confidenceLabel && !isMonitoring && <span className="text-stone-500"> · {confidenceLabel}</span>}
          <span className="text-stone-500"> · {a.who}</span>
          <span className="text-stone-500"> · {new Date(a.when).toLocaleString()}</span>
          {(progressStage || progressAdvances) && (
            <span className="ml-2 shrink-0">
              <ConversationProgressIndicator
                stage={progressStage ?? progressAdvances ?? "interested"}
                advancesToward={progressAdvances}
                compact
              />
            </span>
          )}
        </div>
        {hasNarrative && (
          <span className="text-stone-500 shrink-0">{expanded ? "▼" : "▶"}</span>
        )}
      </button>
      {expanded && hasNarrative && (
        <div className="px-3 pb-3 pt-0 border-t border-stone-800/80 text-sm text-stone-400 space-y-1.5">
          {a.attributed_to && <p><span className="text-stone-500">Outreach that prepared:</span> <span className="text-emerald-400">{a.attributed_to}</span></p>}
          {a.role && <p><span className="text-stone-500">Prepared by:</span> {a.role}</p>}
          {a.noticed && <p><span className="text-stone-500">Noticed:</span> {a.noticed}</p>}
          {a.decision && <p><span className="text-stone-500">Decision:</span> {a.decision}</p>}
          {a.expected && <p><span className="text-stone-500">Expected:</span> {a.expected}</p>}
          {!a.noticed && a.why && <p><span className="text-stone-500">Reason:</span> {a.why}</p>}
          {a.counterfactual && (
            <p className="mt-2 pt-2 border-t border-stone-800">
              <span className="text-amber-400/90 text-xs font-medium">Without preparation:</span>{' '}
              <span className="text-stone-500">{Math.round((1 - a.counterfactual.probability_without_intervention) * 100)}% would not have happened.</span>{' '}
              {a.counterfactual.stall_reason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface PipelineHealth {
  tomorrow_attendance_probability?: number;
  tomorrow_calls_count?: number;
  empty_slot_risk?: number;
  late_cancellation_risk?: number;
}

export default function HomePage() {
  const { workspaceId, workspaces, loadWorkspaces } = useWorkspace();
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [pipelineHealth, setPipelineHealth] = useState<PipelineHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [protectionSummary, setProtectionSummary] = useState<{ standards_met: number; standards_violated: number } | null>(null);
  const [attentionList, setAttentionList] = useState<Array<{ lead_id: string; rank: number; readiness_score: number; consequence_if_ignored?: string; best_action_timing?: string; confidence_level?: string; lead?: { name?: string; email?: string; company?: string } }> | null>(null);
  const [calendarRisk, setCalendarRisk] = useState<{
    likely_no_shows?: Array<{ lead_id: string; probability: number; lead?: { name?: string; company?: string } }>;
    confirmation_needed?: Array<{ lead_id: string; probability: number; lead?: { name?: string; company?: string } }>;
    high_confidence?: Array<{ lead_id: string; probability: number; lead?: { name?: string; company?: string } }>;
  } | null>(null);
  const [dealDeathSignals, setDealDeathSignals] = useState<Array<{ deal_id: string; lead_id: string; severity: string; message: string; lead?: { name?: string; company?: string } }> | null>(null);
  const [continuityRisk, setContinuityRisk] = useState<{
    show: boolean;
    missed_followups_next_24h: number;
    conversations_cooling: number;
    bookings_at_risk: number;
    recoveries_interrupted: number;
  } | null>(null);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/command-center/pipeline-health?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => setPipelineHealth(d))
      .catch(() => setPipelineHealth(null));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/assurance/protection-standards?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.summary) setProtectionSummary({ standards_met: d.summary.standards_met, standards_violated: d.summary.standards_violated });
        else setProtectionSummary(null);
      })
      .catch(() => setProtectionSummary(null));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/attention?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => setAttentionList(d?.attention ?? null))
      .catch(() => setAttentionList(null));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/calendar-risk?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => setCalendarRisk(d?.next_48h ?? null))
      .catch(() => setCalendarRisk(null));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/deal-death?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => setDealDeathSignals(d?.signals ?? null))
      .catch(() => setDealDeathSignals(null));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/continuity/risk?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => setContinuityRisk(d?.show ? d : null))
      .catch(() => setContinuityRisk(null));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || workspaces.length === 0) return;
    setLoading(true);
    setIsDemoMode(false);
    fetch(`/api/command-center?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d: Record<string, unknown> & Partial<CommandCenterData>) => {
        if (d?.error) {
          setData(null);
          return;
        }
        const isEmpty =
          (d.hot_leads?.length ?? 0) === 0 &&
          (d.at_risk?.length ?? 0) === 0 &&
          (d.recovered?.length ?? 0) === 0 &&
          (d.activity?.length ?? 0) === 0;
        if (isEmpty) {
          setIsDemoMode(true);
          const demoData = getDemoData((d as { business_type?: string }).business_type);
          setData({ ...demoData, ...d } as CommandCenterData);
        } else {
          setData({
            ...d,
            recovered: d.recovered ?? [],
          } as CommandCenterData);
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [workspaceId, workspaces.length]);

  if (workspaces.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-semibold text-stone-50">More real conversations on your calendar</h1>
          <p className="text-stone-400 mt-2">
            Connect your pipeline. Watch your calendar fill with calls that show up.
          </p>
          <Link
            href="/activate"
            className="mt-8 inline-block px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium text-stone-950"
          >
            Begin coverage
          </Link>
        </div>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-semibold text-stone-50">Select an account</h1>
          <p className="text-stone-400 mt-2">
            See your calendar fill with real conversations.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Loading…</p>
      </div>
    );
  }

  const hotLeads = data.hot_leads ?? [];
  const atRisk = data.at_risk ?? [];
  const recovered = data.recovered ?? [];
  const activity = data.activity ?? [];
  const shiftSummary = data.shift_summary;
  const targetTracking = data.target_tracking;
  const dailyPlan = data.daily_plan ?? [];
  const coverage = data.coverage;
  const pipelineStability = data.pipeline_stability;
  const interventionSummaries = data.intervention_summaries ?? [];
  const lossClock = data.loss_clock;
  const continuityGap = data.continuity_gap;
  const recoveryDecay = data.recovery_decay;
  const commitments = data.commitments ?? [];
  const performanceStatus = data.performance_status;
  const weeklyRecap = data.weekly_recap;
  const pipelineForecast = data.pipeline_forecast;
  const commitmentLedger = data.commitment_ledger;
  const performanceBoost = data.performance_boost;
  const removalImpact = data.removal_impact;
  const dailyCycles = data.daily_operational_cycles;
  const silenceProtection = data.silence_protection;
  const calendarConfidence = data.calendar_confidence;
  const liveRiskFeed = data.live_risk_feed ?? [];
  const replyWindows = data.reply_windows ?? [];
  const replyWindowByLead = replyWindows.reduce((acc: Record<string, number>, w) => { acc[w.lead_id] = w.reply_window_remaining_min; return acc; }, {});
  const interventionHighlights = data.intervention_highlights ?? [];
  const dailyReadiness = data.daily_readiness;
  const removalSimulator = data.removal_simulator;
  const roleOwnership = (data.role_ownership ?? []).reduce(
    (acc: Record<string, { role: string; responsibility: string }>, r) => {
      acc[r.lead_id] = { role: r.role, responsibility: r.responsibility };
      return acc;
    },
    {}
  );

  const custodyCount = coverage?.active_conversations ?? 0;
  const activeProtections = data.active_protections;
  const isPaused = data.operator_status === "Paused";

  return (
    <div className="p-8 max-w-5xl">
      {activeProtections && (activeProtections.conversations_being_warmed > 0 || activeProtections.followups_scheduled_24h > 0 || activeProtections.attendance_protections > 0 || activeProtections.recoveries_running > 0 || isPaused) && (
        <div className={`mb-6 px-4 py-3 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${isPaused ? "bg-amber-950/40 border-amber-700" : "bg-stone-900/80 border-stone-700"}`}>
          <h2 className="text-sm font-medium text-stone-300">Active protections right now</h2>
          {isPaused ? (
            <p className="text-amber-200 text-sm w-full">These protections stop immediately when paused.</p>
          ) : (
            <div className="flex flex-wrap gap-6 text-sm text-stone-400">
              {activeProtections.conversations_being_warmed > 0 && (
                <span>{activeProtections.conversations_being_warmed} conversation{activeProtections.conversations_being_warmed !== 1 ? "s" : ""} being warmed</span>
              )}
              {activeProtections.followups_scheduled_24h > 0 && (
                <span>{activeProtections.followups_scheduled_24h} follow-up{activeProtections.followups_scheduled_24h !== 1 ? "s" : ""} scheduled (24h)</span>
              )}
              {activeProtections.attendance_protections > 0 && (
                <span>{activeProtections.attendance_protections} attendance protection{activeProtections.attendance_protections !== 1 ? "s" : ""}</span>
              )}
              {activeProtections.recoveries_running > 0 && (
                <span>{activeProtections.recoveries_running} recover{activeProtections.recoveries_running !== 1 ? "ies" : "y"} running</span>
              )}
            </div>
          )}
        </div>
      )}

      {data.expected_weekly && (
        <div className={`mb-6 px-4 py-3 rounded-xl border ${isPaused ? "bg-amber-950/30 border-amber-700" : "bg-stone-900/60 border-stone-700"}`}>
          <h2 className="text-sm font-medium text-stone-300">Expected weekly conversations</h2>
          {isPaused ? (
            <p className="text-amber-200 text-sm mt-1">Continuity interruption changes this projection.</p>
          ) : (
            <p className="text-stone-400 text-sm mt-1">
              Based on current pipeline behaviour you should expect {data.expected_weekly.low}–{data.expected_weekly.high} conversations per week.
            </p>
          )}
        </div>
      )}

      {continuityRisk && continuityRisk.show && (
        <div className="mb-6 px-4 py-3 rounded-xl border bg-stone-900/80 border-stone-700">
          <h2 className="text-sm font-medium text-stone-300">Work that will stop</h2>
          <div className="mt-2 flex flex-wrap gap-6 text-sm text-stone-400">
            {continuityRisk.missed_followups_next_24h > 0 && (
              <span>{continuityRisk.missed_followups_next_24h} follow-up{continuityRisk.missed_followups_next_24h !== 1 ? "s" : ""} in next 24h</span>
            )}
            {continuityRisk.conversations_cooling > 0 && (
              <span>{continuityRisk.conversations_cooling} conversation{continuityRisk.conversations_cooling !== 1 ? "s" : ""} cooling</span>
            )}
            {continuityRisk.bookings_at_risk > 0 && (
              <span>{continuityRisk.bookings_at_risk} booking{continuityRisk.bookings_at_risk !== 1 ? "s" : ""} at risk</span>
            )}
            {continuityRisk.recoveries_interrupted > 0 && (
              <span>{continuityRisk.recoveries_interrupted} recover{continuityRisk.recoveries_interrupted !== 1 ? "ies" : "y"} interrupted</span>
            )}
          </div>
        </div>
      )}

      {data.projection_impact && (
        <div className="mb-6 px-4 py-3 rounded-xl border bg-amber-950/30 border-amber-700">
          <h2 className="text-sm font-medium text-stone-300">Projection impact</h2>
          <div className="mt-2 flex flex-wrap gap-6 text-sm">
            <span>
              <span className="text-amber-200 font-medium">With protection:</span>{" "}
              {data.projection_impact.expected_with_protection.low}–{data.projection_impact.expected_with_protection.high}
            </span>
            <span>
              <span className="text-amber-400/90 font-medium">Without protection:</span>{" "}
              {data.projection_impact.expected_without_protection.low}–{data.projection_impact.expected_without_protection.high}
            </span>
          </div>
        </div>
      )}

      {!isDemoMode && attentionList && attentionList.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-sky-950/40 border border-sky-800/60">
          <h2 className="text-sm font-medium text-sky-300 mb-2">Who requires attention today</h2>
          <p className="text-xs text-sky-400/90 mb-3">System prioritizes by readiness and revenue impact</p>
          <div className="space-y-2">
            {attentionList.slice(0, 5).map((a) => (
              <div key={a.lead_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-sky-950/50 border border-sky-800/40">
                <div className="flex items-center gap-3">
                  <span className="text-sky-400 font-medium w-6">#{a.rank}</span>
                  <span className="text-stone-200 font-medium">{a.lead?.name || a.lead?.email || a.lead?.company || "Unknown"}</span>
                  <span className="px-2 py-0.5 rounded text-xs bg-sky-900/60 text-sky-300">{a.readiness_score}% ready</span>
                  <span className="text-xs text-stone-500">{a.consequence_if_ignored}</span>
                </div>
                <Link href={`/dashboard/leads/${a.lead_id}`} className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium">
                  Act
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isDemoMode && dealDeathSignals && dealDeathSignals.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/60">
          <h2 className="text-sm font-medium text-rose-300 mb-2">Opportunity slipping — intervention required</h2>
          <div className="space-y-2">
            {dealDeathSignals.slice(0, 3).map((s) => (
              <div key={s.deal_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-rose-950/50 text-sm">
                <span className="text-rose-200 font-medium">{s.lead?.name || s.lead?.company || "Unknown"}</span>
                <span className="text-rose-400/90">{s.message}</span>
                <Link href={`/dashboard/leads/${s.lead_id}`} className="text-rose-300 hover:text-rose-200 text-xs font-medium">Intervene</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isDemoMode && calendarRisk && (calendarRisk.likely_no_shows?.length ?? 0) + (calendarRisk.confirmation_needed?.length ?? 0) > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-950/30 border border-amber-800/50">
          <h2 className="text-sm font-medium text-amber-300 mb-2">Next 48h calendar risk</h2>
          {(calendarRisk.likely_no_shows?.length ?? 0) > 0 && (
            <p className="text-xs text-amber-400/90 mb-2">Likely no-shows: {(calendarRisk.likely_no_shows ?? []).map((c) => c.lead?.name || "Unknown").join(", ")}</p>
          )}
          {(calendarRisk.confirmation_needed?.length ?? 0) > 0 && (
            <p className="text-xs text-amber-400/90">Confirmation needed: {(calendarRisk.confirmation_needed ?? []).map((c) => c.lead?.name || "Unknown").join(", ")}</p>
          )}
        </div>
      )}

      {dailyReadiness?.is_morning && (
        <div className="mb-6 p-4 rounded-xl bg-sky-950/30 border border-sky-800/50">
          <h2 className="text-sm font-medium text-sky-300 mb-2">Daily readiness</h2>
          <p className="text-sky-200 font-medium">{dailyReadiness.readiness_summary}</p>
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-sky-400/90">
            <span>{dailyReadiness.overnight_protections} overnight protection{dailyReadiness.overnight_protections !== 1 ? "s" : ""}</span>
            <span>{dailyReadiness.pending_today} follow-ups today</span>
            <span>{dailyReadiness.at_risk_count} at risk</span>
          </div>
        </div>
      )}

      {!isDemoMode && protectionSummary && (
        <div className={`mb-6 px-4 py-3 rounded-xl border flex items-center justify-between ${
          protectionSummary.standards_violated > 0 ? "bg-amber-950/30 border-amber-800/50" : "bg-stone-900/60 border-stone-800"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-3 h-3 rounded-full ${protectionSummary.standards_violated > 0 ? "bg-amber-400" : "bg-emerald-400"}`} />
            <p className={`font-medium ${protectionSummary.standards_violated > 0 ? "text-amber-200" : "text-stone-200"}`}>
              Protection standards: {protectionSummary.standards_violated > 0
                ? `${protectionSummary.standards_violated} violated`
                : "all met"}
            </p>
          </div>
          <Link href="/dashboard/reports" className="text-amber-400 hover:text-amber-300 text-sm font-medium">
            View report →
          </Link>
        </div>
      )}

      {liveRiskFeed.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-950/30 border border-amber-800/50">
          <h2 className="text-sm font-medium text-amber-300 mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Live risk feed — right now
          </h2>
          <p className="text-xs text-amber-400/80 mb-3">Conversations currently at risk</p>
          <div className="space-y-2">
            {liveRiskFeed.map((r) => (
              <div key={r.lead_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-950/50 text-sm">
                <span className="text-amber-200 font-medium">{r.name ?? "Unknown"}</span>
                <span className="text-amber-500/90">{r.risk}</span>
                <span className="text-amber-600/80 text-xs">
                  {r.at_risk_since ? `since ${new Date(r.at_risk_since).toLocaleDateString()}` : "—"}
                </span>
                <Link href={r.lead_id.startsWith("demo-") || r.lead_id.startsWith("preview-") ? "/dashboard/leads" : `/dashboard/leads/${r.lead_id}`} className="text-amber-400 hover:text-amber-300 text-xs font-medium">Recover</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {silenceProtection && (
        <div className={`mb-6 px-4 py-3 rounded-xl border ${
          silenceProtection.status === "green" ? "bg-emerald-950/30 border-emerald-800/50" : "bg-amber-950/30 border-amber-800/50"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-3 h-3 rounded-full ${silenceProtection.status === "green" ? "bg-emerald-400" : "bg-amber-400"}`} />
            <p className={`font-medium ${silenceProtection.status === "green" ? "text-emerald-200" : "text-amber-200"}`}>
              {silenceProtection.label}
            </p>
          </div>
        </div>
      )}

      {!isDemoMode && custodyCount > 0 && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-stone-900/80 border border-stone-800">
          <p className="text-stone-300 font-medium">
            Preparing {custodyCount} active conversation{custodyCount !== 1 ? "s" : ""} for you
          </p>
        </div>
      )}
      {isDemoMode && (
        <div className="mb-6 px-4 py-2 rounded-lg bg-amber-950/50 border border-amber-800/50 text-amber-200 text-sm">
          <p className="font-medium">First day: Just watch your calendar</p>
          <p className="text-amber-300/80 text-xs mt-1">Connect your pipeline to see more calls booked and attended</p>
        </div>
      )}

      {!targetTracking && !isDemoMode && (
        <div className="mb-6 p-4 rounded-xl bg-stone-900/60 border border-stone-700 border-dashed">
          <p className="text-sm text-stone-400 mb-2">Define how many calls we&apos;re responsible for each week.</p>
          <Link href="/dashboard/activation" className="text-amber-400 hover:text-amber-300 text-sm font-medium">
            Set weekly target →
          </Link>
        </div>
      )}
      {targetTracking && (
        <div className="mb-6 p-4 rounded-xl bg-stone-900/60 border border-stone-800">
          <h2 className="text-sm font-medium text-stone-400 mb-2">Weekly target</h2>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-2xl font-semibold text-stone-200">{targetTracking.secured}</p>
              <p className="text-xs text-stone-500">secured of {targetTracking.target}</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-amber-400">{targetTracking.gap}</p>
              <p className="text-xs text-stone-500">gap to close</p>
            </div>
            {pipelineStability && (
              <div>
                <p className={`text-sm font-medium ${
                  pipelineStability === "rising" ? "text-emerald-400" :
                  pipelineStability === "declining" ? "text-amber-400" : "text-stone-400"
                }`}>
                  Pipeline {pipelineStability === "rising" ? "Rising" : pipelineStability === "declining" ? "Declining" : "Stable"}
                </p>
                <p className="text-xs text-stone-500">
                  {pipelineStability === "rising" ? "Pace ahead of history" : pipelineStability === "declining" ? "Pace below history" : "Pace on par with history"}
                </p>
              </div>
            )}
            {performanceStatus && (
              <div>
                <p className={`text-sm font-medium ${
                  performanceStatus.status === "ahead" ? "text-emerald-400" :
                  performanceStatus.status === "behind" ? "text-amber-400" : "text-stone-400"
                }`}>
                  {performanceStatus.status === "ahead" ? "Ahead" : performanceStatus.status === "behind" ? "Behind" : "On track"}
                </p>
                {performanceStatus.adjustment && (
                  <p className="text-xs text-stone-500">{performanceStatus.adjustment}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {continuityGap && (continuityGap.time_since_last_outreach_min != null || (data.operator_status === "Paused" && (continuityGap.next_outreach_missed_in_min != null || recoveryDecay))) && (
        <div className="mb-6 p-4 rounded-xl bg-stone-900/60 border border-stone-800">
          <h2 className="text-sm font-medium text-stone-400 mb-2">Continuity</h2>
          <div className="flex flex-wrap items-baseline gap-4">
            {continuityGap.time_since_last_outreach_min != null && (
              <p className="text-stone-300">
                Time since last protected outreach:{" "}
                <span className="font-medium text-stone-200">
                  {continuityGap.time_since_last_outreach_min < 60
                    ? `${continuityGap.time_since_last_outreach_min} min`
                    : `${Math.floor(continuityGap.time_since_last_outreach_min / 60)}h ${continuityGap.time_since_last_outreach_min % 60} min`}
                </span>
              </p>
            )}
            {data.operator_status === "Paused" && continuityGap.next_outreach_missed_in_min != null && (
              <p className="text-amber-300 font-medium">
                If paused: next outreach missed in {continuityGap.next_outreach_missed_in_min} min
              </p>
            )}
          </div>
          {data.operator_status === "Paused" && recoveryDecay && (
            <p className="text-amber-400/90 text-sm mt-2">{recoveryDecay}</p>
          )}
        </div>
      )}

      {data.operator_status === "Paused" && lossClock && (
        <div className="mb-6 p-4 rounded-xl bg-amber-950/30 border border-amber-800/50">
          <h2 className="text-sm font-medium text-amber-300 mb-2">Paused: stability impact</h2>
          {lossClock.missed_this_week > 0 && (
            <p className="text-amber-200 font-semibold">
              ~{lossClock.missed_this_week} missed opportunity{lossClock.missed_this_week !== 1 ? "s" : ""} this week
            </p>
          )}
          {lossClock.stability_degradation && (
            <p className="text-stone-400 text-sm mt-2">{lossClock.stability_degradation}</p>
          )}
          {!lossClock.stability_degradation && lossClock.missed_this_week === 0 && (
            <p className="text-stone-400 text-sm">Pipeline momentum stalls when paused. Leads go cold. Recovery becomes harder.</p>
          )}
          <p className="text-amber-400/90 text-sm mt-2">
            These conversations took time to warm. Momentum resets if follow-ups stop.
          </p>
        </div>
      )}

      {coverage && (
        <div className="mb-6 p-4 rounded-xl bg-stone-900/60 border border-stone-800">
          <h2 className="text-sm font-medium text-stone-400 mb-2">Pipeline capacity</h2>
          <p className="text-2xl font-semibold text-stone-200">
            Operating at {coverage.capacity_pct ?? Math.min(100, Math.round((coverage.active_conversations / 24) * 100))}% capacity
          </p>
          <p className="text-xs text-stone-500 mt-1">
            {coverage.active_conversations} active conversations · {coverage.level === "high" ? "Pipeline well utilised" : coverage.level === "medium" ? "Room to increase throughput" : "Increase outreach to fill capacity"}
          </p>
        </div>
      )}

      {interventionSummaries.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-stone-900/60 border border-stone-800">
          <h2 className="text-sm font-medium text-stone-400 mb-2">Intervention summaries</h2>
          <p className="text-xs text-stone-500 mb-3">System-level adjustments to maintain targets</p>
          <div className="space-y-2">
            {interventionSummaries.map((s, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-stone-800/80 text-sm flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-stone-300">{s.adjustment}</span>
                <span className="text-stone-500 text-xs">{s.when}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {weeklyRecap && (
        <div className="mb-6 p-4 rounded-xl bg-stone-900/60 border border-stone-800">
          <h2 className="text-sm font-medium text-stone-400 mb-2">Weekly recap (7d)</h2>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-2xl font-semibold text-stone-200">{weeklyRecap.secured}</p>
              <p className="text-xs text-stone-500">secured</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-stone-500">{weeklyRecap.expected_without_intervention}</p>
              <p className="text-xs text-stone-500">expected without us</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-emerald-400">+{weeklyRecap.delta}</p>
              <p className="text-xs text-stone-500">from prepared outreach</p>
            </div>
          </div>
        </div>
      )}

      {interventionHighlights.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
          <h2 className="text-sm font-medium text-emerald-300 mb-2">Intervention highlights</h2>
          <p className="text-xs text-emerald-400/80 mb-3">Moments where conversation momentum was saved</p>
          <div className="space-y-2">
            {interventionHighlights.map((h, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-emerald-950/50 text-sm flex flex-wrap items-baseline gap-2">
                <span className="text-emerald-300 font-medium">{h.what}</span>
                <span className="text-stone-500">· {h.who}</span>
                {h.attributed_to && <span className="text-emerald-400/90">{h.attributed_to}</span>}
                {h.expected && <span className="text-emerald-500/80 text-xs">{h.expected}</span>}
                <span className="text-stone-600 text-xs">{new Date(h.when).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {performanceBoost && performanceBoost.summary.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
          <h2 className="text-sm font-medium text-emerald-300 mb-2">Performance boost</h2>
          <p className="text-xs text-stone-500 mb-3">Environmental improvements to your conversations</p>
          <ul className="space-y-1.5 text-sm text-stone-300">
            {performanceBoost.summary.map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
        </div>
      )}

      {removalSimulator && (removalSimulator.if_paused_today.touches_lost > 0 || removalSimulator.if_paused_today.conversations_going_cold > 0 || removalSimulator.if_paused_today.attendance_at_risk > 0 || isDemoMode) && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/30 border border-rose-800/50">
          <h2 className="text-sm font-medium text-rose-300 mb-2">Removal simulator — if paused today</h2>
          <p className="text-xs text-rose-400/90 mb-3">{removalSimulator.message}</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xl font-semibold text-rose-200">{removalSimulator.if_paused_today.touches_lost}</p>
              <p className="text-xs text-stone-500">Touches lost today</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-rose-200">{removalSimulator.if_paused_today.conversations_going_cold}</p>
              <p className="text-xs text-stone-500">Conversations going cold</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-rose-200">{removalSimulator.if_paused_today.attendance_at_risk}</p>
              <p className="text-xs text-stone-500">Attendance at risk</p>
            </div>
          </div>
        </div>
      )}

      {removalImpact && (removalImpact.lost_conversations_estimate > 0 || removalImpact.lost_attendance_estimate > 0 || removalImpact.lost_opportunities_estimate > 0 || isDemoMode) && (
        <div className="mb-6 p-4 rounded-xl bg-amber-950/20 border border-amber-800/50">
          <h2 className="text-sm font-medium text-amber-300 mb-2">Removal impact (this week)</h2>
          <p className="text-xs text-stone-500 mb-3">{removalImpact.message}</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xl font-semibold text-amber-200">{removalImpact.lost_conversations_estimate}</p>
              <p className="text-xs text-stone-500">Conversations likely lost</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-amber-200">{removalImpact.lost_attendance_estimate}</p>
              <p className="text-xs text-stone-500">Attendance would not have occurred</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-amber-200">{removalImpact.lost_opportunities_estimate}</p>
              <p className="text-xs text-stone-500">Opportunities at risk</p>
            </div>
          </div>
        </div>
      )}

      {commitmentLedger && (commitmentLedger.active_follow_ups_scheduled > 0 || commitmentLedger.recovery_paths_running > 0 || commitmentLedger.attendance_confirmations_pending > 0 || isDemoMode) && (
        <div className="mb-6 p-4 rounded-xl bg-sky-950/30 border border-sky-800/50">
          <h2 className="text-sm font-medium text-sky-300 mb-2">Commitment ledger</h2>
          <p className="text-xs text-stone-500 mb-3">Ongoing work. Pausing interrupts this.</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-semibold text-sky-200">{commitmentLedger.active_follow_ups_scheduled}</p>
              <p className="text-xs text-stone-500">Active follow-ups scheduled</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-amber-200">{commitmentLedger.recovery_paths_running}</p>
              <p className="text-xs text-stone-500">Recovery paths running</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-emerald-200">{commitmentLedger.attendance_confirmations_pending}</p>
              <p className="text-xs text-stone-500">Attendance confirmations pending</p>
            </div>
          </div>
        </div>
      )}

      {commitments.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
          <h2 className="text-sm font-medium text-emerald-300 mb-2">Our commitments</h2>
          <p className="text-xs text-stone-500 mb-3">How we&apos;re handling risks</p>
          <div className="space-y-2">
            {commitments.map((c, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-stone-900/80 text-sm flex flex-wrap items-baseline gap-2">
                <span className="text-stone-400">{c.risk}</span>
                <span className="text-stone-500">→</span>
                <span className="text-emerald-400 font-medium">{c.handling}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8 p-4 rounded-xl bg-stone-900/80 border border-stone-800 flex flex-wrap items-center gap-6">
        <div>
          <p className="text-xs text-stone-500">Guard status</p>
          <p className={`font-medium flex items-center gap-2 ${data.operator_status === "Running" || data.operator_status === "Active" ? "text-emerald-400" : data.operator_status === "Paused" ? "text-amber-400" : "text-stone-400"}`}>
            {data.operator_status === "Running" ? "Active" : data.operator_status === "Monitoring" ? "Watching over" : data.operator_status}
            {data.heartbeat_visible && data.operator_status === "Monitoring" && (
              <span className="inline-block w-2 h-2 rounded-full bg-stone-500 animate-pulse" title="Guarding revenue" />
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Last action</p>
          <p className="text-stone-300">{data.last_action ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Next</p>
          <p className="text-stone-300">{data.next_action ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Revenue protected today</p>
          <p className="text-stone-300">{data.today_booked} secured · {data.today_recovered} attended</p>
        </div>
      </div>

      {dailyCycles && dailyCycles.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-stone-900/60 border border-stone-800">
          <h2 className="text-sm font-medium text-stone-400 mb-2">Today&apos;s routines</h2>
          <p className="text-xs text-stone-500 mb-3">Operational cycles completed</p>
          <div className="grid grid-cols-3 gap-4">
            {dailyCycles.map((c) => (
              <div key={c.cycle} className={`px-3 py-2 rounded-lg ${c.completed ? "bg-emerald-950/30 border border-emerald-800/40" : "bg-stone-800/80"}`}>
                <p className={`text-sm font-medium ${c.completed ? "text-emerald-300" : "text-stone-400"}`}>{c.label}</p>
                <p className="text-xs text-stone-500 mt-0.5">{c.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {calendarConfidence != null && calendarConfidence > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-stone-900/60 border border-stone-800">
          <h2 className="text-sm font-medium text-stone-400 mb-2">Calendar confidence</h2>
          <p className="text-xs text-stone-500 mb-2">Predicted call quality for today</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 rounded-full bg-stone-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${calendarConfidence >= 70 ? "bg-emerald-500" : calendarConfidence >= 40 ? "bg-amber-500" : "bg-stone-600"}`}
                style={{ width: `${calendarConfidence}%` }}
              />
            </div>
            <span className={`text-sm font-semibold ${calendarConfidence >= 70 ? "text-emerald-400" : calendarConfidence >= 40 ? "text-amber-400" : "text-stone-400"}`}>
              {calendarConfidence}%
            </span>
          </div>
        </div>
      )}

      {pipelineForecast && (pipelineForecast.likely_bookings > 0 || pipelineForecast.revivals_in_progress > 0 || pipelineForecast.attendance_confirmations_pending > 0) && (
        <div className="mb-6 p-4 rounded-xl bg-stone-900/60 border border-stone-800">
          <h2 className="text-sm font-medium text-stone-400 mb-2">Pipeline forecast (next 48h)</h2>
          <p className="text-xs text-stone-500 mb-3">Expected activity</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xl font-semibold text-stone-200">{pipelineForecast.likely_bookings}</p>
              <p className="text-xs text-stone-500">Likely bookings</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-amber-300">{pipelineForecast.revivals_in_progress}</p>
              <p className="text-xs text-stone-500">Revivals in progress</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-emerald-300">{pipelineForecast.attendance_confirmations_pending}</p>
              <p className="text-xs text-stone-500">Attendance confirmations</p>
            </div>
          </div>
        </div>
      )}

      {pipelineHealth && (pipelineHealth.tomorrow_calls_count ?? 0) >= 0 && (
        <>
          {!isDemoMode && custodyCount > 0 && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-sky-950/30 border border-sky-800/50">
              <p className="text-sky-200 font-medium">
                These conversations are being kept warm. Pausing breaks continuity.
              </p>
            </div>
          )}
          <div className="mb-8 p-4 rounded-xl bg-stone-900/60 border border-stone-800">
            <h2 className="text-sm font-medium text-stone-400 mb-3">Call pipeline health</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-stone-500">Tomorrow attendance</p>
              <p className="text-stone-300 font-medium">{pipelineHealth.tomorrow_attendance_probability ?? 0}% likely</p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Tomorrow calls</p>
              <p className="text-stone-300 font-medium">{pipelineHealth.tomorrow_calls_count ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Empty slot risk</p>
              <p className="text-stone-300 font-medium">{(pipelineHealth.empty_slot_risk ?? 0) > 0 ? pipelineHealth.empty_slot_risk : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Late cancel risk</p>
              <p className="text-stone-300 font-medium">{(pipelineHealth.late_cancellation_risk ?? 0) > 0 ? `${pipelineHealth.late_cancellation_risk}%` : "—"}</p>
            </div>
          </div>
        </div>
        </>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <section>
          <h2 className="text-lg font-medium text-stone-300 mb-3">Contributing toward target</h2>
          <p className="text-sm text-stone-500 mb-3">Each lead adds to weekly goal</p>
          <div className="space-y-2">
            {hotLeads.map((l) => (
              <div key={l.lead_id} className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-medium text-stone-200">{l.name || l.email || l.company || "Unknown"}</p>
                    <ConversationProgressIndicator
                      stage={leadStateToProgress(l.state)}
                      compact
                    />
                  </div>
                  <p className="text-xs text-stone-500">
                    {l.responsibility_phase && (
                      <span className="text-sky-400/90 capitalize">{l.responsibility_phase.replace(/_/g, " ")}</span>
                    )}
                    {l.responsibility_phase && (l.contribution || l.warmth_score != null) && " · "}
                    {l.contribution ?? `${Math.round(l.probability * 100)}% likely`}
                    {roleOwnership[l.lead_id] && (
                      <span className="text-stone-600"> · {roleOwnership[l.lead_id].role}</span>
                    )}
                  </p>
                  {replyWindowByLead[l.lead_id] != null && (
                    <p className="text-xs text-amber-400 mt-1">
                      Reply window: {replyWindowByLead[l.lead_id] < 60
                        ? `${replyWindowByLead[l.lead_id]} min left`
                        : `${Math.ceil(replyWindowByLead[l.lead_id] / 60)}h left`}
                    </p>
                  )}
                  {(data.operator_status === "Paused" || l.warmth_score != null || l.scheduled_intent || l.handling_status) && (
                    <p className="text-xs text-stone-500 mt-1">
                      {l.handling_status && (
                        <span className={`capitalize ${l.handling_status === "preparing" ? "text-sky-400" : l.handling_status === "re-engaging" ? "text-amber-400" : "text-stone-400"}`}>
                          {l.handling_status.replace(/-/g, " ")}
                        </span>
                      )}
                      {l.handling_status && (l.scheduled_intent || data.operator_status === "Paused" || l.warmth_score != null) && " · "}
                      {data.operator_status === "Paused" && <span className="text-amber-400/90">Cooling — familiarity fading</span>}
                      {data.operator_status === "Paused" && (l.scheduled_intent || l.warmth_score != null) && " · "}
                      {l.scheduled_intent && <span className="text-emerald-400/90">{l.scheduled_intent}</span>}
                      {l.scheduled_intent && l.warmth_score != null && " · "}
                      {l.warmth_score != null && <span className="text-emerald-400/90">Relationship built: {l.warmth_score}%</span>}
                    </p>
                  )}
                </div>
                <Link
                  href={l.lead_id.startsWith("demo-") || l.lead_id.startsWith("preview-") ? "/dashboard/leads" : `/dashboard/leads/${l.lead_id}`}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-sm font-medium"
                >
                  {l.lead_id.startsWith("demo-") || l.lead_id.startsWith("preview-") ? "View leads" : "Run plan"}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-stone-300 mb-3">At risk</h2>
          <p className="text-sm text-stone-500 mb-3">Recovering to protect contribution</p>
          <div className="space-y-2">
            {atRisk.map((l) => (
              <div key={l.id} className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-medium text-stone-200">{l.name || "Unknown"}</p>
                    <ConversationProgressIndicator
                      stage={leadStateToProgress(l.state)}
                      compact
                    />
                  </div>
                  <p className="text-xs text-stone-500">
                    {l.responsibility_phase && (
                      <span className="text-amber-400/90 capitalize">{l.responsibility_phase.replace(/_/g, " ")}</span>
                    )}
                    {l.responsibility_phase && (l.contribution || l.state) && " · "}
                    {l.contribution ?? l.state ?? "—"}
                    {roleOwnership[l.id] && (
                      <span className="text-stone-600"> · {roleOwnership[l.id].role}</span>
                    )}
                  </p>
                  {replyWindowByLead[l.id] != null && (
                    <p className="text-xs text-amber-400 mt-1">
                      Reply window: {replyWindowByLead[l.id] < 60
                        ? `${replyWindowByLead[l.id]} min left`
                        : `${Math.ceil(replyWindowByLead[l.id] / 60)}h left`}
                    </p>
                  )}
                  {(data.operator_status === "Paused" || l.warmth_score != null || l.scheduled_intent || l.handling_status) && (
                    <p className="text-xs text-stone-500 mt-1">
                      {l.handling_status && (
                        <span className={`capitalize ${l.handling_status === "re-engaging" ? "text-amber-400" : l.handling_status === "monitoring" ? "text-stone-400" : "text-sky-400"}`}>
                          {l.handling_status.replace(/-/g, " ")}
                        </span>
                      )}
                      {l.handling_status && (l.scheduled_intent || data.operator_status === "Paused" || l.warmth_score != null) && " · "}
                      {data.operator_status === "Paused" && <span className="text-amber-400/90">Cooling — familiarity fading</span>}
                      {data.operator_status === "Paused" && (l.scheduled_intent || l.warmth_score != null) && " · "}
                      {l.scheduled_intent && <span className="text-emerald-400/90">{l.scheduled_intent}</span>}
                      {l.scheduled_intent && l.warmth_score != null && " · "}
                      {l.warmth_score != null && <span className="text-emerald-400/90">Relationship built: {l.warmth_score}%</span>}
                    </p>
                  )}
                </div>
                <Link
                  href={l.id.startsWith("demo-") || l.id.startsWith("preview-") ? "/dashboard/leads" : `/dashboard/leads/${l.id}`}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-sm font-medium"
                >
                  {l.id.startsWith("demo-") || l.id.startsWith("preview-") ? "View leads" : "Recover"}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-stone-300 mb-3">Recovered</h2>
          <p className="text-sm text-stone-500 mb-3">Revived conversations</p>
          <div className="space-y-2">
            {recovered.map((l) => (
              <div key={l.id} className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between">
                <div>
                  <p className="font-medium text-stone-200">{l.name || "Unknown"}</p>
                  <p className="text-xs text-stone-500">
                    {l.company ?? "—"}
                    {roleOwnership[l.id] && (
                      <span className="text-stone-600"> · {roleOwnership[l.id].role}</span>
                    )}
                  </p>
                </div>
                <Link
                  href={l.id.startsWith("demo-") || l.id.startsWith("preview-") ? "/dashboard/leads" : `/dashboard/leads/${l.id}`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-stone-100 text-sm font-medium"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-8">
        {shiftSummary ? (
          <div className="mb-4 p-4 rounded-xl bg-stone-900/60 border border-stone-800">
            <h2 className="text-lg font-medium text-stone-300 mb-2">Outcomes today</h2>
            <p className="text-sm text-stone-400">
              {shiftSummary.replies_sent} protected · {shiftSummary.follow_ups_scheduled} loss-prevention scheduled · {shiftSummary.calls_booked} bookings secured · {shiftSummary.calls_completed} attendance secured · {shiftSummary.recovered} recovered
            </p>
          </div>
        ) : (
          <h2 className="text-lg font-medium text-stone-300 mb-3">Activity feed</h2>
        )}
        <p className="text-sm text-stone-500 mb-3">Conversations prepared for you</p>
        <div className="space-y-2">
          {activity.map((a, i) => (
            <ActivityEntry key={i} a={a} isDemo={isDemoMode} />
          ))}
        </div>
      </section>

      <ReassurancePanel />
    </div>
  );
}

function ReassurancePanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-12 p-4 rounded-xl bg-stone-900/40 border border-stone-800">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-sm font-medium text-stone-400">Reassurance</span>
        <span className="text-stone-500">{open ? "▼" : "▶"}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="font-medium text-stone-300">Will they annoy leads?</p>
            <p className="text-stone-500 mt-0.5">They stop when interest drops.</p>
          </div>
          <div>
            <p className="font-medium text-stone-300">Can I review what they do?</p>
            <p className="text-stone-500 mt-0.5">Every action is visible.</p>
          </div>
        <div>
          <p className="font-medium text-stone-300">Can I pause them?</p>
          <p className="text-stone-500 mt-0.5">Pause anytime. Pausing reduces your ability to secure outcomes—we show what you would lose so you can evaluate the cost.</p>
        </div>
        </div>
      )}
    </div>
  );
}
