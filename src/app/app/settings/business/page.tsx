"use client";

import { useState } from "react";
import Link from "next/link";

function getBusinessData() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("rt_signup") ?? localStorage.getItem("recalltouch_signup");
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch { /* ignore */ }
  return {};
}

function getInitialTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "America/Los_Angeles"; }
}

export default function AppSettingsBusinessPage() {
  const [name, setName] = useState(() => { const d = getBusinessData(); return d.businessName ?? ""; });
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState(() => { const d = getBusinessData(); return d.website ?? ""; });
  const [timezone, setTimezone] = useState(getInitialTimezone);
  const [industry, setIndustry] = useState("home_services");
  const [toast, setToast] = useState<string | null>(null);

  const handleSave = () => {
    try {
      const existing = getBusinessData();
      localStorage.setItem("rt_signup", JSON.stringify({ ...existing, businessName: name, website, address, industry }));
      if (name.trim()) localStorage.setItem("rt_business_name", name.trim());
    } catch { /* ignore */ }
    setToast("Settings saved");
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
            <option value="home_services">Home Services</option>
            <option value="healthcare">Healthcare</option>
            <option value="legal">Legal</option>
            <option value="real_estate">Real Estate</option>
            <option value="insurance">Insurance</option>
            <option value="b2b_sales">B2B Sales</option>
            <option value="contractors">Contractors</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <button type="button" onClick={handleSave} className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 transition-colors">Save changes</button>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-lg text-sm text-zinc-200">
          {toast}
        </div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
