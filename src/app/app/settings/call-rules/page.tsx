"use client";

import { useState } from "react";
import Link from "next/link";

export default function AppSettingsCallRulesPage() {
  const [afterHours, setAfterHours] = useState("messages");
  const [emergencyKeywords, setEmergencyKeywords] = useState("emergency, urgent, pipe burst, flooding");
  const [transferPhone, setTransferPhone] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const handleSave = () => {
    setToast("Call rules saved");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-2">Call rules</h1>
      <p className="text-sm text-zinc-500 mb-6">Configure how your AI handles calls during and after business hours.</p>

      <div className="space-y-6 mb-6">
        <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <p className="text-sm font-medium text-white mb-3">Business hours</p>
          <div className="space-y-1.5">
            {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
              <div key={day} className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 w-8">{day}</span>
                <span className="text-zinc-300">9:00 AM – 5:00 PM</span>
              </div>
            ))}
            {["Sat", "Sun"].map((day) => (
              <div key={day} className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 w-8">{day}</span>
                <span className="text-zinc-600">Closed</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">After hours behavior</label>
          <div className="space-y-2">
            {[
              { value: "messages", label: "Take messages", desc: "AI takes a message and emails you a summary" },
              { value: "emergency", label: "Emergency only", desc: "AI screens for emergencies and forwards those only" },
              { value: "forward", label: "Forward to cell", desc: "All after-hours calls ring your cell phone" },
            ].map((opt) => (
              <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${afterHours === opt.value ? "border-zinc-600 bg-zinc-800/50" : "border-zinc-800 hover:border-zinc-700"}`}>
                <input type="radio" name="afterHours" checked={afterHours === opt.value} onChange={() => setAfterHours(opt.value)} className="mt-0.5 accent-white" />
                <div>
                  <p className="text-sm font-medium text-white">{opt.label}</p>
                  <p className="text-[11px] text-zinc-500">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="emergency-kw" className="block text-xs font-medium text-zinc-400 mb-1">Emergency keywords</label>
          <input id="emergency-kw" type="text" value={emergencyKeywords} onChange={(e) => setEmergencyKeywords(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none" />
          <p className="mt-1 text-[11px] text-zinc-500">Comma-separated. Calls with these words are flagged as urgent.</p>
        </div>

        <div>
          <label htmlFor="transfer-phone" className="block text-xs font-medium text-zinc-400 mb-1">Transfer number</label>
          <input id="transfer-phone" type="tel" value={transferPhone} onChange={(e) => setTransferPhone(e.target.value)} placeholder="(503) 555-0101" className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 text-sm focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none" />
          <p className="mt-1 text-[11px] text-zinc-500">When callers ask for a real person, your AI transfers to this number.</p>
        </div>
      </div>

      <button type="button" onClick={handleSave} className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 transition-colors">Save changes</button>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-lg text-sm text-zinc-200">{toast}</div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
