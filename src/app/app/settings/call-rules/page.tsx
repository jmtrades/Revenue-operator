"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function AppSettingsCallRulesPage() {
  const tRules = useTranslations("callRules");
  const [afterHours, setAfterHours] = useState("messages");
  const [emergencyKeywords, setEmergencyKeywords] = useState("emergency, urgent, pipe burst, flooding");
  const [transferPhone, setTransferPhone] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    document.title = tRules("pageTitle");
  }, [tRules]);

  const handleSave = () => {
    setToast(tRules("toast.saved"));
    setTimeout(() => setToast(null), 3000);
  };

  const weekdays = ["mon", "tue", "wed", "thu", "fri"] as const;
  const weekend = ["sat", "sun"] as const;
  const afterHoursOptions = [
    { value: "messages", labelKey: "afterHours.takeMessages", descKey: "afterHours.takeMessagesDesc" },
    { value: "emergency", labelKey: "afterHours.emergencyOnly", descKey: "afterHours.emergencyOnlyDesc" },
    { value: "forward", labelKey: "afterHours.forwardToCell", descKey: "afterHours.forwardToCellDesc" },
  ] as const;

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-2">{tRules("heading")}</h1>
      <p className="text-sm text-zinc-500 mb-6">{tRules("description")}</p>

      <div className="space-y-6 mb-6">
        <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          <p className="text-sm font-medium text-white mb-3">{tRules("businessHours")}</p>
          <div className="space-y-1.5">
            {weekdays.map((day) => (
              <div key={day} className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 w-8">{tRules(`days.${day}`)}</span>
                <span className="text-zinc-300">{tRules("timeRange")}</span>
              </div>
            ))}
            {weekend.map((day) => (
              <div key={day} className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 w-8">{tRules(`days.${day}`)}</span>
                <span className="text-zinc-600">{tRules("closed")}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">{tRules("afterHoursBehavior")}</label>
          <div className="space-y-2">
            {afterHoursOptions.map((opt) => (
              <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${afterHours === opt.value ? "border-[var(--border-medium)] bg-[var(--bg-card)]" : "border-[var(--border-default)] hover:border-[var(--border-medium)]"}`}>
                <input type="radio" name="afterHours" checked={afterHours === opt.value} onChange={() => setAfterHours(opt.value)} className="mt-0.5 accent-white" />
                <div>
                  <p className="text-sm font-medium text-white">{tRules(opt.labelKey)}</p>
                  <p className="text-[11px] text-zinc-500">{tRules(opt.descKey)}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="emergency-kw" className="block text-xs font-medium text-zinc-400 mb-1">{tRules("emergencyKeywords")}</label>
          <input id="emergency-kw" type="text" value={emergencyKeywords} onChange={(e) => setEmergencyKeywords(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none" />
          <p className="mt-1 text-[11px] text-zinc-500">{tRules("emergencyKeywordsHelp")}</p>
        </div>

        <div>
          <label htmlFor="transfer-phone" className="block text-xs font-medium text-zinc-400 mb-1">{tRules("transferNumber")}</label>
          <input id="transfer-phone" type="tel" value={transferPhone} onChange={(e) => setTransferPhone(e.target.value)} placeholder={tRules("transferNumberPlaceholder")} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none" />
          <p className="mt-1 text-[11px] text-zinc-500">{tRules("transferNumberHelp")}</p>
        </div>
      </div>

      <button type="button" onClick={handleSave} className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 transition-colors">{tRules("saveChanges")}</button>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-lg text-sm text-zinc-200">{toast}</div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">{tRules("backToSettings")}</Link></p>
    </div>
  );
}
