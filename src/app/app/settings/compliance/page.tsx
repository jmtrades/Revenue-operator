"use client";

import { useState } from "react";
import Link from "next/link";

export default function AppSettingsCompliancePage() {
  const [recording, setRecording] = useState(true);
  const [hipaa, setHipaa] = useState(false);
  const [retention, setRetention] = useState("90");
  const [toast, setToast] = useState<string | null>(null);

  const handleSave = () => {
    setToast("Compliance settings saved");
    setTimeout(() => setToast(null), 3000);
  };

  const handleExport = () => {
    setToast("Data export requested — you'll receive an email within 24 hours");
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-2">Compliance</h1>
      <p className="text-sm text-zinc-500 mb-6">Recording, privacy, and data retention settings.</p>

      <div className="space-y-4 mb-6">
        <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Call recording</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">All AI calls are recorded for quality and compliance</p>
            </div>
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${recording ? "bg-white" : "bg-zinc-700"}`} onClick={() => setRecording(!recording)}>
              <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${recording ? "translate-x-6 bg-black" : "translate-x-1 bg-zinc-400"}`} />
            </div>
          </label>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">HIPAA mode</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Encrypt PHI, BAA required (+$99/mo on Scale plan)</p>
            </div>
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hipaa ? "bg-white" : "bg-zinc-700"}`} onClick={() => setHipaa(!hipaa)}>
              <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${hipaa ? "translate-x-6 bg-black" : "translate-x-1 bg-zinc-400"}`} />
            </div>
          </label>
        </div>

        <div>
          <label htmlFor="retention" className="block text-xs font-medium text-zinc-400 mb-1">Data retention</label>
          <select id="retention" value={retention} onChange={(e) => setRetention(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm focus:border-[var(--border-medium)] focus:outline-none">
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
            <option value="365">1 year</option>
          </select>
          <p className="mt-1 text-[11px] text-zinc-500">Recordings and transcripts older than this are deleted automatically.</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={handleSave} className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 transition-colors">Save changes</button>
        <button type="button" onClick={handleExport} className="px-4 py-3 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-medium)] transition-colors">Export all data</button>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-lg text-sm text-zinc-200">{toast}</div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
