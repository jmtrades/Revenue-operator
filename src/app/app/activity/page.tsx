"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const DEMO_CARDS = [
  {
    id: "1",
    type: "lead" as const,
    name: "Mike Johnson",
    time: "9:14 AM",
    duration: "4:32",
    summary: "Kitchen sink leak — 742 Elm St — Booked tomorrow 10 AM",
    score: 92,
  },
  {
    id: "2",
    type: "appointment" as const,
    name: "Sarah Chen",
    time: "9:31 AM",
    duration: "2:15",
    summary: "Dental cleaning — Tuesday 9 AM Dr. Martinez",
    score: null,
  },
  {
    id: "3",
    type: "follow-up" as const,
    name: "James Wilson",
    time: "10:02 AM",
    duration: "3:05",
    summary: "Roof estimate — Storm damage — Tomorrow 3 PM",
    score: null,
  },
  {
    id: "4",
    type: "urgent" as const,
    name: "Emergency",
    time: "10:17 AM",
    duration: "1:52",
    summary: "Pipe burst — 88 Oak Ave — Owner notified immediately",
    score: null,
  },
  {
    id: "5",
    type: "lead" as const,
    name: "Lisa Park",
    time: "10:44 AM",
    duration: "2:38",
    summary: "AC repair quote — Scheduled callback 2 PM",
    score: null,
  },
];

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
  { id: "needs_action", label: "Needs Action" },
  { id: "leads", label: "Leads" },
  { id: "appointments", label: "Appointments" },
  { id: "urgent", label: "Urgent" },
];

export default function AppActivityPage() {
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<FilterId>("all");

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-16 w-64 bg-zinc-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  const filtered =
    filter === "all"
      ? DEMO_CARDS
      : filter === "leads"
        ? DEMO_CARDS.filter((c) => c.type === "lead")
        : filter === "appointments"
          ? DEMO_CARDS.filter((c) => c.type === "appointment")
          : filter === "urgent"
            ? DEMO_CARDS.filter((c) => c.type === "urgent")
            : filter === "needs_action"
              ? DEMO_CARDS.filter((c) => c.type === "lead" || c.type === "urgent")
              : DEMO_CARDS;

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="text-lg font-semibold text-white">Activity</h1>
        <span className="text-xs text-zinc-500">
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-6">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5 text-center">
          <p className="text-lg font-semibold text-white">7</p>
          <p className="text-[10px] text-zinc-500">Calls today</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5 text-center">
          <p className="text-lg font-semibold text-white">100%</p>
          <p className="text-[10px] text-zinc-500">Answer rate</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5 text-center">
          <p className="text-lg font-semibold text-white">3</p>
          <p className="text-[10px] text-zinc-500">New leads</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5 text-center">
          <p className="text-lg font-semibold text-white">$2,400</p>
          <p className="text-[10px] text-zinc-500">Est. revenue</p>
        </div>
      </div>

      {/* Inactivity banner: show when no calls for 3+ days (set rt_show_inactivity_banner=true to test) */}
      {typeof window !== "undefined" && typeof localStorage !== "undefined" && localStorage.getItem("rt_show_inactivity_banner") === "true" && (
        <div className="mb-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-200">
            Your AI hasn&apos;t received any calls yet. Is your number forwarded?
          </p>
          <Link href="/app/settings/phone" className="inline-block mt-2 text-xs font-medium text-amber-400 hover:text-amber-300 underline">
            Check setup →
          </Link>
        </div>
      )}

      {/* Milestone cards */}
      <ul className="space-y-2 mb-6">
        <li className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 flex items-center gap-2">
          <span className="text-lg">🎉</span>
          <span className="text-sm text-green-200">First call answered!</span>
        </li>
        <li className="rounded-xl border border-zinc-600 bg-zinc-800/50 p-3 flex items-center gap-2">
          <span className="text-lg">💰</span>
          <span className="text-sm text-green-500">First lead captured!</span>
        </li>
        <li className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-2">
          <span className="text-lg">📅</span>
          <span className="text-sm text-emerald-200">First appointment booked!</span>
        </li>
      </ul>

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

      <ul className="space-y-3">
        {filtered.map((card) => (
          <li
            key={card.id}
            className="rounded-xl border-l-4 overflow-hidden bg-zinc-900/50 border-zinc-800"
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
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
