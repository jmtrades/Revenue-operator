"use client";

import Link from "next/link";

export default function AppSettingsPhonePage() {
  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-4">Phone</h1>
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 mb-4">
        <p className="text-sm font-medium text-white">555-XXX-XXXX</p>
        <p className="text-xs text-zinc-500 mt-1">Provisioned · Forwarding active</p>
      </div>
      <button type="button" className="px-4 py-2 rounded-xl text-sm font-medium border border-zinc-600 text-zinc-300">+ Add Number $5/mo</button>
      <p className="mt-4"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
