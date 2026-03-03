"use client";

import { useState } from "react";
import Link from "next/link";

export default function AppSettingsPhonePage() {
  const [toast, setToast] = useState<string | null>(null);

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-2">Phone</h1>
      <p className="text-sm text-zinc-500 mb-6">Manage your AI phone numbers and call forwarding.</p>

      <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">(503) 555-0100</p>
            <p className="text-xs text-zinc-500 mt-1">Primary number · Forwarding active</p>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">Active</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-6">
        <p className="text-sm font-medium text-white mb-2">Call forwarding instructions</p>
        <div className="space-y-2 text-xs text-zinc-400">
          <p><span className="text-zinc-300 font-medium">AT&T:</span> Dial *21*(503) 555-0100#</p>
          <p><span className="text-zinc-300 font-medium">Verizon:</span> Dial *72 (503) 555-0100</p>
          <p><span className="text-zinc-300 font-medium">T-Mobile:</span> Dial **21*(503) 555-0100#</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => { setToast("Additional numbers are available on Growth and Scale plans."); setTimeout(() => setToast(null), 4000); }}
        className="px-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors"
      >
        + Add number
      </button>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-lg text-sm text-zinc-200">
          {toast}
        </div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
