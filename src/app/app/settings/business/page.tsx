"use client";

import Link from "next/link";

export default function AppSettingsBusinessPage() {
  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-4">Business</h1>
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Business name</label>
          <input type="text" placeholder="Acme Plumbing" className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Address</label>
          <input type="text" placeholder="123 Main St" className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Website</label>
          <input type="url" placeholder="https://..." className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Timezone</label>
          <input type="text" placeholder="America/Los_Angeles" className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Industry</label>
          <select className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white text-sm">
            <option>Home Services</option>
            <option>Healthcare</option>
            <option>Legal</option>
            <option>Real Estate</option>
            <option>Other</option>
          </select>
        </div>
      </div>
      <button type="button" className="px-4 py-2 rounded-xl text-sm font-medium bg-white text-black">Save</button>
      <p className="mt-4"><Link href="/app/settings" className="text-sm text-blue-400 hover:underline">← Settings</Link></p>
    </div>
  );
}
