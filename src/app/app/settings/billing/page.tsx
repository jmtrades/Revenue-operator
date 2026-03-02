"use client";

import Link from "next/link";

export default function AppSettingsBillingPage() {
  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-4">Billing</h1>
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 mb-4">
        <p className="text-sm font-medium text-white">Starter — $97/mo</p>
        <p className="text-xs text-zinc-500 mt-1">87 / 200 min used</p>
      </div>
      <button type="button" className="px-4 py-2 rounded-xl text-sm font-medium border border-zinc-600 text-zinc-300 mb-4 block">Change plan</button>
      <p className="text-xs text-zinc-500 mb-4">Payment method: •••• 4242</p>
      <p className="text-sm text-zinc-400 mb-2">Invoice history</p>
      <div className="rounded-xl border border-zinc-800 p-3 mb-6">
        <p className="text-xs text-zinc-500">March 2026 — $97.00</p>
      </div>
      <div className="flex gap-2">
        <button type="button" className="px-4 py-2 rounded-xl text-sm border border-zinc-600 text-zinc-400">Pause account</button>
        <button type="button" className="px-4 py-2 rounded-xl text-sm border border-red-900/50 text-red-400">Cancel</button>
      </div>
      <p className="mt-6"><Link href="/app/settings" className="text-sm text-blue-400 hover:underline">← Settings</Link></p>
    </div>
  );
}
