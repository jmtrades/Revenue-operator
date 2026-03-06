"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { INDUSTRY_OPTIONS } from "@/lib/constants/industries";

function getInitialTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/Los_Angeles";
  }
}

export default function AppSettingsBusinessPage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [timezone, setTimezone] = useState(getInitialTimezone);
  const [industry, setIndustry] = useState("other");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workspace/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { name?: string; address?: string; website?: string; industry?: string } | null) => {
        setName(data?.name ?? "");
        setAddress(data?.address ?? "");
        setWebsite(data?.website ?? "");
        setIndustry(data?.industry && INDUSTRY_OPTIONS.some((item) => item.id === data.industry) ? data.industry : "other");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/workspace/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, website, industry }),
      });
      if (!res.ok) throw new Error("save_failed");
      setToast("Settings saved");
    } catch {
      setToast("Could not save settings");
    }
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-2">Business</h1>
      <p className="text-sm text-zinc-500 mb-6">Your business details help your AI answer calls accurately.</p>
      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="biz-name" className="block text-xs font-medium text-zinc-400 mb-1">Business name</label>
          <input id="biz-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Plumbing" className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 text-sm focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none" />
        </div>
        <div>
          <label htmlFor="biz-address" className="block text-xs font-medium text-zinc-400 mb-1">Address</label>
          <input id="biz-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Portland, OR" className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 text-sm focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none" />
        </div>
        <div>
          <label htmlFor="biz-website" className="block text-xs font-medium text-zinc-400 mb-1">Website</label>
          <input id="biz-website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourbusiness.com" className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 text-sm focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none" />
        </div>
        <div>
          <label htmlFor="biz-tz" className="block text-xs font-medium text-zinc-400 mb-1">Timezone</label>
          <input id="biz-tz" type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 text-sm focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none" />
        </div>
        <div>
          <label htmlFor="biz-industry" className="block text-xs font-medium text-zinc-400 mb-1">Industry</label>
          <select id="biz-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-zinc-600 focus:outline-none">
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      <button type="button" disabled={loading} onClick={handleSave} className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 transition-colors disabled:opacity-60">Save changes</button>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-lg text-sm text-zinc-200">
          {toast}
        </div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
