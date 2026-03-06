"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";

type Thread = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread: boolean;
  messages: Array<{ id: string; from: "ai" | "user"; text: string; time: string }>;
};

const DEMO_THREADS: Thread[] = [
  { id: "msg-demo-1", name: "Mike Johnson", preview: "Thanks, I'll be there at 10 AM.", time: "9:14 AM", unread: false, messages: [{ id: "m1", from: "ai", text: "Your 10 AM appointment is confirmed.", time: "9:12 AM" }, { id: "m2", from: "user", text: "Thanks, I'll be there at 10 AM.", time: "9:14 AM" }] },
  { id: "msg-demo-2", name: "Sarah Chen", preview: "See you Tuesday.", time: "Yesterday", unread: true, messages: [{ id: "m3", from: "ai", text: "Reminder: Dental cleaning Tue 9 AM.", time: "Yesterday" }, { id: "m4", from: "user", text: "See you Tuesday.", time: "Yesterday" }] },
];

export default function AppMessagesPage() {
  const [selected, setSelected] = useState<string | null>(DEMO_THREADS[0]?.id ?? null);
  const [input, setInput] = useState("");
  const [autoReply, setAutoReply] = useState(true);
  const [threads, setThreads] = useState<Thread[]>(DEMO_THREADS);

  const active = threads.find((t) => t.id === selected) ?? threads[0] ?? null;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-lg md:text-xl font-semibold text-white">Messages</h1>
        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <input
            id="auto-reply"
            type="checkbox"
            checked={autoReply}
            onChange={(e) => setAutoReply(e.target.checked)}
            className="accent-white"
          />
          <label htmlFor="auto-reply">Auto-reply enabled</label>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4 min-h-[420px]">
        <div className="md:w-72 shrink-0 border border-zinc-800 rounded-2xl bg-zinc-900/60 overflow-hidden">
          {threads.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-500">
              No conversations yet. Messages from your call activity will appear here.
            </div>
          ) : (
          threads.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              className={`w-full text-left px-3 py-3 border-b border-zinc-800 flex gap-2 items-start ${
                (active?.id ?? selected) === t.id ? "bg-zinc-900" : "hover:bg-zinc-900/60"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-[11px] font-medium text-white shrink-0">
                {t.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-white truncate">{t.name}</p>
                  <p className="text-[10px] text-zinc-500 shrink-0">{t.time}</p>
                </div>
                <p className="text-[11px] text-zinc-500 truncate">{t.preview}</p>
              </div>
              {t.unread && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-300 mt-2 shrink-0" />
              )}
            </button>
          ))
          )}
        </div>
        <div className="flex-1 border border-zinc-800 rounded-2xl bg-zinc-900/40 flex flex-col">
          {active ? (
            <>
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{active.name}</p>
                  <p className="text-[11px] text-zinc-500">SMS thread · AI confirmations and reminders</p>
                </div>
                <span className="text-[10px] text-zinc-500">2-way</span>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {active.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                        m.from === "user"
                          ? "bg-zinc-200 text-zinc-900 rounded-br-sm"
                          : "bg-zinc-800 text-zinc-100 rounded-bl-sm"
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                          {m.from === "user" ? active.name : <><Bot className="h-3 w-3" /> Agent</>}
                        </span>
                        <span className="text-[10px] text-zinc-500">{m.time}</span>
                      </div>
                      <p>{m.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-zinc-800 flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!input.trim()) return;
                      setThreads((prev) =>
                        prev.map((t) =>
                          t.id === active.id
                            ? {
                                ...t,
                                messages: [
                                  ...t.messages,
                                  {
                                    id: `new-${Date.now()}`,
                                    from: "user" as const,
                                    text: input.trim(),
                                    time: "Now",
                                  },
                                  ...(autoReply
                                    ? [
                                        {
                                          id: `auto-${Date.now()}`,
                                          from: "ai" as const,
                                          text: "Got it — your AI will keep this updated.",
                                          time: "Now",
                                        },
                                      ]
                                    : []),
                                ],
                                preview: input.trim(),
                                unread: false,
                              }
                            : t,
                        ),
                      );
                      setInput("");
                    }
                  }}
                  placeholder="Type a message…"
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!input.trim()}
                  onClick={() => {
                    if (!input.trim()) return;
                    setThreads((prev) =>
                      prev.map((t) =>
                        t.id === active.id
                          ? {
                              ...t,
                              messages: [
                                ...t.messages,
                                {
                                  id: `new-${Date.now()}`,
                                  from: "user" as const,
                                  text: input.trim(),
                                  time: "Now",
                                },
                                ...(autoReply
                                  ? [
                                      {
                                        id: `auto-${Date.now()}`,
                                        from: "ai" as const,
                                        text: "Got it — your AI will keep this updated.",
                                        time: "Now",
                                      },
                                    ]
                                  : []),
                              ],
                              preview: input.trim(),
                              unread: false,
                            }
                          : t,
                      ),
                    );
                    setInput("");
                  }}
                  className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-zinc-500">
              Select a conversation
            </div>
          )}
        </div>
      </div>
      <p className="mt-6">
        <Link href="/app/activity" className="text-sm text-zinc-400 hover:text-white transition-colors">
          ← Activity
        </Link>
      </p>
    </div>
  );
}
