"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { speakText } from "@/lib/voice-preview";
import { Waveform } from "@/components/Waveform";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

type Highlight = { id: string; caller: string; score: number; outcome: string };

function highlightSummary(c: Highlight): string {
  return `${c.caller} called. Lead score ${c.score}. Outcome: ${c.outcome}.`;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const DEMO_TREND = [2, 5, 3, 7, 4, 6, 4];
const DEMO_CALL_TYPES = [
  { name: "Inbound", value: 70, color: "#3b82f6" },
  { name: "Leads", value: 18, color: "#22c55e" },
  { name: "Appointments", value: 12, color: "#eab308" },
];

export default function AppAnalyticsPage() {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const activityStats = useMemo(() => {
    if (!mounted || typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("rt_activity_stats");
      if (!raw) return null;
      const d = JSON.parse(raw) as { calls?: number; leads?: number; estRevenue?: number };
      return { calls: d?.calls ?? 0, leads: d?.leads ?? 0, estRevenue: d?.estRevenue ?? 0 };
    } catch {
      return null;
    }
  }, [mounted]);

  const totalCalls = activityStats?.calls ?? 7;
  const leadsCaptured = activityStats?.leads ?? 3;
  const appointments = totalCalls >= 5 ? 2 : 1;
  const answerRate = totalCalls > 0 ? 100 : 0;
  const estRevenue = activityStats?.estRevenue ?? 2400;
  const timeSaved = totalCalls > 0 ? `${Math.round(totalCalls * 3.5)} mins` : "0 mins";
  const trendData = DAYS.map((day, i) => ({ day, calls: DEMO_TREND[i] ?? 0 }));
  const recentHighlights: Highlight[] = totalCalls > 0
    ? [
        { id: "h1", caller: "Mike Johnson", score: 85, outcome: "Lead · Booked" },
        { id: "h2", caller: "Sarah Chen", score: 0, outcome: "Appointment confirmed" },
        { id: "h3", caller: "James Wilson", score: 72, outcome: "Follow-up" },
      ]
    : [];
  const minutesUsed = totalCalls * 3;
  const minutesLimit = 200;
  const pct = minutesLimit > 0 ? Math.round((minutesUsed / minutesLimit) * 100) : 0;
  const returnMultiple = 97 > 0 ? (estRevenue / 97) : 0;

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
          <p className="text-sm font-medium text-white mb-4">Call volume (last 7 days)</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={{ stroke: "#3f3f46" }} />
                <YAxis hide domain={[0, "auto"]} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                  labelStyle={{ color: "#a1a1aa" }}
                  formatter={(value: number | undefined) => [value ?? 0, "calls"]}
                />
                <Line type="monotone" dataKey="calls" stroke="#fff" strokeWidth={2} dot={{ fill: "#27272a", stroke: "#fff" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <p className="text-sm font-medium text-white mb-4">Call types</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={DEMO_CALL_TYPES}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={56}
                  paddingAngle={2}
                  stroke="transparent"
                >
                  {DEMO_CALL_TYPES.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Legend layout="vertical" align="right" verticalAlign="middle" formatter={(value) => <span className="text-xs text-zinc-400">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
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
            <p className="text-lg font-bold text-emerald-400">{returnMultiple >= 1 ? `${returnMultiple.toFixed(1)}×` : "—"}</p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 mb-6">
        <p className="text-xs font-medium text-emerald-400 mb-1">Since you joined</p>
        <p className="text-sm text-zinc-300">
          {totalCalls} calls · {leadsCaptured} leads · {appointments} appointments · {timeSaved} saved · ${estRevenue} value · $97 cost
        </p>
      </div>

      <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-6">
        <p className="text-sm font-medium text-white mb-3">Weekly summary</p>
        <ul className="space-y-2 text-xs text-zinc-400">
          <li>· {totalCalls} calls answered this week</li>
          <li>· {leadsCaptured} new leads captured</li>
          <li>· {appointments} appointments booked</li>
          <li>· Est. revenue from leads: ${estRevenue.toLocaleString()}</li>
        </ul>
      </div>

      <p>
        <Link href="/app/activity" className="text-sm text-zinc-400 hover:text-white transition-colors">← Activity</Link>
      </p>
    </div>
  );
}
