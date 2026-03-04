"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { speakText } from "@/lib/voice-preview";
import { Waveform } from "@/components/Waveform";
import { Skeleton } from "@/components/ui/Skeleton";
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

export default function AppActivityPage() {
  const { workspaceId } = useWorkspace();
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<FilterId>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<ActivityCard | null>(null);
  const [cards, setCards] = useState<ActivityCard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
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
      })
      .catch(() => {
        setCards([]);
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const callCount = cards.length;
  const leadCount = cards.filter((c) => c.type === "lead").length;
  const estRevenue = leadCount * 800;
  const answerRate = callCount > 0 ? 100 : 0;

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try {
      const prev = localStorage.getItem("rt_activity_stats");
      let lastActivityAt: number | undefined;
      if (prev) {
        const d = JSON.parse(prev) as { lastActivityAt?: number };
        lastActivityAt =
          typeof d.lastActivityAt === "number" ? d.lastActivityAt : undefined;
      }
      if (callCount > 0) lastActivityAt = Date.now();
      localStorage.setItem(
        "rt_activity_stats",
        JSON.stringify({
          calls: callCount,
          leads: leadCount,
          estRevenue,
          minutesUsed: 0,
          minutesLimit: 400,
          lastActivityAt: lastActivityAt ?? undefined,
        }),
      );
    } catch {
      // ignore
    }
  }, [mounted, callCount, leadCount, estRevenue]);

  let showInactivityBanner = false;
  if (mounted && typeof window !== "undefined") {
    try {
      if (localStorage.getItem("rt_show_inactivity_banner") === "true")
        showInactivityBanner = true;
      else {
        const raw = localStorage.getItem("rt_activity_stats");
        if (raw) {
          const d = JSON.parse(raw) as { lastActivityAt?: number };
          const last =
            typeof d.lastActivityAt === "number" ? d.lastActivityAt : null;
          if (last != null && Date.now() - last > 3 * 24 * 60 * 60 * 1000)
            showInactivityBanner = true;
        }
      }
    } catch {
      // ignore
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

  if (!mounted) {
    return (
      <div className="max-w-[600px] mx-auto p-4 md:p-6">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton lines={5} className="h-20" />
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="text-lg font-semibold text-white">Activity</h1>
        <span className="text-xs text-zinc-500">
          {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
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
          <span className="text-2xl shrink-0">🎉</span>
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
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-2.5 text-center">
          <span className="text-sm">✓</span>
          <p className="text-[10px] text-green-400 mt-0.5">First call</p>
        </div>
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-2.5 text-center">
          <span className="text-sm">💰</span>
          <p className="text-[10px] text-green-400 mt-0.5">Lead captured</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-center">
          <span className="text-sm">📅</span>
          <p className="text-[10px] text-emerald-400 mt-0.5">Appt booked</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              filter === f.id
                ? "bg-zinc-700 text-white"
                : "bg-zinc-800/50 text-zinc-400"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-500 mb-4">
          Loading recent activity…
        </div>
      )}

      {filtered.length === 0 && !loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-sm font-medium text-white">No calls yet</p>
          <p className="text-xs text-zinc-500 mt-1">
            Connect your phone number in Settings to see call activity here.
          </p>
          <Link
            href="/app/settings/phone"
            className="inline-block mt-4 px-4 py-2 rounded-xl border border-zinc-600 text-zinc-300 text-sm hover:border-zinc-500"
          >
            Settings → Phone
          </Link>
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
                      speakText(getPlaySummary(card), {
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

