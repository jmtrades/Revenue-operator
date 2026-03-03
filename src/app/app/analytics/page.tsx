"use client";

import { useState } from "react";
import Link from "next/link";
import { speakText } from "@/lib/voice-preview";
import { Waveform } from "@/components/Waveform";

type Highlight = { id: string; caller: string; score: number; outcome: string };

function highlightSummary(c: Highlight): string {
  return `${c.caller} called. Lead score ${c.score}. Outcome: ${c.outcome}.`;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export default function AppAnalyticsPage() {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [playingId, setPlayingId] = useState<string | null>(null);

  const totalCalls = 0;
  const leadsCaptured = 0;
  const appointments = 0;
  const answerRate = totalCalls > 0 ? 100 : 0;
  const estRevenue = 0;
  const timeSaved = "0 hrs";
  const dailyCalls = DAYS.map((day) => ({ day, count: 0 }));
  const maxCalls = Math.max(1, ...dailyCalls.map((d) => d.count));
  const recentHighlights: Highlight[] = [];
  const minutesUsed = 0;
  const minutesLimit = 200;
  const pct = minutesLimit > 0 ? Math.round((minutesUsed / minutesLimit) * 100) : 0;

  const metrics = [
    { label: "Total calls", value: String(totalCalls), trend: "", icon: "📞" as const },
    { label: "Answer rate", value: `${answerRate}%`, trend: "", icon: "✓" as const },
    { label: "Leads captured", value: String(leadsCaptured), trend: "", icon: "🎯" as const },
    { label: "Appointments", value: String(appointments), trend: "", icon: "📅" as const },
    { label: "Revenue", value: estRevenue > 0 ? `$${estRevenue.toLocaleString()}` : "$0", trend: "", icon: "💰" as const },
    { label: "Time saved", value: timeSaved, trend: "", icon: "⏱" as const },
  ];

  return (
    <div className="max-w-[640px] mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-lg font-semibold text-white">Analytics</h1>
        <div className="flex gap-1 p-0.5 rounded-xl bg-zinc-800/50 border border-zinc-800">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${range === r ? "bg-white text-black" : "text-zinc-400 hover:text-zinc-300"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {metrics.map((m) => (
          <div key={m.label} className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-base">{m.icon}</span>
              {m.trend ? <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">{m.trend}</span> : null}
            </div>
            <p className="text-xl font-bold text-white">{m.value}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <p className="text-sm font-medium text-white mb-4">Call volume</p>
          <div className="flex items-end gap-1.5 h-24">
            {dailyCalls.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-md bg-zinc-700/50 relative overflow-hidden" style={{ height: `${(d.count / maxCalls) * 100}%`, minHeight: 4 }}>
                  <div className="absolute inset-0 bg-white/20 rounded-t-md" />
                </div>
                <span className="text-[9px] text-zinc-500">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <p className="text-sm font-medium text-white mb-4">Call types</p>
          <div className="space-y-3">
            {[
              { label: "Inbound", pct: totalCalls > 0 ? 100 : 0, color: "#3B82F6" as const },
              { label: "Follow-up", pct: 0, color: "#A855F7" as const },
              { label: "Appointment", pct: 0, color: "#22C55E" as const },
            ].map((t) => (
              <div key={t.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-400">{t.label}</span>
                  <span className="text-xs font-medium text-zinc-300">{t.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${t.pct}%`, background: t.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-white">Usage</p>
          <p className="text-xs text-zinc-500">{minutesUsed}/{minutesLimit} min</p>
        </div>
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: pct >= 80 ? "#ef4444" : pct >= 50 ? "#eab308" : "#22c55e",
            }}
          />
        </div>
        <p className="text-[11px] text-zinc-500 mt-2">{pct}% of monthly limit</p>
      </div>

      <div className="mb-6 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
        <p className="text-sm font-medium text-white mb-3">Recent Highlights</p>
        {recentHighlights.length === 0 ? (
          <p className="text-xs text-zinc-500">No call highlights yet. Connect your phone to see activity here.</p>
        ) : (
          <div className="space-y-3">
            {recentHighlights.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 border border-zinc-800"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (playingId === c.id) return;
                    setPlayingId(c.id);
                    speakText(highlightSummary(c), { onEnd: () => setPlayingId(null) });
                  }}
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 text-white text-xs"
                  aria-label={`Play summary for ${c.caller}`}
                >
                  {playingId === c.id ? <Waveform isPlaying /> : <span>▶</span>}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{c.caller}</p>
                  <p className="text-[11px] text-zinc-500">Score {c.score} · {c.outcome}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-4">
        <p className="text-sm font-semibold text-white mb-3">ROI this month</p>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xl font-bold text-white">{totalCalls}</p>
            <p className="text-[10px] text-zinc-500">Calls</p>
          </div>
          <div>
            <p className="text-xl font-bold text-white">{leadsCaptured}</p>
            <p className="text-[10px] text-zinc-500">Leads</p>
          </div>
          <div>
            <p className="text-xl font-bold text-white">{appointments}</p>
            <p className="text-[10px] text-zinc-500">Booked</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
          <div>
            <p className="text-xs text-zinc-400">Est. value</p>
            <p className="text-lg font-bold text-white">${estRevenue.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-zinc-400">Your cost</p>
            <p className="text-lg font-bold text-white">$97</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">Return</p>
            <p className="text-lg font-bold text-emerald-400">{estRevenue > 0 ? "—" : "0×"}</p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 mb-6">
        <p className="text-xs font-medium text-emerald-400 mb-1">Since you joined</p>
        <p className="text-sm text-zinc-300">
          {totalCalls} calls · {leadsCaptured} leads · {appointments} appointments · {timeSaved} saved · ${estRevenue} value · $97 cost
        </p>
      </div>

      <p>
        <Link href="/app/activity" className="text-sm text-zinc-400 hover:text-white transition-colors">← Activity</Link>
      </p>
    </div>
  );
}
