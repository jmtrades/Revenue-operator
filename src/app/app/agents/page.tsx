"use client";

import { useState } from "react";
import Link from "next/link";

const DEFAULT_AGENT = { id: "1", name: "Sarah", role: "Receptionist", voice: "Warm Female", status: "Active" as const };

export default function AppAgentsPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-lg font-semibold text-white">Agents</h1>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-white text-black hover:bg-zinc-200"
        >
          + Create Agent
        </button>
      </div>
      <div className="grid gap-4">
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="font-medium text-white">{DEFAULT_AGENT.name}</p>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-green-500/20 text-green-400">
              {DEFAULT_AGENT.status}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mb-1">Template: {DEFAULT_AGENT.role}</p>
          <p className="text-xs text-zinc-500">Voice: {DEFAULT_AGENT.voice}</p>
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setShowModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Create Agent</h2>
            <p className="text-sm text-zinc-400 mb-4">Choose a template: Inbound Receptionist, After-Hours, Emergency, Follow-up, Reminder, Reactivation.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm border border-zinc-600 text-zinc-300">
                Cancel
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm bg-white text-black font-medium">
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      <p className="mt-6">
        <Link href="/app/activity" className="text-sm text-blue-400 hover:underline">← Activity</Link>
      </p>
    </div>
  );
}
