"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  Area,
  AreaChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  Link2,
  Megaphone,
  Phone,
  Settings,
  UserPlus,
  Video,
} from "lucide-react";
import {
  fetchWorkspaceMeCached,
  getWorkspaceMeSnapshotSync,
} from "@/lib/client/workspace-me";
import { apiFetch, ApiError } from "@/lib/api";
import { calculateReadiness } from "@/lib/readiness";
import { speakTextViaApi } from "@/lib/voice-preview";
import { Waveform } from "@/components/Waveform";
import { Skeleton } from "@/components/ui/Skeleton";
import { getClientOrNull } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { KPIRow } from "@/components/ui/KPIRow";
import { Timeline } from "@/components/ui/Timeline";
import { useWorkspace } from "@/components/WorkspaceContext";
import { UpgradeBanner } from "@/components/ui/UpgradeBanner";

type ActivityType = "lead" | "appointment" | "follow-up" | "urgent";

type ActivityCard = {
  id: string;
  type: ActivityType;
  name: string;
  time: string;
  duration: string;
  summary: string;
  score: number | null;
};

const TYPE_COLORS: Record<ActivityType, string> = {
  lead: "#3B82F6",
  appointment: "#22C55E",
  "follow-up": "#A855F7",
  urgent: "#EF4444",
};

type FilterId = "all" | "needs_action" | "leads" | "appointments" | "urgent";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs_action", label: "Needs action" },
  { id: "leads", label: "Leads" },
  { id: "appointments", label: "Appointments" },
  { id: "urgent", label: "Urgent" },
];

interface CallRecord {
  id: string;
  call_started_at?: string | null;
  call_ended_at?: string | null;
  outcome?: string | null;
  matched_lead?: { name?: string | null; email?: string | null; company?: string | null } | null;
  summary?: string | null;
  analysis_outcome?: unknown;
}

function getPlaySummary(card: ActivityCard): string {
  const name = card.name;
  const summary = card.summary;
  if (card.type === "lead") {
    return `${name} called. ${summary}. Lead qualified${card.score != null ? `, score ${card.score}` : ""}. Call ended.`;
  }
  if (card.type === "appointment") {
    return `${name} called. ${summary}. Appointment confirmed. Call ended.`;
  }
  if (card.type === "follow-up") {
    return `${name} — ${summary}. Follow-up completed. Call ended.`;
  }
  if (card.type === "urgent") {
    return `Emergency call from ${name}. ${summary}. Owner alerted. Call ended.`;
  }
  return `${name} — ${summary}. Call ended.`;
}

function formatTimeLabel(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDuration(start?: string | null, end?: string | null): string {
  if (!start || !end) return "—";
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const sec = Math.max(0, Math.floor((e - s) / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

const PAGE_TITLE = "Dashboard — Recall Touch";

const PROGRESS_LABELS: Record<string, string> = {
  business: "Business info added",
  agent: "Agent created",
  services: "Knowledge added",
  phone: "Connect phone number",
  test_call: "Make your first call",
  first_call: "Capture first lead",
  calendar: "Calendar connected",
  team: "Team member invited",
  use_cases: "Use cases selected",
  voice: "Voice selected",
  greeting: "Opening greeting set",
  knowledge: "3+ knowledge entries",
  behavior: "Behavior configured",
  tested: "Agent tested",
  launched: "Agent launched",
};

function ActivityDateLabel() {
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDateLabel(
        new Date().toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      );
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  return <span className="text-xs text-[var(--text-tertiary)]">{dateLabel}</span>;
}

const NEXT_ACTIONS = [
  {
    title: "Connect your phone",
    body: "Route your existing number or claim a new one so your AI can start answering real calls.",
    href: "/app/settings/phone",
  },
  {
    title: "Make a test call",
    body: "Hear the current greeting and confirm your call flow before going live.",
    href: "/app/onboarding",
  },
  {
    title: "Share with your team",
    body: "Invite the people who should see leads, appointments, and inbox updates.",
    href: "/app/team",
  },
] as const;

const QUICK_ACTIONS: {
  icon: typeof Phone;
  label: string;
  href: string;
  desc: string;
}[] = [
  { icon: Phone, label: "Make a test call", href: "/app/agents", desc: "Test your AI agent" },
  { icon: UserPlus, label: "Add a lead", href: "/app/leads", desc: "Create a new lead record" },
  { icon: Megaphone, label: "Create campaign", href: "/app/campaigns", desc: "Start outbound calls" },
  { icon: Settings, label: "Agent settings", href: "/app/agents", desc: "Configure AI behavior" },
  { icon: Link2, label: "Connect CRM", href: "/app/settings/integrations", desc: "Send leads to your CRM" },
  { icon: BarChart3, label: "View analytics", href: "/app/analytics", desc: "See call performance" },
];

const ACTIVITY_SNAPSHOT_KEY = "rt_activity_snapshot";

function readActivitySnapshot(): ActivityCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACTIVITY_SNAPSHOT_KEY);
    const parsed = raw ? (JSON.parse(raw) as ActivityCard[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistActivitySnapshot(cards: ActivityCard[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVITY_SNAPSHOT_KEY, JSON.stringify(cards));
  } catch {
    // ignore persistence errors
  }
}

const PLACEHOLDER_AREA: { day: string; calls: number }[] = Array.from(
  { length: 7 },
  (_, i) => ({
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
    calls: 0,
  }),
);

const PLACEHOLDER_PIE: { name: string; value: number }[] = [
  { name: "No data", value: 1 },
];

const PIE_COLORS = ["#2A2A2D"];
const REAL_PIE_COLORS = ["#00D4AA", "#FF4D4D", "#FFB224", "#4F8CFF"];

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-2">
        <Skeleton variant="text" className="h-8 w-64" />
        <Skeleton variant="text" className="h-4 w-40" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <Skeleton key={i} variant="card" className="h-24" />
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <Skeleton key={i} variant="card" className="h-20" />
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton variant="card" className="h-64" />
        <Skeleton variant="card" className="h-64" />
      </div>
    </div>
  );
}

export default function AppActivityPage() {
  const searchParams = useSearchParams();
  const { workspaceId } = useWorkspace();
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as
    | {
        systemEvents?: Array<{ id: string; title: string; body: string; href: string }>;
        progress?: { nextStep?: { href?: string } | null };
        stats?: { calls?: number; leads?: number; estRevenue?: number; lastCallAt?: string | null };
      }
    | null;

  useEffect(() => {
    document.title = PAGE_TITLE;
    return () => { document.title = ""; };
  }, []);
  const [filter, setFilter] = useState<FilterId>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<ActivityCard | null>(null);
  const [cards, setCards] = useState<ActivityCard[]>(() => readActivitySnapshot());
  const [loading, setLoading] = useState(() => readActivitySnapshot().length === 0);
  const [loadError, setLoadError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [systemEvents, setSystemEvents] = useState<Array<{ id: string; title: string; body: string; href: string }>>(
    () => workspaceSnapshot?.systemEvents ?? [],
  );
  const [welcomeToast, setWelcomeToast] = useState<string | null>(null);
  const [showFirstWelcome, setShowFirstWelcome] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("rt_dashboard_welcome_dismissed") !== "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const welcome = searchParams.get("welcome");
    if (welcome && typeof welcome === "string") {
      const message = `Welcome to ${decodeURIComponent(welcome)}!`;
      const url = new URL(window.location.href);
      url.searchParams.delete("welcome");
      window.history.replaceState({}, "", url.pathname + url.search);
      queueMicrotask(() => setWelcomeToast(message));
      const t = setTimeout(() => setWelcomeToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);
  const [nextStepHref, setNextStepHref] = useState(
    () => (workspaceSnapshot as { progress?: { nextStep?: { href?: string } } } | null)?.progress?.nextStep?.href || "/app/settings/phone",
  );
  const [_agents, setAgents] = useState<Array<{ id: string; name?: string | null; voice_id?: string | null; greeting?: string | null; knowledge_base?: { faq?: Array<{ q?: string; a?: string }> }; rules?: { alwaysTransfer?: unknown[]; neverSay?: unknown[] }; vapi_agent_id?: string | null; tested_at?: string | null }>>([]);
  const [readiness, setReadiness] = useState<ReturnType<typeof calculateReadiness> | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(() =>
    workspaceSnapshot?.stats?.lastCallAt ? Date.now() : null,
  );
  const [workspaceStats, setWorkspaceStats] = useState<{
    calls: number;
    leads: number;
    estRevenue: number;
    lastCallAt?: string | null;
  }>(() => ({
    calls: workspaceSnapshot?.stats?.calls ?? 0,
    leads: workspaceSnapshot?.stats?.leads ?? 0,
    estRevenue: workspaceSnapshot?.stats?.estRevenue ?? 0,
    lastCallAt: workspaceSnapshot?.stats?.lastCallAt ?? null,
  }));
  const [callVolumeData] = useState<{ day: string; calls: number }[]>([]);
  const [outcomeData] = useState<{ name: string; value: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityCard[]>(() => readActivitySnapshot());

  useEffect(() => {
    if (!workspaceId) return;
    apiFetch<{ calls?: CallRecord[] }>(
      `/api/calls?workspace_id=${encodeURIComponent(workspaceId)}`,
      { credentials: "include", timeout: 8000, retries: 1 },
    )
      .then((data) => {
        setLoadError(false);
        const calls = (data.calls ?? []).slice(0, 20);
        const mapped: ActivityCard[] = calls.map((c) => {
          const name =
            c.matched_lead?.name ??
            c.matched_lead?.company ??
            c.matched_lead?.email ??
            "Caller";
          const time = formatTimeLabel(c.call_started_at);
          const duration = formatDuration(c.call_started_at, c.call_ended_at);
          const summary =
            c.summary ??
            (c.outcome === "appointment"
              ? "Appointment locked in from this call."
              : c.outcome === "lead"
                ? "Lead captured and waiting for follow-up."
                : "Call handled by your system.");
          const type: ActivityType =
            c.outcome === "appointment"
              ? "appointment"
              : c.outcome === "lead"
                ? "lead"
                : c.outcome === "transfer"
                  ? "urgent"
                  : "follow-up";
          const score =
            type === "lead"
              ? 60 + ((name.length * 7) % 40)
              : null;
          return {
            id: c.id,
            type,
            name,
            time,
            duration,
            summary,
            score,
          };
        });
        setCards(mapped);
        setRecentActivity(mapped);
        persistActivitySnapshot(mapped);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 408) {
          setLoadError(true);
        } else {
          setLoadError(true);
        }
      })
      .finally(() => setLoading(false));
  }, [workspaceId, refreshKey]);

  useEffect(() => {
    const client = getClientOrNull?.() ?? null;
    if (!client) return;
    const channel = client
      .channel("dashboard-calls")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_sessions",
        },
        (payload: { new?: { id: string; caller_name?: string | null; call_started_at?: string | null; call_ended_at?: string | null; outcome?: string | null } }) => {
          const row = payload.new;
          if (!row) return;
          const time = formatTimeLabel(row.call_started_at ?? null);
          const duration = formatDuration(row.call_started_at ?? null, row.call_ended_at ?? null);
          const type: ActivityType =
            row.outcome === "appointment"
              ? "appointment"
              : row.outcome === "lead"
                ? "lead"
                : row.outcome === "transfer"
                  ? "urgent"
                  : "follow-up";
          const card: ActivityCard = {
            id: row.id,
            type,
            name: row.caller_name || "Caller",
            time,
            duration,
            summary:
              row.outcome === "appointment"
                ? "Appointment locked in from this call."
                : row.outcome === "lead"
                  ? "Lead captured and waiting for follow-up."
                  : "Call handled by your system.",
            score: type === "lead" ? 75 : null,
          };
          setRecentActivity((prev) => {
            const next = [card, ...prev];
            persistActivitySnapshot(next.slice(0, 20));
            return next.slice(0, 20);
          });
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    fetchWorkspaceMeCached()
      .then((data: {
        name?: string;
        systemEvents?: Array<{ id: string; title: string; body: string; href: string }>;
        progress?: { nextStep?: { href?: string } | null; items?: Array<{ key: string; completed?: boolean }> };
        stats?: { calls?: number; leads?: number; estRevenue?: number; lastCallAt?: string | null };
      } | null) => {
        setSystemEvents(data?.systemEvents ?? []);
        setNextStepHref(data?.progress?.nextStep?.href || "/app/settings/phone");
        setWorkspaceStats({
          calls: data?.stats?.calls ?? 0,
          leads: data?.stats?.leads ?? 0,
          estRevenue: data?.stats?.estRevenue ?? 0,
          lastCallAt: data?.stats?.lastCallAt ?? null,
        });
        setLastCheckedAt(Date.now());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/agents?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.resolve({ agents: [] })))
      .then((data: { agents?: unknown[] }) => {
        const list = data?.agents ?? [];
        setAgents(list as typeof _agents);
        const snapshot = getWorkspaceMeSnapshotSync() as { name?: string; progress?: { items?: Array<{ key: string; completed?: boolean }> } } | null;
        const phoneConnected = snapshot?.progress?.items?.find((i) => i.key === "phone")?.completed ?? false;
        const workspaceForReadiness = {
          name: snapshot?.name ?? null,
          phoneConnected,
        };
        setReadiness(calculateReadiness(workspaceForReadiness, (list as typeof _agents)[0] ?? null));
      })
      .catch(() => setReadiness(null));
  }, [workspaceId]);

  let showInactivityBanner = false;
  if (workspaceStats.lastCallAt && lastCheckedAt != null) {
    const last = new Date(workspaceStats.lastCallAt).getTime();
    if (!Number.isNaN(last) && lastCheckedAt - last > 3 * 24 * 60 * 60 * 1000) {
      showInactivityBanner = true;
    }
  }

  const filtered = useMemo(() => {
    if (filter === "all") return cards;
    if (filter === "leads") return cards.filter((c) => c.type === "lead");
    if (filter === "appointments")
      return cards.filter((c) => c.type === "appointment");
    if (filter === "urgent") return cards.filter((c) => c.type === "urgent");
    if (filter === "needs_action")
      return cards.filter(
        (c) => c.type === "lead" || c.type === "urgent",
      );
    return cards;
  }, [cards, filter]);

  const fallbackProgressItems =
    (workspaceSnapshot as { progress?: { items?: Array<{ key: string; completed: boolean }> } } | null)?.progress
      ?.items ?? [];
  const fallbackPct =
    fallbackProgressItems.length === 0
      ? 0
      : Math.round((fallbackProgressItems.filter((p) => p.completed).length / fallbackProgressItems.length) * 100);
  const progressItems =
    readiness?.items ??
    fallbackProgressItems.map((p) => ({
      ...p,
      label: PROGRESS_LABELS[p.key] ?? p.key,
      href: "/app/settings/phone",
      weight: 0,
    }));
  const progressPct = readiness ? readiness.percentage : fallbackPct;
  const continueSetupHref =
    readiness?.nextAction?.href ?? nextStepHref ?? "/app/settings/phone";

  const totalSteps = progressItems.length;
  const completedSteps =
    totalSteps === 0
      ? 0
      : progressItems.filter((item) => {
          const done = "done" in item ? item.done : item.completed;
          return done;
        }).length;

  const callCount = cards.length;
  const leadCount = cards.filter((c) => c.type === "lead").length;
  const estRevenue = leadCount * 800;
  const answerRate = callCount > 0 ? 100 : 0;

  const phoneConnected =
    progressItems.some((item) => {
      const done = "done" in item ? item.done : item.completed;
      return item.key === "phone" && done;
    }) ||
    Boolean(
      (workspaceSnapshot as
        | { progress?: { items?: Array<{ key: string; completed?: boolean }> } }
        | null)?.progress?.items?.find((i) => i.key === "phone")?.completed,
    );

  const hasAnyCalls =
    (workspaceStats.calls ?? 0) > 0 ||
    cards.length > 0 ||
    Boolean(workspaceStats.lastCallAt);

  useEffect(() => {
    if (!showFirstWelcome) return;
    if (!hasAnyCalls) return;
    setShowFirstWelcome(false);
    try {
      window.localStorage.setItem("rt_dashboard_welcome_dismissed", "true");
    } catch {
      // ignore
    }
  }, [hasAnyCalls, showFirstWelcome]);

  const [checklistDismissed, setChecklistDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("rt_activity_checklist_dismissed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "rt_activity_checklist_dismissed",
        checklistDismissed ? "true" : "false",
      );
    } catch {
      // ignore
    }
  }, [checklistDismissed]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const needsAttention = useMemo(() => {
    const items: { id: string; label: string; tone: "red" | "amber" | "green" }[] = [];
    for (const c of cards.slice(0, 10)) {
      if (c.type === "urgent") {
        items.push({
          id: `urgent-${c.id}`,
          label: `${c.name} — needs follow-up after transfer`,
          tone: "red",
        });
      } else if (c.type === "lead") {
        items.push({
          id: `lead-${c.id}`,
          label: `${c.name} — new lead to review`,
          tone: "amber",
        });
      }
    }
    return items;
  }, [cards]);

  return (
    <div className="max-w-[960px] mx-auto p-4 md:p-6 space-y-6">
      {welcomeToast && (
        <div role="status" aria-live="polite" className="fixed right-4 top-4 z-50 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card-elevated)] px-4 py-2.5 text-sm text-[var(--text-primary)] shadow-lg">
          {welcomeToast}
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            {greeting}.
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Here&apos;s what happened today.
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1">
          <ActivityDateLabel />
        </div>
      </div>

      {showFirstWelcome && !hasAnyCalls && (
        <div className="mt-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Welcome to your Recall Touch dashboard
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Your AI phone system is almost ready. Connect a number and make your first test call to see calls start appearing here automatically.
          </p>
        </div>
      )}

      <KPIRow>
        <StatCard
          label="Calls"
          value={callCount}
          prefix=""
          suffix=""
          trend={0}
        />
        <StatCard
          label="Answer rate"
          value={answerRate}
          suffix="%"
          trend={0}
        />
        <StatCard
          label="Leads"
          value={leadCount}
          suffix=""
          trend={0}
        />
        <StatCard
          label="Est. revenue"
          value={estRevenue}
          prefix="$"
          trend={0}
        />
      </KPIRow>

      <UpgradeBanner
        title="Ready for more volume?"
        description="Upgrade your plan to increase included minutes and unlock higher outbound capacity as calls ramp up."
        ctaLabel="View plans"
        href="/app/settings/billing"
      />

      {showInactivityBanner && (
        <div className="mb-4 p-4 rounded-xl border border-[var(--accent-amber)]/30 bg-[var(--accent-amber)]/10">
          <p className="text-sm text-[var(--text-primary)]">
            No calls in the last 3+ days. Is your number forwarded?
          </p>
          <Link
            href="/app/settings/phone"
            className="inline-block mt-2 text-xs font-medium text-[var(--accent-amber)] hover:opacity-90 underline"
          >
            Check setup →
          </Link>
        </div>
      )}

      {!checklistDismissed && progressPct < 100 && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Setup checklist
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                You&apos;re {progressPct}% of the way to a fully running AI phone line.
              </p>
              {totalSteps > 0 && (
                <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                  {completedSteps} of {totalSteps} steps complete
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setChecklistDismissed(true)}
              className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            >
              Dismiss
            </button>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-input)]">
            <div
              className="h-full rounded-full bg-[var(--accent-green)] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {progressItems.slice(0, 6).map((item) => {
              const done = "done" in item ? item.done : item.completed;
              const label =
                "label" in item && item.label
                  ? item.label
                  : PROGRESS_LABELS[item.key] ?? item.key;
              const href =
                "href" in item && item.href
                  ? item.href
                  : "/app/settings/phone";
              return (
                <div key={item.key} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-[var(--accent-green)] shrink-0" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-[var(--border-medium)] shrink-0" />
                    )}
                    <span
                      className={
                        done
                          ? "text-[var(--text-secondary)] text-xs"
                          : "text-[var(--text-primary)] text-xs"
                      }
                    >
                      {label}
                    </span>
                  </div>
                  {!done && (
                    <Link
                      href={href}
                      className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
                    >
                      Open
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
          <Link
            href={continueSetupHref}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black hover:bg-zinc-100 transition-colors"
          >
            Continue setup →
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
        {QUICK_ACTIONS.map((a) => (
          <motion.div
            key={a.label}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <Link
              href={a.href}
              className="bg-[#111113] border border-white/10 rounded-2xl p-4 cursor-pointer hover:border-white/20 hover:bg-[#1A1A1D] transition-colors duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3 group-hover:bg-white/10 transition-colors">
                <a.icon className="w-5 h-5 text-[#8B8B8D] group-hover:text-[#EDEDEF] transition-colors" />
              </div>
              <p className="text-sm font-medium text-[#EDEDEF]">{a.label}</p>
              <p className="text-xs text-[#5A5A5C] mt-0.5">{a.desc}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Filter activity">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f.id
                ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="rounded-xl border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-4 mb-4" role="alert">
          <p className="text-sm text-[var(--text-primary)]">We couldn’t load activity. Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => { setLoadError(false); setLoading(true); setRefreshKey((k) => k + 1); }}
            className="mt-3 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-900 hover:bg-gray-100"
            aria-label="Retry loading activity"
          >
            Retry
          </button>
        </div>
      )}
      {loading && cards.length === 0 && !loadError && <DashboardSkeleton />}

      {cards.length === 0 && !loading && !phoneConnected ? (
        <div className="space-y-6">
          <div>
            <p className="text-base font-medium text-[var(--text-primary)] mb-3">Recent activity</p>
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
              <EmptyState
                icon={Phone}
                title="Your AI agent is ready"
                description="Connect your phone number to start receiving real calls."
                primaryAction={{ label: "Connect phone", href: "/app/settings/phone" }}
                secondaryAction={{ label: "Make a test call", href: "/app/agents" }}
                footnote="Businesses like yours recover $2,400+/month in missed calls."
              />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">What to do next</p>
            <div className="mt-3 space-y-3">
              {NEXT_ACTIONS.map((item, index) => (
                <div key={item.href} className="flex items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] p-3">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bg-card)] text-[var(--text-tertiary)]">
                    {index === 0 ? <Phone className="h-3.5 w-3.5" /> : index === 1 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                    <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{item.body}</p>
                    <Link href={item.href} className="mt-2 inline-block text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2">
                      Open →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-[var(--text-tertiary)]" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">See it handled live</p>
            </div>
            <div className="mt-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] p-4">
              <p className="text-[13px] text-[var(--text-secondary)]">
                Watch the sample call walkthrough to hear how a real lead is answered, qualified, and booked before you connect your line.
              </p>
              <Link
                href="/"
                className="mt-3 inline-flex items-center justify-center rounded-lg border border-[var(--border-medium)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
              >
                Try our agent →
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Estimated ROI</p>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              Businesses at your stage typically recover{" "}
              <span className="font-medium text-[var(--text-primary)]">$2,400+</span>{" "}
              a month once every missed call turns into a captured lead.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Recent system events</p>
            {systemEvents.length === 0 ? (
              <p className="text-xs text-[var(--text-tertiary)] mt-2">Your setup events will appear here.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {systemEvents.map((event) => (
                  <li key={event.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] p-3">
                    <p className="text-xs font-medium text-[var(--text-primary)]">{event.title}</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">{event.body}</p>
                    <Link href={event.href} className="inline-block mt-2 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2">
                      View →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Want to see your AI in action?</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Use the Test tab on Agents to place a real voice call with your configured agent.</p>
            </div>
            <Link
              href="/app/agents?tab=test"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-white text-gray-900 text-xs font-semibold hover:bg-gray-100 transition-colors"
            >
              Try a test call →
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)]">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Activity Timeline
                </p>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-[#00D4AA] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00D4AA]" />
                </span>
                <span className="text-xs text-[#5A5A5C]">Live</span>
              </div>
            </div>
            <Timeline
              items={recentActivity.map((card) => ({
                id: card.id,
                title: card.name,
                description: card.summary,
                timestamp:
                  card.duration !== "—"
                    ? `${card.time} · ${card.duration}`
                    : card.time,
                iconColor: TYPE_COLORS[card.type],
                badge: (
                  <span className="inline-flex items-center rounded-full border border-[var(--border-medium)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                    {card.type === "lead"
                      ? "Lead"
                      : card.type === "appointment"
                        ? "Appointment"
                        : card.type === "urgent"
                          ? "Urgent"
                          : "Follow-up"}
                  </span>
                ),
              }))}
              className="mt-1"
            />
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Needs attention
                </p>
              </div>
              {needsAttention.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <p className="text-xs text-[var(--text-secondary)]">
                    All caught up.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                  {needsAttention.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2"
                    >
                      <span className="truncate">{item.label}</span>
                      <span
                        className={
                          item.tone === "red"
                            ? "h-2.5 w-2.5 rounded-full bg-red-500/80"
                            : item.tone === "amber"
                              ? "h-2.5 w-2.5 rounded-full bg-amber-400/80"
                              : "h-2.5 w-2.5 rounded-full bg-emerald-400/80"
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Recent system events
              </p>
              {systemEvents.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)] mt-2">
                  Your setup events will appear here.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {systemEvents.map((event) => (
                    <li
                      key={event.id}
                      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] p-3"
                    >
                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        {event.title}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">
                        {event.body}
                      </p>
                      <Link
                        href={event.href}
                        className="inline-block mt-2 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
                      >
                        View →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
        <div className="bg-[#111113] border border-white/10 rounded-2xl p-6 relative">
          <h3 className="text-sm font-medium text-[#EDEDEF] mb-4">
            Call Volume (7 days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={callVolumeData.length > 0 ? callVolumeData : PLACEHOLDER_AREA}>
              <defs>
                <linearGradient id="dashboardCallGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F8CFF" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#4F8CFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "#5A5A5C" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "#1A1A1D",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  fontSize: 13,
                }}
              />
              <Area
                type="monotone"
                dataKey="calls"
                stroke="#4F8CFF"
                fill="url(#dashboardCallGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
          {callVolumeData.length === 0 && (
            <div className="absolute inset-0 flex items-center justifycenter rounded-2xl bg-[#111113]/60">
              <p className="text-[#5A5A5C] text-sm">
                Charts appear after your first call
              </p>
            </div>
          )}
        </div>

        <div className="bg-[#111113] border border-white/10 rounded-2xl p-6 relative">
          <h3 className="text-sm font-medium text-[#EDEDEF] mb-4">
            Call Outcomes
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={outcomeData.length > 0 ? outcomeData : PLACEHOLDER_PIE}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {(outcomeData.length > 0 ? outcomeData : PLACEHOLDER_PIE).map(
                  (_slice, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <Cell
                      key={i}
                      fill={
                        outcomeData.length > 0
                          ? REAL_PIE_COLORS[i % REAL_PIE_COLORS.length]
                          : PIE_COLORS[0]
                      }
                    />
                  ),
                )}
              </Pie>
              {outcomeData.length > 0 && <Tooltip />}
            </PieChart>
          </ResponsiveContainer>
          {outcomeData.length === 0 && (
            <div className="absolute inset-0 flex items-center justifycenter rounded-2xl bg-[#111113]/60">
              <p className="text-[#5A5A5C] text-sm">No outcome data yet</p>
            </div>
          )}
        </div>
      </div>

      {selectedCard && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            onClick={() => setSelectedCard(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close details"
          />
          <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto md:w-[360px] bg-[var(--bg-card-elevated)] border-t md:border-t-0 md:border-l border-[var(--border-default)] rounded-t-2xl md:rounded-none shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)]">
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Call</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {selectedCard.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCard(null)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-2 text-sm text-[var(--text-secondary)]">
              <p className="text-xs text-[var(--text-tertiary)]">
                {selectedCard.time} · {selectedCard.duration}
              </p>
              <p>{selectedCard.summary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

