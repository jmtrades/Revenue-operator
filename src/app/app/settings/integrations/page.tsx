"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const INTEGRATIONS = [
  { name: "Google Calendar", icon: "📅", desc: "Sync appointments booked by your AI", plan: "Growth+", authUrl: "/api/integrations/google-calendar/auth" },
  { name: "Outlook", icon: "📧", desc: "Calendar and email integration", plan: "Growth+", authUrl: null },
  { name: "HubSpot", icon: "🔧", desc: "Push leads and contacts automatically", plan: "Scale+", authUrl: null },
  { name: "Salesforce", icon: "☁️", desc: "Two-way contact and deal sync", plan: "Scale+", authUrl: null },
  { name: "Zapier", icon: "⚡", desc: "Connect to 5,000+ apps via triggers", plan: "Growth+", authUrl: null },
  { name: "Slack", icon: "💬", desc: "Get AI call summaries in Slack channels", plan: "Growth+", authUrl: null },
];

export default function AppSettingsIntegrationsPage() {
  const [toast, setToast] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const calendar = searchParams.get("calendar");
    if (!calendar) return;
    const msg = calendar === "connected" ? "Google Calendar connected." : calendar === "error" ? "Could not connect Google Calendar." : calendar === "config" ? "Google Calendar is not configured." : null;
    if (msg) {
      const t = setTimeout(() => setToast(msg), 0);
      const t2 = setTimeout(() => setToast(null), 4000);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [searchParams]);

  const handleConnect = (name: string, authUrl: string | null) => {
    if (!authUrl) {
      setToast(`${name} — available on Growth and Scale plans`);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-2">Integrations</h1>
      <p className="text-sm text-zinc-500 mb-6">Connect your favorite tools. Your AI pushes data automatically.</p>

      <div className="space-y-3">
        {INTEGRATIONS.map((i) => (
          <div key={i.name} className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
            <span className="text-2xl shrink-0">{i.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">{i.name}</p>
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500">{i.plan}</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">{i.desc}</p>
            </div>
            {(i as { authUrl?: string | null }).authUrl ? (
              <Link href={(i as { authUrl: string }).authUrl} className="px-3 py-1.5 rounded-xl text-xs font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 shrink-0 transition-colors">
                Connect
              </Link>
            ) : (
              <button type="button" onClick={() => handleConnect(i.name, null)} className="px-3 py-1.5 rounded-xl text-xs font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 shrink-0 transition-colors">
                Connect
              </button>
            )}
          </div>
        ))}
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-lg text-sm text-zinc-200">{toast}</div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
