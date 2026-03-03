"use client";

import { useState } from "react";
import Link from "next/link";

const DEMO_MEMBERS = [
  { name: "You (Owner)", email: "you@business.com", role: "Admin", status: "Active" },
];

export default function AppSettingsTeamPage() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [toast, setToast] = useState<string | null>(null);

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    setToast(`Invite sent to ${inviteEmail}`);
    setInviteEmail("");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-2">Team</h1>
      <p className="text-sm text-zinc-500 mb-6">Add team members who receive escalations and manage settings.</p>

      <div className="space-y-2 mb-6">
        {DEMO_MEMBERS.map((m) => (
          <div key={m.email} className="flex items-center justify-between p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
            <div>
              <p className="text-sm font-medium text-white">{m.name}</p>
              <p className="text-xs text-zinc-500">{m.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">{m.role}</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">{m.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-6">
        <p className="text-sm font-medium text-white mb-3">Invite a team member</p>
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@business.com"
            className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 text-sm focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none">
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <button type="button" onClick={handleInvite} disabled={!inviteEmail.trim()} className="mt-3 px-6 py-2.5 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 disabled:opacity-40 transition-colors">
          Send invite
        </button>
      </div>

      <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
        <p className="text-sm font-medium text-white mb-2">Escalation order</p>
        <p className="text-xs text-zinc-500">When your AI needs a human, it contacts team members in this order. Drag to reorder.</p>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-800/50 text-xs text-zinc-300">
            <span className="text-zinc-500">1.</span> You (Owner) — SMS + Push
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-lg text-sm text-zinc-200">{toast}</div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
