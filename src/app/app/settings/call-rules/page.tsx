"use client";

import Link from "next/link";

export default function AppSettingsCallRulesPage() {
  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-4">Call rules</h1>
      <p className="text-sm text-zinc-400 mb-4">Business hours behavior, after-hours rules, emergency keywords, transfer rules.</p>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">After hours</label>
          <select className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white text-sm">
            <option>Take messages</option>
            <option>Emergency only</option>
            <option>Forward to cell</option>
          </select>
        </div>
      </div>
      <p className="mt-6"><Link href="/app/settings" className="text-sm text-blue-400 hover:underline">← Settings</Link></p>
    </div>
  );
}
