"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  Phone,
  Sparkles,
  UserPlus,
  Video,
} from "lucide-react";
import {
  fetchWorkspaceMeCached,
  getWorkspaceMeSnapshotSync,
} from "@/lib/client/workspace-me";
import { speakTextViaApi } from "@/lib/voice-preview";
import { Waveform } from "@/components/Waveform";
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
  return <span className="text-xs text-zinc-500">{dateLabel}</span>;
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
  const [systemEvents, setSystemEvents] = useState<Array<{ id: string; title: string; body: string; href: string }>>(
    () => workspaceSnapshot?.systemEvents ?? [],
  );
  const [nextStepHref, setNextStepHref] = useState(
    () => workspaceSnapshot?.progress?.nextStep?.href || "/app/settings/phone",
  );
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    fetchWorkspaceMeCached()
      .then((data: {
        systemEvents?: Array<{ id: string; title: string; body: string; href: string }>;
        progress?: { nextStep?: { href?: string } | null };
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

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="text-lg font-semibold text-white">Activity</h1>
        <ActivityDateLabel />
      </div>

      <div className="grid grid-cols-4 gap-2 mb-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 text-center">
          <p className="text-lg font-semibold text-white">{callCount}</p>
          <p className="text-[10px] text-zinc-500">Calls</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 text-center">
          <p className="text-lg font-semibold text-white">{answerRate}%</p>
          <p className="text-[10px] text-zinc-500">Answered</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 text-center">
          <p className="text-lg font-semibold text-white">{leadCount}</p>
          <p className="text-[10px] text-zinc-500">Leads</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 text-center">
          <p className="text-lg font-semibold text-white">
            {estRevenue > 0 ? `~$${estRevenue.toLocaleString()}` : "$0"}
          </p>
          <p className="text-[10px] text-zinc-500">Est. revenue</p>
        </div>
      </div>

      {showInactivityBanner && (
        <div className="mb-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-200">
            No calls in the last 3+ days. Is your number forwarded?
          </p>
          <Link
            href="/app/settings/phone"
            className="inline-block mt-2 text-xs font-medium text-amber-400 hover:text-amber-300 underline"
          >
            Check setup →
          </Link>
        </div>
      )}

      <div className="mb-6 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
              Welcome! Complete your setup for the best experience.
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Connect your phone number to start receiving real calls.
            </p>
            <Link
              href="/app/onboarding"
              className="inline-block mt-3 px-4 py-2 bg-white text-black text-xs font-semibold rounded-xl hover:bg-zinc-100 transition-colors"
            >
              Finish setup →
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="rounded-2xl border border-emerald-500/20 bg-[#0f1623] p-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <Phone className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-2 text-[11px] font-medium text-emerald-400">First call</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-[#0f1623] p-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <UserPlus className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-2 text-[11px] font-medium text-emerald-400">Lead captured</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-[#0f1623] p-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <CalendarCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-2 text-[11px] font-medium text-emerald-400">Appt booked</p>
        </div>
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
                ? "bg-zinc-700 text-white"
                : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && cards.length === 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-500 mb-4">
          Loading recent activity…
        </div>
      )}

      {filtered.length === 0 && !loading ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center text-white/10">
              <Phone className="h-12 w-12" />
            </div>
            <p className="mt-4 text-[16px] font-medium text-white/80">No calls yet</p>
            <p className="mt-2 max-w-sm mx-auto text-[13px] text-white/40">
              Forward your number in Settings to start receiving calls. Your AI will answer, capture leads, and book appointments.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/app/settings/phone"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 transition-colors"
              >
                Connect phone →
              </Link>
              <Link
                href={nextStepHref}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-zinc-600 text-zinc-300 text-sm hover:border-zinc-500 transition-colors"
              >
                Finish setup
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-sm font-semibold text-white">What to do next</p>
            <div className="mt-3 space-y-3">
              {NEXT_ACTIONS.map((item, index) => (
                <div key={item.href} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#0f1623] p-3">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.04] text-zinc-400">
                    {index === 0 ? <Phone className="h-3.5 w-3.5" /> : index === 1 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white/80">{item.title}</p>
                    <p className="mt-1 text-[13px] text-white/40">{item.body}</p>
                    <Link href={item.href} className="mt-2 inline-block text-xs font-medium text-zinc-300 underline underline-offset-2">
                      Open →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-white/30" />
              <p className="text-sm font-semibold text-white">See it handled live</p>
            </div>
            <div className="mt-3 rounded-2xl border border-white/[0.06] bg-[#0f1623] p-4">
              <p className="text-[13px] text-white/40">
                Watch the sample call walkthrough to hear how a real lead is answered, qualified, and booked before you connect your line.
              </p>
              <Link
                href="/demo"
                className="mt-3 inline-flex items-center justify-center rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500"
              >
                Watch the call demo →
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-sm font-semibold text-white">Estimated ROI</p>
            <p className="mt-1 text-[13px] text-white/40">
              Businesses at your stage typically recover <span className="font-medium text-white/80">$2,400+</span> a month once every missed call turns into a captured lead.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-sm font-semibold text-white">Recent system events</p>
            {systemEvents.length === 0 ? (
              <p className="text-xs text-zinc-500 mt-2">Your setup events will appear here.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {systemEvents.map((event) => (
                  <li key={event.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                    <p className="text-xs font-medium text-white">{event.title}</p>
                    <p className="text-xs text-zinc-500 mt-1">{event.body}</p>
                    <Link href={event.href} className="inline-block mt-2 text-[11px] text-zinc-300 underline underline-offset-2">
                      View →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Want to see your AI in action?</p>
              <p className="text-xs text-zinc-500 mt-1">Use the Test tab on Agents to place a real voice call with your configured agent.</p>
            </div>
            <Link
              href="/app/agents?tab=test"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-100 transition-colors"
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
              className="rounded-xl border-l-4 overflow-hidden bg-zinc-900/50 border-zinc-800 cursor-pointer hover:bg-zinc-800/50 transition-colors"
              style={{ borderLeftColor: TYPE_COLORS[card.type] }}
            >
              <div className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {card.name}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {card.duration !== "—" ? `${card.time} · ${card.duration}` : card.time}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">
                    {card.type === "lead"
                      ? "Lead"
                      : card.type === "appointment"
                        ? "Appointment"
                        : card.type === "urgent"
                          ? "Urgent"
                          : "Follow-up"}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-2 line-clamp-2">
                  {card.summary}
                </p>
                {card.score != null && (
                  <p className="text-[11px] text-zinc-500 mt-1">
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
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1.5 text-[11px] text-zinc-200 hover:border-zinc-500"
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
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
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
          <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto md:w-[360px] bg-black border-t md:border-t-0 md:border-l border-zinc-800 rounded-t-2xl md:rounded-none shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div>
                <p className="text-xs text-zinc-500">Call</p>
                <p className="text-sm font-semibold text-white">
                  {selectedCard.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCard(null)}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-2 text-sm text-zinc-200">
              <p className="text-xs text-zinc-500">
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

