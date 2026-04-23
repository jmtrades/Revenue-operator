"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type BusinessHours = {
  [day: string]: { open: string; close: string; enabled: boolean };
};

export default function AppSettingsCallRulesPage() {
  const tRules = useTranslations("callRules");
  const { workspaceId } = useWorkspace();
  const [afterHours, setAfterHours] = useState("messages");
  const [emergencyKeywords, setEmergencyKeywords] = useState("");
  const [transferPhone, setTransferPhone] = useState("");
  const [businessHours, setBusinessHours] = useState<BusinessHours>({});
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
          if (data.business_hours) setBusinessHours(data.business_hours);
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
          business_hours: businessHours,
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
  }, [workspaceId, afterHours, emergencyKeywords, transferPhone, businessHours, tRules, saving]);

  const weekdayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const weekendKeys = ["saturday", "sunday"];
  const allDayKeys = [...weekdayKeys, ...weekendKeys];
  const dayLabels: Record<string, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
  };

  const afterHoursOptions = [
    { value: "messages", labelKey: "afterHours.takeMessages", descKey: "afterHours.takeMessagesDesc" },
    { value: "emergency", labelKey: "afterHours.emergencyOnly", descKey: "afterHours.emergencyOnlyDesc" },
    { value: "forward", labelKey: "afterHours.forwardToCell", descKey: "afterHours.forwardToCellDesc" },
  ] as const;

  const handleBusinessHourChange = (day: string, field: "open" | "close", value: string) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleBusinessHourToggle = (day: string) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day]?.enabled },
    }));
  };

  const handleCopyToWeekdays = () => {
    const weekdayConfig = businessHours.monday;
    if (!weekdayConfig) return;
    setBusinessHours((prev) => {
      const updated = { ...prev };
      weekdayKeys.forEach((day) => {
        updated[day] = { ...weekdayConfig };
      });
      return updated;
    });
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <Breadcrumbs items={[
        { label: tRules("breadcrumbHome"), href: "/app" },
        { label: tRules("breadcrumbSettings"), href: "/app/settings" },
        { label: tRules("breadcrumbCallRules") }
      ]} />
      <h1 className="text-lg font-bold tracking-[-0.025em] text-[var(--text-primary)] mb-2">{tRules("heading")}</h1>
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
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-[var(--text-primary)]">{tRules("businessHours")}</p>
                <button
                  type="button"
                  onClick={handleCopyToWeekdays}
                  aria-label={tRules("businessHoursCopyToWeekdays")}
                  className="text-xs font-medium text-[var(--accent-primary)] hover:opacity-80 transition-opacity"
                >
                  {tRules("businessHoursCopyToWeekdays")}
                </button>
              </div>
              <div className="space-y-3">
                {allDayKeys.map((day) => {
                  const hours = businessHours[day];
                  if (!hours) return null;
                  return (
                    <div key={day} className="flex items-center gap-3 pb-3 border-b border-[var(--border-default)] last:border-b-0 last:pb-0">
                      <input
                        type="checkbox"
                        checked={hours.enabled}
                        onChange={() => handleBusinessHourToggle(day)}
                        className="w-4 h-4 rounded accent-[var(--accent-primary)]"
                      />
                      <span className="text-xs font-medium text-[var(--text-tertiary)] w-12">{dayLabels[day]}</span>
                      {hours.enabled ? (
                        <div className="flex items-center gap-2 ml-auto">
                          <label htmlFor={`open-${day}`} className="sr-only">{tRules("businessHoursOpen")} {dayLabels[day]}</label>
                          <input
                            id={`open-${day}`}
                            type="time"
                            value={hours.open}
                            onChange={(e) => handleBusinessHourChange(day, "open", e.target.value)}
                            className="w-24 px-2 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-xs focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
                          />
                          <span className="text-xs text-[var(--text-tertiary)]">{tRules("businessHoursTo")}</span>
                          <label htmlFor={`close-${day}`} className="sr-only">{tRules("businessHoursClose")} {dayLabels[day]}</label>
                          <input
                            id={`close-${day}`}
                            type="time"
                            value={hours.close}
                            onChange={(e) => handleBusinessHourChange(day, "close", e.target.value)}
                            className="w-24 px-2 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-xs focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-tertiary)] ml-auto">{tRules("closed")}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] text-[var(--text-tertiary)]">{tRules("businessHoursNote")}</p>
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
