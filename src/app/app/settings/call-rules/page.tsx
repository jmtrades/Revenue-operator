"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { toast } from "sonner";

export default function AppSettingsCallRulesPage() {
  const tRules = useTranslations("callRules");
  const { workspaceId } = useWorkspace();
  const [afterHours, setAfterHours] = useState("messages");
  const [emergencyKeywords, setEmergencyKeywords] = useState("");
  const [transferPhone, setTransferPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = tRules("pageTitle");
  }, [tRules]);

  // Load existing settings
  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/workspace/call-rules?workspace_id=${workspaceId}`, { credentials: "include" });
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.after_hours_behavior) setAfterHours(data.after_hours_behavior);
          if (data.emergency_keywords) setEmergencyKeywords(data.emergency_keywords);
          if (data.transfer_phone) setTransferPhone(data.transfer_phone);
        }
      } catch {
        /* use defaults — non-critical */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [workspaceId]);

  const handleSave = useCallback(async () => {
    if (!workspaceId || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/workspace/call-rules", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          after_hours_behavior: afterHours,
          emergency_keywords: emergencyKeywords,
          transfer_phone: transferPhone,
        }),
      });
      if (res.ok) {
        toast.success(tRules("toast.saved"));
      } else {
        toast.error(tRules("toast.error"));
      }
    } catch {
      toast.error(tRules("toast.error"));
    } finally {
      setSaving(false);
    }
  }, [workspaceId, afterHours, emergencyKeywords, transferPhone, tRules, saving]);

  const weekdays = ["mon", "tue", "wed", "thu", "fri"] as const;
  const weekend = ["sat", "sun"] as const;
  const afterHoursOptions = [
    { value: "messages", labelKey: "afterHours.takeMessages", descKey: "afterHours.takeMessagesDesc" },
    { value: "emergency", labelKey: "afterHours.emergencyOnly", descKey: "afterHours.emergencyOnlyDesc" },
    { value: "forward", labelKey: "afterHours.forwardToCell", descKey: "afterHours.forwardToCellDesc" },
  ] as const;

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{tRules("heading")}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">{tRules("description")}</p>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-[var(--bg-card)] skeleton-shimmer" />
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-6 mb-6">
            <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-3">{tRules("businessHours")}</p>
              <div className="space-y-1.5">
                {weekdays.map((day) => (
                  <div key={day} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-tertiary)] w-8">{tRules(`days.${day}`)}</span>
                    <span className="text-[var(--text-secondary)]">{tRules("timeRange")}</span>
                  </div>
                ))}
                {weekend.map((day) => (
                  <div key={day} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-tertiary)] w-8">{tRules(`days.${day}`)}</span>
                    <span className="text-[var(--text-tertiary)]">{tRules("closed")}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-[var(--text-tertiary)]">{tRules("businessHoursNote")}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-2">{tRules("afterHoursBehavior")}</label>
              <div className="space-y-2">
                {afterHoursOptions.map((opt) => (
                  <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${afterHours === opt.value ? "border-[var(--border-medium)] bg-[var(--bg-card)]" : "border-[var(--border-default)] hover:border-[var(--border-medium)]"}`}>
                    <input type="radio" name="afterHours" checked={afterHours === opt.value} onChange={() => setAfterHours(opt.value)} className="mt-0.5 accent-[var(--accent-primary)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{tRules(opt.labelKey)}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">{tRules(opt.descKey)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="emergency-kw" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{tRules("emergencyKeywords")}</label>
              <input id="emergency-kw" type="text" value={emergencyKeywords} onChange={(e) => setEmergencyKeywords(e.target.value)} placeholder={tRules("emergencyKeywordsPlaceholder")} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none" />
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{tRules("emergencyKeywordsHelp")}</p>
            </div>

            <div>
              <label htmlFor="transfer-phone" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{tRules("transferNumber")}</label>
              <input id="transfer-phone" type="tel" value={transferPhone} onChange={(e) => setTransferPhone(e.target.value)} placeholder={tRules("transferNumberPlaceholder")} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none" />
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{tRules("transferNumberHelp")}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !workspaceId}
            className="px-6 py-3 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {saving ? tRules("savingChanges") : tRules("saveChanges")}
          </button>
        </>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">{tRules("backToSettings")}</Link></p>
    </div>
  );
}
