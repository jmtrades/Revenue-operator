"use client";

import { useState } from "react";
import Link from "next/link";

const MOCK_CONTACTS = [
  { id: "1", name: "Mike Johnson", type: "Lead" as const, score: 92, lastInteraction: "Today, 9:14 AM", initials: "MJ" },
  { id: "2", name: "Sarah Chen", type: "Customer" as const, score: null, lastInteraction: "Today, 9:31 AM", initials: "SC" },
  { id: "3", name: "James Wilson", type: "Lead" as const, score: 88, lastInteraction: "Today, 10:02 AM", initials: "JW" },
];

type TabId = "all" | "leads" | "customers" | "vip";

export default function AppContactsPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabId>("all");
  const [sort, setSort] = useState("recent");

  const filtered = MOCK_CONTACTS.filter((c) => {
    const matchSearch = !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase());
    if (!matchSearch) return false;
    if (tab === "leads") return c.type === "Lead";
    if (tab === "customers") return c.type === "Customer";
    if (tab === "vip") return false;
    return true;
  });

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-4">Contacts</h1>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="search"
          placeholder="Search contacts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none text-sm"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-zinc-300 text-sm focus:outline-none"
        >
          <option value="recent">Most recent</option>
          <option value="name">Name</option>
          <option value="score">Score</option>
        </select>
      </div>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(["all", "leads", "customers", "vip"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap capitalize ${
              tab === t ? "bg-zinc-700 text-white" : "bg-zinc-800/50 text-zinc-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 py-12 px-6 text-center">
          <p className="text-sm text-zinc-400 mb-2">No contacts yet.</p>
          <p className="text-xs text-zinc-500">Contacts will appear here after calls and leads are captured.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50"
            >
              <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium text-white shrink-0">
                {c.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{c.name}</p>
                <p className="text-xs text-zinc-500">{c.lastInteraction}</p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${c.type === "Lead" ? "bg-blue-500/20 text-blue-400" : "bg-zinc-700 text-zinc-400"}`}>
                {c.type}
              </span>
              {c.score != null && (
                <div className="w-12 text-right">
                  <div className="h-1.5 w-full rounded-full bg-zinc-700 overflow-hidden">
                    <div className="h-full rounded-full bg-green-500" style={{ width: `${c.score}%` }} />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{c.score}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6">
        <Link href="/app/activity" className="text-sm text-zinc-400 hover:text-white transition-colors">← Activity</Link>
      </p>
    </div>
  );
}
