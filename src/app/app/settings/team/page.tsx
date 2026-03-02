"use client";

import Link from "next/link";

export default function AppSettingsTeamPage() {
  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-4">Team</h1>
      <p className="text-sm text-zinc-400 mb-4">Member list, invite, roles (Admin / Manager / Viewer), escalation order.</p>
      <input type="email" placeholder="Email to invite" className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 text-sm mb-4" />
      <button type="button" className="px-4 py-2 rounded-xl text-sm font-medium bg-white text-black">Invite</button>
      <p className="mt-6"><Link href="/app/settings" className="text-sm text-blue-400 hover:underline">← Settings</Link></p>
    </div>
  );
}
