"use client";

import { useState } from "react";
import Link from "next/link";

const MOCK_APPOINTMENTS = [
  { id: "1", title: "Mike J. — Plumbing", time: "10:00 AM", status: "confirmed" as const },
  { id: "2", title: "Sarah C. — Cleaning", time: "2:00 PM", status: "pending" as const },
  { id: "3", title: "James W. — Roof estimate", time: "3:00 PM", status: "confirmed" as const },
];

export default function AppCalendarPage() {
  const [view, setView] = useState<"week" | "month">("week");

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-lg font-semibold text-white">Calendar</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView("week")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${view === "week" ? "bg-white text-black" : "bg-zinc-800 text-zinc-400"}`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setView("month")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${view === "month" ? "bg-white text-black" : "bg-zinc-800 text-zinc-400"}`}
          >
            Month
          </button>
        </div>
      </div>
      <div className="mb-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
        <p className="text-xs text-zinc-500 mb-2">8 AM – 8 PM · {view === "week" ? "This week" : "This month"}</p>
        <div className="space-y-2">
          {MOCK_APPOINTMENTS.map((a) => (
            <div
              key={a.id}
              className={`flex items-center gap-2 p-2 rounded-lg border-l-4 ${
                a.status === "confirmed" ? "border-green-500 bg-green-500/10" : "border-amber-500 bg-amber-500/10"
              }`}
            >
              <span className="text-xs text-zinc-500 w-14 shrink-0">{a.time}</span>
              <span className="text-sm text-white">{a.title}</span>
            </div>
          ))}
        </div>
      </div>
      <button type="button" className="w-full py-2 rounded-xl text-sm border border-zinc-600 text-zinc-300 mb-4">
        + Block time
      </button>
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 mb-6">
        <p className="text-sm font-medium text-white mb-1">Connect Google Calendar</p>
        <p className="text-xs text-zinc-500 mb-2">Sync availability and appointments.</p>
        <button type="button" className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-black">Connect</button>
      </div>
      <p>
        <Link href="/app/activity" className="text-sm text-zinc-400 hover:text-white transition-colors">← Activity</Link>
      </p>
    </div>
  );
}
