"use client";

import Link from "next/link";

export default function AppSettingsCompliancePage() {
  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-4">Compliance</h1>
      <div className="space-y-4 mb-6">
        <label className="flex items-center gap-2 text-sm text-white">
          <input type="checkbox" defaultChecked className="rounded" />
          Recording enabled
        </label>
        <label className="flex items-center gap-2 text-sm text-white">
          <input type="checkbox" className="rounded" />
          HIPAA mode (+$99/mo)
        </label>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Retention</label>
          <select className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white text-sm">
            <option>30 days</option>
            <option>90 days</option>
            <option>180 days</option>
            <option>365 days</option>
          </select>
        </div>
      </div>
      <button type="button" className="px-4 py-2 rounded-xl text-sm border border-zinc-600 text-zinc-300">Export all data</button>
      <p className="mt-6"><Link href="/app/settings" className="text-sm text-blue-400 hover:underline">← Settings</Link></p>
    </div>
  );
}
