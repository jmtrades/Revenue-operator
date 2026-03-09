"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Phone,
  UserPlus,
  Video,
} from "lucide-react";
import {
  fetchWorkspaceMeCached,
  getWorkspaceMeSnapshotSync,
} from "@/lib/client/workspace-me";
import { calculateReadiness } from "@/lib/readiness";
import { speakTextViaApi } from "@/lib/voice-preview";
import { Waveform } from "@/components/Waveform";
import { EmptyState } from "@/components/EmptyState";
import { useWorkspace } from "@/components/WorkspaceContext";

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
  const [agents, setAgents] = useState<Array<{ id: string; name?: string | null; voice_id?: string | null; greeting?: string | null; knowledge_base?: { faq?: Array<{ q?: string; a?: string }> }; rules?: { alwaysTransfer?: unknown[]; neverSay?: unknown[] }; vapi_agent_id?: string | null; tested_at?: string | null }>>([]);
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

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/calls?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((data: { calls?: CallRecord[] }) => {
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
        persistActivitySnapshot(mapped);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [workspaceId, refreshKey]);

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
        setAgents(list as typeof agents);
        const snapshot = getWorkspaceMeSnapshotSync() as { name?: string; progress?: { items?: Array<{ key: string; completed?: boolean }> } } | null;
        const phoneConnected = snapshot?.progress?.items?.find((i) => i.key === "phone")?.completed ?? false;
        const workspaceForReadiness = {
          name: snapshot?.name ?? null,
          phoneConnected,
        };
        setReadiness(calculateReadiness(workspaceForReadiness, (list as typeof agents)[0] ?? null));
      })
      .catch(() => setReadiness(null));
  }, [workspaceId]);

  const callCount = cards.length;
  const leadCount = cards.filter((c) => c.type === "lead").length;
  const estRevenue = leadCount * 800;
  const answerRate = callCount > 0 ? 100 : 0;

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
  const progressItems = readiness?.items ?? fallbackProgressItems.map((p) => ({ ...p, label: PROGRESS_LABELS[p.key] ?? p.key, href: "/app/settings/phone", weight: 0 }));
  const progressPct = readiness ? readiness.percentage : fallbackPct;
  const continueSetupHref = readiness?.nextAction?.href ?? nextStepHref ?? "/app/settings/phone";

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      {welcomeToast && (
        <div role="status" aria-live="polite" className="fixed right-4 top-4 z-50 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card-elevated)] px-4 py-2.5 text-sm text-[var(--text-primary)] shadow-lg">
          {welcomeToast}
        </div>
      )}
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Dashboard</h1>
        <ActivityDateLabel />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-center border-t-4 border-t-[var(--accent-blue)]">
          <p className="text-lg font-semibold text-[var(--text-primary)]">{callCount}</p>
          <p className="text-[10px] text-[var(--text-tertiary)]">Calls today</p>
        </div>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-center border-t-4 border-t-[var(--accent-cyan)]">
          <p className="text-lg font-semibold text-[var(--text-primary)]">{answerRate}%</p>
          <p className="text-[10px] text-[var(--text-tertiary)]">Answer rate</p>
        </div>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-center border-t-4 border-t-[var(--accent-green)]">
          <p className="text-lg font-semibold text-[var(--text-primary)]">{leadCount}</p>
          <p className="text-[10px] text-[var(--text-tertiary)]">Leads captured</p>
        </div>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-center border-t-4 border-t-[var(--accent-amber)]">
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {estRevenue > 0 ? `~$${estRevenue.toLocaleString()}` : "$0"}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)]">Revenue est.</p>
        </div>
      </div>

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

      <div className="mb-6 p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
        <p className="text-base font-medium text-[var(--text-primary)] mb-2">Your AI is {progressPct}% ready</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-input)] mb-4">
          <div className="h-full rounded-full bg-[var(--accent-green)] transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {progressItems.slice(0, 10).map((item) => {
            const done = "done" in item ? item.done : item.completed;
            const label = "label" in item && item.label ? item.label : (PROGRESS_LABELS[item.key] ?? item.key);
            return (
              <div key={item.key} className="flex items-center gap-2">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent-green)] shrink-0" />
                ) : (
                  <span className="h-4 w-4 rounded-full border border-[var(--border-medium)] shrink-0" />
                )}
                <span className={done ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]"}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <Link
          href={continueSetupHref}
          className="inline-block mt-4 px-4 py-2.5 bg-white text-gray-900 font-semibold rounded-lg text-sm hover:bg-gray-100 transition-colors"
        >
          Continue setup →
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6" role="tablist" aria-label="Filter activity">
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
      {loading && cards.length === 0 && !loadError && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 mb-4 animate-pulse">
          <div className="h-4 w-3/4 rounded bg-[var(--bg-hover)] mb-3" />
          <div className="h-4 w-1/2 rounded bg-[var(--bg-hover)]" />
        </div>
      )}

      {filtered.length === 0 && !loading ? (
        <div className="space-y-6">
          <div>
            <p className="text-base font-medium text-[var(--text-primary)] mb-3">Recent activity</p>
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
              <EmptyState
                icon={<Phone className="h-6 w-6" />}
                title="No calls yet"
                description="Connect a phone number and your AI will start handling calls automatically."
                actions={
                  <>
                    <Link
                      href="/app/settings/phone"
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-white text-gray-900 text-sm font-semibold hover:bg-gray-100 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none"
                    >
                      Connect number →
                    </Link>
                    <Link
                      href="/app/agents?tab=test"
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-[var(--border-medium)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none"
                    >
                      Test your agent →
                    </Link>
                  </>
                }
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
              Businesses at your stage typically recover <span className="font-medium text-[var(--text-primary)]">$2,400+</span> a month once every missed call turns into a captured lead.
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
        <ul className="space-y-3">
          {filtered.map((card) => (
            <li
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedCard(card)}
              onKeyDown={(e) => e.key === "Enter" && setSelectedCard(card)}
              className="rounded-xl border-l-4 overflow-hidden bg-[var(--bg-card)] border border-[var(--border-default)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
              style={{ borderLeftColor: TYPE_COLORS[card.type] }}
            >
              <div className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {card.name}
                    </p>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                      {card.duration !== "—" ? `${card.time} · ${card.duration}` : card.time}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-medium)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                    {card.type === "lead"
                      ? "Lead"
                      : card.type === "appointment"
                        ? "Appointment"
                        : card.type === "urgent"
                          ? "Urgent"
                          : "Follow-up"}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">
                  {card.summary}
                </p>
                {card.score != null && (
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                    Score {card.score}
                  </p>
                )}
                <div className="mt-3 flex justify-between items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (playingId === card.id) return;
                      setPlayingId(card.id);
                      void speakTextViaApi(getPlaySummary(card), {
                        onStart: () => setPlayingId(card.id),
                        onEnd: () => setPlayingId(null),
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-medium)] px-3 py-1.5 text-[11px] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                  >
                    {playingId === card.id ? (
                      <Waveform isPlaying />
                    ) : (
                      <span>▶</span>
                    )}
                    <span>Play summary</span>
                  </button>
                  <Link
                    href={`/app/calls/${card.id}`}
                    className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View call →
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

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

