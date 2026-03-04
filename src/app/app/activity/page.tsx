"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { speakText } from "@/lib/voice-preview";
import { Waveform } from "@/components/Waveform";
import { Skeleton } from "@/components/ui/Skeleton";

type ActivityCard = {
  id: string;
  type: "lead" | "appointment" | "follow-up" | "urgent";
  name: string;
  time: string;
  duration: string;
  summary: string;
  score: number | null;
};

const TYPE_COLORS: Record<string, string> = {
  lead: "#3B82F6",
  appointment: "#22C55E",
  "follow-up": "#A855F7",
  urgent: "#EF4444",
};

const TYPE_LABELS: Record<string, string> = {
  lead: "Lead",
  appointment: "Appointment",
  "follow-up": "Follow-up",
  urgent: "Urgent",
};

type FilterId = "all" | "needs_action" | "leads" | "appointments" | "urgent";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs_action", label: "Needs action" },
  { id: "leads", label: "Leads" },
  { id: "appointments", label: "Appointments" },
  { id: "urgent", label: "Urgent" },
];

const DEMO_CARDS: ActivityCard[] = [
  { id: "demo-1", type: "lead", name: "Mike Johnson", time: "9:14 AM", duration: "2:34", summary: "Kitchen sink leak — qualified lead", score: 85 },
  { id: "demo-2", type: "appointment", name: "Sarah Chen", time: "9:31 AM", duration: "1:58", summary: "Dental cleaning — Dr. Martinez", score: null },
  { id: "demo-3", type: "follow-up", name: "James Wilson", time: "10:02 AM", duration: "3:12", summary: "Roof estimate — storm damage", score: null },
  { id: "demo-4", type: "urgent", name: "Emergency", time: "10:45 AM", duration: "0:48", summary: "Water heater leaking — owner alerted", score: null },
  { id: "demo-5", type: "lead", name: "Lisa Park", time: "11:20 AM", duration: "2:01", summary: "Bathroom remodel quote", score: 72 },
  { id: "demo-6", type: "lead", name: "David Kim", time: "11:52 AM", duration: "1:45", summary: "AC tune-up inquiry", score: 68 },
  { id: "demo-7", type: "appointment", name: "Maria Santos", time: "12:10 PM", duration: "2:20", summary: "Annual checkup — Thu 4 PM", score: null },
];

function getPlaySummary(card: ActivityCard): string {
  const name = card.name;
  const summary = card.summary;
  if (card.type === "lead") return `${name} called. ${summary}. Lead qualified${card.score != null ? `, score ${card.score}` : ""}. Call ended.`;
  if (card.type === "appointment") return `${name} called. ${summary}. Appointment confirmed. Call ended.`;
  if (card.type === "follow-up") return `${name} — ${summary}. Follow-up completed. Call ended.`;
  if (card.type === "urgent") return `Emergency call from ${name}. ${summary}. Owner alerted. Call ended.`;
  return `${name} — ${summary}. Call ended.`;
}

export default function AppActivityPage() {
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<FilterId>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<ActivityCard | null>(null);
  const [cards, _setCards] = useState<ActivityCard[]>(DEMO_CARDS);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

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
        lastActivityAt = typeof d.lastActivityAt === "number" ? d.lastActivityAt : undefined;
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
        })
      );
    } catch {
      // ignore
    }
  }, [mounted, callCount, leadCount, estRevenue]);

  let showInactivityBanner = false;
  if (mounted && typeof window !== "undefined") {
    try {
      if (localStorage.getItem("rt_show_inactivity_banner") === "true") showInactivityBanner = true;
      else {
        const raw = localStorage.getItem("rt_activity_stats");
        if (raw) {
          const d = JSON.parse(raw) as { lastActivityAt?: number };
          const last = typeof d.lastActivityAt === "number" ? d.lastActivityAt : null;
          if (last != null && Date.now() - last > 3 * 24 * 60 * 60 * 1000) showInactivityBanner = true;
        }
      }
    } catch {
      // ignore
    }
  }

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

  const filtered =
    filter === "all"
      ? cards
      : filter === "leads"
        ? cards.filter((c) => c.type === "lead")
        : filter === "appointments"
          ? cards.filter((c) => c.type === "appointment")
          : filter === "urgent"
            ? cards.filter((c) => c.type === "urgent")
            : filter === "needs_action"
              ? cards.filter((c) => c.type === "lead" || c.type === "urgent")
              : cards;

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="text-lg font-semibold text-white">Activity</h1>
        <span className="text-xs text-zinc-500">
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
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
          <p className="text-lg font-semibold text-white">{estRevenue > 0 ? `~$${estRevenue.toLocaleString()}` : "$0"}</p>
          <p className="text-[10px] text-zinc-500">Est. revenue</p>
        </div>
      </div>

      {showInactivityBanner && (
        <div className="mb-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-200">
            No calls in the last 3+ days. Is your number forwarded?
          </p>
          <Link href="/app/settings/phone" className="inline-block mt-2 text-xs font-medium text-amber-400 hover:text-amber-300 underline">
            Check setup →
          </Link>
        </div>
      )}

      {cards.length > 0 && cards.every((c) => c.id.startsWith("demo-")) && (
        <div className="mb-4 p-3 rounded-xl border border-zinc-700 bg-zinc-800/50">
          <p className="text-xs text-zinc-400">Sample activity. Connect your number in Settings to see real calls.</p>
        </div>
      )}

      <div className="mb-6 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">🎉</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Welcome! Complete your setup for the best experience.</p>
            <p className="text-xs text-zinc-500 mt-1">Connect your phone number to start receiving real calls.</p>
            <Link href="/app/onboarding" className="inline-block mt-3 px-4 py-2 bg-white text-black text-xs font-semibold rounded-xl hover:bg-zinc-100 transition-colors">
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
              filter === f.id ? "bg-zinc-700 text-white" : "bg-zinc-800/50 text-zinc-400"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-sm font-medium text-white">No calls yet</p>
          <p className="text-xs text-zinc-500 mt-1">Connect your phone number in Settings to see call activity here.</p>
          <Link href="/app/settings/phone" className="inline-block mt-4 px-4 py-2 rounded-xl border border-zinc-600 text-zinc-300 text-sm hover:border-zinc-500">
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
              style={{ borderLeftColor: TYPE_COLORS[card.type] ?? "#71717a" }}
            >
              <div className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: TYPE_COLORS[card.type] ?? "#71717a" }}
                  >
                    {TYPE_LABELS[card.type] ?? card.type}
                  </span>
                  <span className="text-[10px] text-zinc-500">{card.time}</span>
                </div>
                <p className="text-sm font-medium mt-1 text-white">{card.name}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{card.summary}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[10px] text-zinc-500">{card.duration}</span>
                  {card.score != null && (
                    <span className="text-[10px] text-zinc-500">Score: {card.score}</span>
                  )}
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
                    className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    aria-label="Play call summary"
                  >
                    {playingId === card.id ? <Waveform isPlaying /> : <span>▶</span>}
                    <span>{playingId === card.id ? "Playing…" : "Listen"}</span>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selectedCard && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            aria-hidden
            onClick={() => setSelectedCard(null)}
          />
          <div
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-950 border-l border-zinc-800 z-50 p-6 overflow-y-auto"
            role="dialog"
            aria-label="Call details"
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-white">Call details</h2>
              <button
                type="button"
                onClick={() => setSelectedCard(null)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div
              className="rounded-xl border-l-4 p-4 mb-4"
              style={{ borderLeftColor: TYPE_COLORS[selectedCard.type] ?? "#71717a" }}
            >
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: TYPE_COLORS[selectedCard.type] ?? "#71717a" }}
              >
                {TYPE_LABELS[selectedCard.type] ?? selectedCard.type}
              </span>
              <p className="text-base font-medium mt-1 text-white">{selectedCard.name}</p>
              <p className="text-sm text-zinc-400 mt-1">{selectedCard.summary}</p>
              <p className="text-xs text-zinc-500 mt-2">{selectedCard.time} · {selectedCard.duration}</p>
              {selectedCard.score != null && (
                <p className="text-xs text-zinc-500 mt-1">Lead score: {selectedCard.score}</p>
              )}
            </div>
            <p className="text-sm text-zinc-400">{getPlaySummary(selectedCard)}</p>
            <button
              type="button"
              onClick={() => {
                if (playingId === selectedCard.id) return;
                setPlayingId(selectedCard.id);
                speakText(getPlaySummary(selectedCard), {
                  onEnd: () => setPlayingId(null),
                });
              }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:border-zinc-600"
            >
              {playingId === selectedCard.id ? <Waveform isPlaying /> : <span>▶</span>}
              {playingId === selectedCard.id ? "Playing…" : "Play summary"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
