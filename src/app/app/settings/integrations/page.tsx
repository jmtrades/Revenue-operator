"use client";

import Link from "next/link";

const INTEGRATIONS = [
  { name: "Google Calendar", status: "Not connected" },
  { name: "Outlook", status: "Not connected" },
  { name: "HubSpot", status: "Not connected" },
  { name: "Zapier", status: "Not connected" },
];

export default function AppSettingsIntegrationsPage() {
  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-4">Integrations</h1>
      <div className="space-y-3">
        {INTEGRATIONS.map((i) => (
          <div key={i.name} className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <span className="text-sm font-medium text-white">{i.name}</span>
            <span className="text-xs text-zinc-500 mr-2">{i.status}</span>
            <button type="button" className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-black">Connect</button>
          </div>
        ))}
      </div>
      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
