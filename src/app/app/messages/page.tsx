"use client";

import { useState } from "react";
import Link from "next/link";

const MOCK_THREADS = [
  { id: "1", name: "Mike Johnson", preview: "Thanks, booked for tomorrow 10 AM.", time: "9:14 AM", unread: true },
  { id: "2", name: "Sarah Chen", preview: "Your cleaning is confirmed for Tuesday 9 AM.", time: "9:31 AM", unread: false },
];

export default function AppMessagesPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="max-w-[800px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-4">Messages</h1>
      <div className="flex flex-col md:flex-row gap-4 min-h-[400px]">
        <div className="md:w-64 shrink-0 border border-zinc-800 rounded-xl bg-zinc-900/50 overflow-hidden">
          {MOCK_THREADS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              className={`w-full text-left p-3 border-b border-zinc-800 flex gap-2 items-start ${selected === t.id ? "bg-zinc-800/50" : ""}`}
            >
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-white shrink-0">
                {t.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{t.name}</p>
                <p className="text-xs text-zinc-500 truncate">{t.preview}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] text-zinc-500">{t.time}</p>
                {t.unread && <span className="inline-block w-2 h-2 rounded-full bg-zinc-400 mt-1" />}
              </div>
            </button>
          ))}
        </div>
        <div className="flex-1 border border-zinc-800 rounded-xl bg-zinc-900/30 p-4">
          {selected ? (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">Chat with {MOCK_THREADS.find((t) => t.id === selected)?.name}</p>
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-3 py-2 bg-zinc-800 text-sm text-zinc-200">
                  Thanks for calling. You’re booked for tomorrow at 10 AM.
                </div>
              </div>
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-lg px-3 py-2 bg-zinc-700 text-sm text-white">
                  Great, thank you!
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 flex items-center justify-center h-full">Select a conversation</p>
          )}
        </div>
      </div>
      <p className="mt-6">
        <Link href="/app/activity" className="text-sm text-zinc-400 hover:text-white transition-colors">← Activity</Link>
      </p>
    </div>
  );
}
