"use client";

import { useState } from "react";
import Link from "next/link";

const MOCK_CAMPAIGNS = [
  { id: "1", name: "Lead follow-up", type: "Lead follow-up", status: "Active" as const },
  { id: "2", name: "Appointment reminders", type: "Reminders", status: "Scheduled" as const },
  { id: "3", name: "Reactivation — Q1", type: "Reactivation", status: "Draft" as const },
];

export default function AppCampaignsPage() {
  const [showWizard, setShowWizard] = useState(false);

  const statusColor = (s: string) =>
    s === "Active" ? "bg-green-500/20 text-green-400" : s === "Scheduled" ? "bg-amber-500/20 text-amber-400" : "bg-zinc-600/50 text-zinc-400";

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-lg font-semibold text-white">Campaigns</h1>
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-white text-black hover:bg-zinc-200"
        >
          + New Campaign
        </button>
      </div>
      <ul className="space-y-3">
        {MOCK_CAMPAIGNS.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <div>
              <p className="font-medium text-white">{c.name}</p>
              <p className="text-xs text-zinc-500">{c.type}</p>
            </div>
            <span className={`text-[10px] font-medium px-2 py-1 rounded ${statusColor(c.status)}`}>
              {c.status}
            </span>
          </li>
        ))}
      </ul>
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setShowWizard(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">New Campaign</h2>
            <p className="text-sm text-zinc-400 mb-4">Type: Lead follow-up, Reminders, Reactivation, Review requests, No-show, Custom. Then set audience, agent, schedule, and review.</p>
            <button type="button" onClick={() => setShowWizard(false)} className="w-full py-2 rounded-xl text-sm border border-zinc-600 text-zinc-300">
              Close
            </button>
          </div>
        </div>
      )}
      <p className="mt-6">
        <Link href="/app/activity" className="text-sm text-blue-400 hover:underline">← Activity</Link>
      </p>
    </div>
  );
}
