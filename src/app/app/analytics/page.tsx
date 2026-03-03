"use client";

import { useState } from "react";
import Link from "next/link";

const METRICS = [
  { label: "Total calls", value: "47" },
  { label: "Answer rate", value: "100%" },
  { label: "Leads captured", value: "12" },
  { label: "Appointments booked", value: "8" },
  { label: "Revenue recovered", value: "$2,400" },
  { label: "Time saved", value: "~6 hrs" },
];

export default function AppAnalyticsPage() {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const minutesUsed = 87;
  const minutesLimit = 200;
  const pct = Math.round((minutesUsed / minutesLimit) * 100);

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-lg font-semibold text-white">Analytics</h1>
        <div className="flex gap-2">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${range === r ? "bg-white text-black" : "bg-zinc-800 text-zinc-400"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {METRICS.map((m) => (
          <div key={m.label} className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 text-center">
            <p className="text-lg font-semibold text-white">{m.value}</p>
            <p className="text-[10px] text-zinc-500">{m.label}</p>
          </div>
        ))}
      </div>
      <div className="mb-6 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
        <p className="text-sm font-medium text-white mb-2">Usage</p>
        <p className="text-xs text-zinc-500 mb-2">{minutesUsed}/{minutesLimit} min used ({pct}%)</p>
        <div className="h-2 rounded-full bg-zinc-700 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: pct >= 80 ? "#ef4444" : pct >= 50 ? "#eab308" : "#22c55e",
            }}
          />
        </div>
        {pct >= 80 && (
          <p className="text-xs text-amber-400 mt-2">Upgrade to Growth for more minutes.</p>
        )}
      </div>
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 mb-4">
        <p className="text-sm font-medium text-white mb-2">ROI this month</p>
        <p className="text-sm text-zinc-400">
          Calls answered: 47. Leads: 12. Appointments: 8. Est. value: $2,400. Your cost: $97. Return: ~25x.
        </p>
      </div>
      <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/5 mb-6">
        <p className="text-xs font-medium text-green-400 mb-2">Since you joined</p>
        <p className="text-sm text-zinc-300">
          47 calls answered · 12 leads captured · 8 appointments booked · ~6 hrs saved · Est. value: $2,400 · Your cost: $97 · Net ROI: 25x
        </p>
      </div>
      <p>
        <Link href="/app/activity" className="text-sm text-zinc-400 hover:text-white transition-colors">← Activity</Link>
      </p>
    </div>
  );
}
